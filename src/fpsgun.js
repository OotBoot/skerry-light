// Wreckers' Night: your weapons, in 3D, held out in the middle of the view.
//
// Five of them, each with its own model and its own way of moving:
//  - Pepperbox: six barrels round a fluted core that turn a place each shot, a bar hammer the thumb
//    brings back. Reloading swaps the whole barrel cluster: tip it up, slide the spent one off and
//    let it drop, bring a loaded one up with the other hand and seat it with a click, cock.
//  - Blunderbuss: a brass barrel flaring to a bell mouth, a walnut stock, a flintlock (cock and
//    flint, frizzen, pan). Firing snaps the cock onto the frizzen, flashes the pan, then roars and
//    kicks hard in a cloud of smoke. Reloading: muzzle up, powder from the horn, a handful of shot,
//    two strokes of the ramrod, prime the pan, shut the frizzen, cock.
//  - Longarm: a long octagonal barrel with a brass telescope on two rings, a percussion lock, a full
//    stock. Reloading: muzzle up, tear a paper cartridge and pour it, ram it twice, return the rod,
//    thumb a fresh cap onto the nipple, cock. Hold right mouse (or Scope) to look through the glass.
//  - Harpoon gun: a stout barrel with a barbed harpoon in it, a drum of line on the side with a
//    crank. Firing throws the harpoon out and spins the drum. Reloading: crank the line back in,
//    slide a new harpoon down the barrel, cock.
//  - Cutlass: a curved blade with a fuller, a brass stirrup guard, a wire-bound grip. Swings come
//    in threes (a forehand cut, a backhand cut, a thrust) with a pale trail through the air. R gives
//    it a turn in the light and a wipe along the blade with your sleeve.
//  - Avtomat: a short automatic rifle. A long receiver with a curved box magazine ahead of the pistol grip,
//    a wooden handguard banded in brass, a muzzle brake, a notched rear sight and a hooded front post, and a
//    charging handle on the left. Each round throws the handle back and the muzzle about. Aiming brings the
//    rear notch and the front post up to your eye, lined up on the middle of the view. Reloading (long):
//    tip it, thumb the catch, let the empty magazine drop, bring a full one up from the pouch, rock it in and
//    slap it home, reach over and rack the handle.
// Switching weapons brings the new one up from below.
//
// Colours come from the equipped weapon skin (wcEquippedSkin, from the weapon crates) when there is
// one, otherwise each weapon's plain finish. The sleeves are your boat skin's coat colour.
//
// Drawn by its own small WebGL renderer and copied onto the main canvas between the world and the
// HUD, so it always sits over everything in the scene. Without WebGL the old flat drawing is used.

const VM = { tried: false, ok: false, sway: [0, 0], turn: 0, turnTo: 0, shots: 0, hammer: 1, lastP: 1, smoke: [], flashT: 0, panT: 0, w: 0, h: 0, sleeve: '', weapons: {}, skinKey: {}, swingT: 9, swings: 0, trail: [] };

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
  vmShared();
  VM.ok = true;
  return true;
}

// ---------- materials ----------
const VM_PLAIN = {
  pepperbox:   { metal: '#3a3c42', dark: '#1c1d22', wood: '#5a3620', brass: '#8a6a2c', accent: '#a8542c', glow: null },
  blunderbuss: { metal: '#3a3c42', dark: '#1c1d22', wood: '#4a2c18', brass: '#9a7a34', accent: '#6a6a70', glow: null },
  longarm:     { metal: '#30333a', dark: '#18191d', wood: '#56341e', brass: '#8a6a2c', accent: '#7aa0c8', glow: null },
  harpoon:     { metal: '#3e4046', dark: '#1e1f24', wood: '#5a3a22', brass: '#8a6a2c', accent: '#b8a070', glow: null },
  cutlass:     { metal: '#b8bcc4', dark: '#2a2b30', wood: '#2a1a10', brass: '#9a7a34', accent: '#c8a050', glow: null },
  avtomat:     { metal: '#3a3d44', dark: '#1a1b20', wood: '#6a3e22', brass: '#8a6a2c', accent: '#b0a080', glow: null },
};
const vmHex = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) ? c : d;
function vmSkinOf(id) {
  let s = null;
  try { if (typeof wcEquippedSkin === 'function') s = wcEquippedSkin(id); } catch (e) {}
  const P = VM_PLAIN[id];
  return { id: s && s.id || 'plain', metal: vmHex(s && s.metal, P.metal), dark: vmHex(s && s.dark, P.dark), wood: vmHex(s && s.wood, P.wood), brass: vmHex(s && s.brass, P.brass), accent: vmHex(s && s.accent, P.accent), glow: s && vmHex(s.glow, null) };
}
function vmMatsFor(id) {
  const k = vmSkinOf(id);
  const glow = k.glow ? new THREE.Color(k.glow) : new THREE.Color(0);
  const M = {
    iron: new THREE.MeshPhongMaterial({ color: k.metal, specular: 0x8a8c96, shininess: 70 }),
    dark: new THREE.MeshPhongMaterial({ color: k.dark, specular: 0x50525a, shininess: 50 }),
    bore: new THREE.MeshBasicMaterial({ color: 0x050506 }),
    brass: new THREE.MeshPhongMaterial({ color: k.brass, specular: 0xb09060, shininess: 60 }),
    accent: new THREE.MeshPhongMaterial({ color: k.accent, specular: 0x806040, shininess: 40, emissive: glow, emissiveIntensity: k.glow ? 0.6 : 0 }),
    wood: new THREE.MeshPhongMaterial({ color: k.wood, specular: 0x3a2414, shininess: 25 }),
    blade: new THREE.MeshPhongMaterial({ color: k.metal, specular: 0xffffff, shininess: 120 }),
  };
  M.key = k.id;
  return M;
}
// a skin changed: recolour that weapon's materials in place
function vmRecolour(id, wpn) {
  const k = vmSkinOf(id); if (wpn.M.key === k.id) return;
  const M = wpn.M; M.key = k.id;
  M.iron.color.set(k.metal); M.blade.color.set(k.metal); M.dark.color.set(k.dark); M.brass.color.set(k.brass); M.wood.color.set(k.wood); M.accent.color.set(k.accent);
  M.accent.emissive.set(k.glow || 0x000000); M.accent.emissiveIntensity = k.glow ? 0.6 : 0;
}

// ---------- shared parts ----------
// a cylinder along the gun's length: from z0 forwards (towards -z) for len; r1 at the back, r2 at the front
function zcyl(r1, r2, len, mat, seg, z0, x, y) {
  const g = new THREE.CylinderGeometry(r2, r1, len, seg || 14); g.rotateX(-Math.PI / 2); g.translate(x || 0, y || 0, (z0 || 0) - len / 2);
  return new THREE.Mesh(g, mat);
}
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0); return m; }
// a flat side profile (points in z, y: z backwards positive) given thickness in x
function profile(pts, thick, mat, bevel) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 2 });
  g.translate(0, 0, -thick / 2); g.rotateY(-Math.PI / 2);   // shape x → +z (backwards), extrusion → across
  return new THREE.Mesh(g, mat);
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
  palm.scale.set(0.85, 1, 1.15); h.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), M.flesh);
    f.rotation.z = Math.PI / 2; f.position.set((left ? 1 : -1) * 0.01, -0.015 - i * 0.022 + 0.03, -0.04); h.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.045, 4, 8), M.flesh);
  thumb.rotation.x = -1.35; thumb.position.set((left ? -1 : 1) * 0.024, 0.04, -0.02); h.add(thumb);
  h.userData.thumb = thumb;
  return h;
}
function vmShared() {
  const c = fpsColours();
  VM.H = {
    flesh: new THREE.MeshLambertMaterial({ color: 0x9a7058 }),
    sleeve: new THREE.MeshLambertMaterial({ color: vmHex(c[0], '#3a2a1e') }),
    cuff: new THREE.MeshLambertMaterial({ color: vmHex(c[2], '#7a5a3a') }),
  };
  VM.sleeve = JSON.stringify(c);
  // the flash: two crossed soft cards and one facing you
  const fc = document.createElement('canvas'); fc.width = fc.height = 64;
  const q = fc.getContext('2d'), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.25, 'rgba(255,200,100,0.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
  const ft = VM.softTex = new THREE.CanvasTexture(fc);
  const card = (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ft, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  VM.flash = new THREE.Group();
  for (const r of [0, Math.PI / 2]) { const p = card(0.22, 0.12); p.rotation.z = r; p.rotation.y = Math.PI / 2; VM.flash.add(p); }
  VM.flash.add(card(0.1, 0.1));
  VM.flash.visible = false; VM.scene.add(VM.flash);
  VM.pan = card(0.05, 0.05); VM.pan.visible = false; VM.scene.add(VM.pan);
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshBasicMaterial({ map: ft, color: 0x9a9a9a, transparent: true, depthWrite: false, opacity: 0 })); m.visible = false; VM.scene.add(m); VM.smoke.push({ m, t: 0 }); }
  // grains of powder and balls of shot, for the muzzle-loaders
  VM.grains = [];
  const gm = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }), lead = new THREE.MeshPhongMaterial({ color: 0x6a6a72, shininess: 60 });
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(i < 14 ? 0.0025 : 0.005, 6, 4), i < 14 ? gm : lead); m.visible = false; VM.scene.add(m); VM.grains.push({ m, t: 0, v: new THREE.Vector3(), lead: i >= 14 }); }
  // the cutlass's trail through the air
  const N = 10, tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 2 * 3), 3));
  tg.setAttribute('alpha', new THREE.Float32BufferAttribute(new Float32Array(N * 2), 1));
  const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } tg.setIndex(idx);
  VM.trailMesh = new THREE.Mesh(tg, new THREE.ShaderMaterial({
    vertexShader: 'attribute float alpha; varying float vA; void main() { vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vA; void main() { gl_FragColor = vec4(0.85, 0.9, 1.0, vA * 0.35); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }));
  VM.trailMesh.frustumCulled = false; VM.trailMesh.visible = false; VM.scene.add(VM.trailMesh); VM.trailN = N;
  // the left hand and what it carries on reloads, shared by all the weapons
  VM.lhand = vmHand(VM.H, true); VM.lhand.visible = false; VM.scene.add(VM.lhand);
}

// ---------- the five weapons ----------
const VM_BUILD = {};
// Pepperbox ------------------------------------------------------------------------------------
function vmCluster(M) {
  const g = new THREE.Group(), L = 0.2;
  g.add(zcyl(0.03, 0.03, L, M.iron, 18, 0));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, x = Math.cos(a) * 0.026, y = Math.sin(a) * 0.026;
    const bg = new THREE.CylinderGeometry(0.0125, 0.0125, L, 14); bg.rotateX(-Math.PI / 2); bg.translate(x, y, -L / 2);
    g.add(new THREE.Mesh(bg, [M.iron, M.bore, M.iron]));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0022, 6, 14), M.iron); ring.position.set(x, y, -L); g.add(ring);
    const cap = zcyl(0.0055, 0.005, 0.012, M.accent, 8, 0.014, x * 0.8, y * 0.8); g.add(cap);
  }
  for (const z of [-0.035, -0.17]) g.add(zcyl(0.0405, 0.0405, 0.008, M.brass, 24, z + 0.004));
  return g;
}
VM_BUILD.pepperbox = (M) => {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(box(0.05, 0.055, 0.11, M.iron, 0, 0.035, -0.02));
  body.add(box(0.035, 0.012, 0.11, M.dark, 0, 0.066, -0.02));
  body.add(box(0.054, 0.059, 0.008, M.brass, 0, 0.035, -0.075));
  const mount = new THREE.Group(); mount.position.set(0, 0.035, -0.078); body.add(mount);
  const cluster = vmCluster(M); mount.add(cluster);
  const hp = new THREE.Group(); hp.position.set(0, 0.07, 0.03); body.add(hp);
  hp.add(box(0.014, 0.012, 0.09, M.dark, 0, 0.004, -0.045));
  const spur = box(0.02, 0.008, 0.02, M.dark, 0, 0.008, 0.005); spur.rotation.x = -0.4; hp.add(spur);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.008, -0.02); body.add(guard);
  const trig = box(0.006, 0.026, 0.008, M.dark, 0, 0, -0.02); body.add(trig);
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.012, -0.05, 0.002, -0.1); s.quadraticCurveTo(0.02, -0.125, 0.05, -0.11); s.quadraticCurveTo(0.06, -0.06, 0.06, 0.0); s.lineTo(0, 0);
  const grip = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.034, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 10 }), M.wood);
  grip.rotation.y = -Math.PI / 2; grip.position.set(0.017, 0.02, 0.015); body.add(grip);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M.brass); capB.scale.set(1.2, 0.7, 1.4); capB.position.set(0, -0.098, 0.05); body.add(capB);
  const hand = vmHand(VM.H, false); hand.position.set(0.012, -0.045, 0.04); root.add(hand);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.026, -0.21); mount.add(muzzle);
  const fresh = vmCluster(M), spent = vmCluster(M); fresh.visible = spent.visible = false; VM.scene.add(fresh); VM.scene.add(spent);
  return { root, M, hand, mount, cluster, hp, trig, muzzle, fresh, spent,
    pose: { x: 0.035, y: -0.14, z: -0.28, rx: 0.13, ry: 0.1, rz: -0.08 }, smoke: 3 };
};
// Blunderbuss ------------------------------------------------------------------------------------
VM_BUILD.blunderbuss = (M) => {
  const root = new THREE.Group();
  // the barrel: breech to bell, turned on a lathe, with bands
  const prof = [[0.0, 0.024], [0.0, 0.026], [-0.04, 0.024], [-0.3, 0.021], [-0.38, 0.023], [-0.44, 0.032], [-0.48, 0.048], [-0.5, 0.058], [-0.505, 0.06]];
  const pts = prof.map(([z, r]) => new THREE.Vector2(r, -z));
  const bg = new THREE.LatheGeometry(pts, 24); bg.rotateX(-Math.PI / 2);
  const barrel = new THREE.Mesh(bg, M.brass); barrel.position.set(0, 0.05, -0.04); root.add(barrel);
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), M.bore); bore.position.set(0, 0.05, -0.54); root.add(bore);
  for (const z of [-0.12, -0.26]) root.add(zcyl(0.026, 0.026, 0.012, M.iron, 20, z, 0, 0.05));
  root.add(zcyl(0.066, 0.066, 0.01, M.iron, 24, -0.53, 0, 0.05));
  // the stock: forend under the barrel, wrist and butt behind
  root.add(profile([[-0.33, 0.035], [0.02, 0.035], [0.02, 0.012], [-0.3, 0.02]], 0.044, M.wood, 0.004));
  root.add(profile([[0.0, 0.07], [0.12, 0.05], [0.32, 0.075], [0.36, 0.08], [0.38, -0.08], [0.3, -0.07], [0.12, -0.01], [0.04, 0.0], [-0.02, 0.012]], 0.04, M.wood, 0.005));
  root.add(box(0.046, 0.16, 0.012, M.brass, 0, 0.0, 0.385));   // butt plate
  // the lock on the right: plate, pan, frizzen, and the cock holding its flint
  root.add(box(0.006, 0.03, 0.09, M.iron, 0.025, 0.045, 0.02));
  root.add(box(0.016, 0.006, 0.016, M.iron, 0.03, 0.062, -0.01));
  const friz = new THREE.Group(); friz.position.set(0.03, 0.066, -0.016); root.add(friz);
  friz.add(box(0.012, 0.03, 0.004, M.iron, 0, 0.015, 0)); friz.add(box(0.012, 0.004, 0.018, M.iron, 0, 0, 0.007));
  const cock = new THREE.Group(); cock.position.set(0.032, 0.05, 0.04); root.add(cock);
  const neck = box(0.008, 0.04, 0.01, M.dark, 0, 0.02, -0.008); neck.rotation.x = -0.6; cock.add(neck);
  cock.add(box(0.012, 0.01, 0.018, M.dark, 0, 0.038, -0.02));
  cock.add(box(0.012, 0.006, 0.012, M.accent, 0, 0.032, -0.03));   // the flint
  // trigger and a scrolled guard; the ramrod in its pipes
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 6, 22, Math.PI * 1.2), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, -0.0, 0.07); root.add(guard);
  const trig = box(0.005, 0.026, 0.007, M.dark, 0, 0.0, 0.06); root.add(trig);
  const rod = new THREE.Group(); root.add(rod);
  rod.add(zcyl(0.004, 0.004, 0.42, M.dark, 8, 0.0, 0, 0.0)); rod.add(zcyl(0.006, 0.006, 0.02, M.brass, 8, -0.42, 0, 0.0));
  rod.position.set(0, 0.012, -0.05);
  for (const z of [-0.12, -0.24]) root.add(zcyl(0.007, 0.007, 0.02, M.brass, 8, z, 0, 0.012));
  // hands: the right round the wrist, the left under the forend
  const hand = vmHand(VM.H, false); hand.position.set(0.0, 0.0, 0.1); hand.rotation.z = -0.2; root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.01, -0.005, -0.2); left.rotation.set(0.3, 0, 0.5); root.add(left);
  // the powder horn
  const horn = new THREE.Group(); horn.visible = false; root.add(horn);
  const hg = new THREE.ConeGeometry(0.03, 0.16, 12, 1, true); hg.rotateZ(Math.PI / 2); horn.add(new THREE.Mesh(hg, new THREE.MeshPhongMaterial({ color: 0xc8b890, shininess: 40, side: THREE.DoubleSide })));
  horn.add(Object.assign(box(0.012, 0.012, 0.03, M.brass, -0.085, 0, 0), {}));
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.05, -0.55); root.add(muzzle);
  const panAt = new THREE.Object3D(); panAt.position.set(0.032, 0.066, -0.01); root.add(panAt);
  return { root, M, hand, left, friz, cock, trig, rod, horn, muzzle, panAt,
    pose: { x: 0.07, y: -0.17, z: -0.46, rx: 0.1, ry: 0.09, rz: -0.06 }, smoke: 7, flint: true };
};
// Longarm ------------------------------------------------------------------------------------
VM_BUILD.longarm = (M) => {
  const root = new THREE.Group();
  root.add(zcyl(0.015, 0.013, 0.78, M.iron, 8, -0.02, 0, 0.05));   // octagonal barrel
  root.add(zcyl(0.016, 0.016, 0.012, M.brass, 12, -0.79, 0, 0.05));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), M.bore); bore.position.set(0, 0.05, -0.803); root.add(bore);
  root.add(box(0.004, 0.008, 0.012, M.brass, 0, 0.068, -0.76));    // front sight
  // the full stock and the long forend
  root.add(profile([[-0.66, 0.045], [0.02, 0.045], [0.02, 0.02], [-0.6, 0.032], [-0.66, 0.036]], 0.034, M.wood, 0.004));
  root.add(profile([[0.0, 0.07], [0.12, 0.052], [0.34, 0.07], [0.37, 0.075], [0.39, -0.07], [0.32, -0.06], [0.12, -0.005], [0.04, 0.005], [-0.02, 0.02]], 0.036, M.wood, 0.005));
  root.add(box(0.04, 0.15, 0.01, M.brass, 0, 0.0, 0.395));
  for (const z of [-0.2, -0.45]) root.add(zcyl(0.02, 0.02, 0.01, M.brass, 14, z, 0, 0.045));
  // the telescope on two rings, eyepiece and objective bells, a glint in the glass
  const scope = new THREE.Group(); scope.position.set(0, 0.098, 0); root.add(scope);
  scope.add(zcyl(0.013, 0.013, 0.3, M.brass, 18, 0.02));
  scope.add(zcyl(0.017, 0.013, 0.04, M.brass, 18, 0.06));
  scope.add(zcyl(0.013, 0.019, 0.045, M.brass, 18, -0.27));
  for (const z of [-0.04, -0.2]) { scope.add(new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 6, 18), M.dark)).position.set(0, 0, z); scope.add(box(0.005, 0.03, 0.008, M.dark, 0, -0.022, z)); }
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.017, 18), new THREE.MeshPhongMaterial({ color: 0x223040, specular: 0xaaccff, shininess: 120, emissive: 0x0a1420 })); glass.position.set(0, 0, -0.316); scope.add(glass);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.015, 18), M.accent); eye.position.set(0, 0, 0.061); eye.rotation.y = Math.PI; scope.add(eye);
  // percussion lock: plate, nipple and cap, a curved hammer
  root.add(box(0.006, 0.026, 0.08, M.iron, 0.02, 0.04, 0.03));
  const nip = zcyl(0.004, 0.004, 0.012, M.dark, 8, 0, 0.022, 0.066); nip.rotation.x = -Math.PI / 2 + 0.2; root.add(nip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8), M.accent); cap.position.set(0.022, 0.074, 0.0); root.add(cap);
  const hammer = new THREE.Group(); hammer.position.set(0.022, 0.05, 0.05); root.add(hammer);
  const hn = box(0.007, 0.034, 0.009, M.dark, 0, 0.017, -0.012); hn.rotation.x = -0.5; hammer.add(hn);
  hammer.add(box(0.011, 0.01, 0.016, M.dark, 0, 0.03, -0.034));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.012, 0.07); root.add(guard);
  const trig = box(0.005, 0.024, 0.007, M.dark, 0, 0.01, 0.065); root.add(trig);
  const rod = new THREE.Group(); rod.position.set(0, 0.018, -0.06); root.add(rod);
  rod.add(zcyl(0.0035, 0.0035, 0.68, M.dark, 8, 0)); rod.add(zcyl(0.005, 0.005, 0.015, M.brass, 8, -0.68));
  const hand = vmHand(VM.H, false); hand.position.set(0.0, 0.005, 0.11); hand.rotation.z = -0.2; root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.01, 0.0, -0.32); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const cart = new THREE.Group(); cart.visible = false; root.add(cart);
  cart.add(zcyl(0.007, 0.007, 0.05, new THREE.MeshLambertMaterial({ color: 0xe8e0c8 }), 10, 0.025));
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.05, -0.81); root.add(muzzle);
  const panAt = new THREE.Object3D(); panAt.position.set(0.022, 0.075, 0.0); root.add(panAt);
  return { root, M, hand, left, hammer, cap, trig, rod, cart, muzzle, panAt, scope,
    pose: { x: 0.07, y: -0.16, z: -0.5, rx: 0.08, ry: 0.08, rz: -0.05 }, smoke: 5 };
};
// Harpoon gun ------------------------------------------------------------------------------------
function vmHarpoon(M) {
  const g = new THREE.Group();
  g.add(zcyl(0.008, 0.008, 0.55, M.iron, 10, 0.1));                     // the shaft, its back end in the barrel
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 4), M.dark); head.rotation.x = -Math.PI / 2; head.position.z = -0.48; g.add(head);
  for (const s of [-1, 1]) { const b = box(0.004, 0.006, 0.05, M.dark, s * 0.016, 0, -0.42); b.rotation.y = s * 0.35; g.add(b); }   // the toggle barbs
  g.add(zcyl(0.012, 0.012, 0.01, M.brass, 10, -0.43));
  return g;
}
VM_BUILD.harpoon = (M) => {
  const root = new THREE.Group();
  root.add(zcyl(0.034, 0.03, 0.42, M.iron, 18, 0.0, 0, 0.055));
  root.add(zcyl(0.04, 0.04, 0.025, M.brass, 18, -0.4, 0, 0.055));
  root.add(zcyl(0.036, 0.036, 0.02, M.brass, 18, -0.02, 0, 0.055));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), M.bore); bore.position.set(0, 0.055, -0.426); root.add(bore);
  const harp = vmHarpoon(M); harp.position.set(0, 0.055, 0); root.add(harp);
  // stock and pistol grip
  root.add(profile([[0.0, 0.05], [0.14, 0.045], [0.34, 0.07], [0.36, 0.075], [0.37, -0.06], [0.3, -0.05], [0.12, 0.0], [0.05, 0.0], [0.03, -0.09], [-0.005, -0.09], [-0.01, 0.02]], 0.05, M.wood, 0.005));
  root.add(box(0.054, 0.14, 0.012, M.brass, 0, 0.005, 0.37));
  // the drum of line on the left, with its crank, and the line running to the harpoon
  const drum = new THREE.Group(); drum.position.set(-0.06, 0.03, -0.14); root.add(drum);
  const dc = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 20); dc.rotateZ(Math.PI / 2); drum.add(new THREE.Mesh(dc, M.iron));
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.005, 6, 20), M.accent); t.rotation.y = Math.PI / 2; t.position.x = -0.018 + i * 0.012; drum.add(t); }
  const crank = new THREE.Group(); crank.position.set(-0.03, 0, 0); drum.add(crank);
  crank.add(box(0.006, 0.05, 0.008, M.dark, 0, 0.025, 0)); crank.add(box(0.025, 0.01, 0.01, M.wood, -0.012, 0.05, 0));
  root.add(box(0.03, 0.01, 0.1, M.iron, -0.035, 0.03, -0.14));
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.3, 4), M.accent); line.rotation.x = Math.PI / 2; line.position.set(-0.035, 0.05, -0.29); line.rotation.z = 0.12; root.add(line);
  // a big side hammer and the trigger
  const hammer = new THREE.Group(); hammer.position.set(0.03, 0.055, 0.04); root.add(hammer);
  const hn = box(0.01, 0.045, 0.012, M.dark, 0, 0.022, -0.012); hn.rotation.x = -0.5; hammer.add(hn); hammer.add(box(0.016, 0.012, 0.024, M.dark, 0, 0.04, -0.03));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.0, 0.03); root.add(guard);
  const trig = box(0.006, 0.024, 0.008, M.dark, 0, 0.0, 0.025); root.add(trig);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.05, 0.02); root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.02, 0.0, -0.25); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const spare = vmHarpoon(M); spare.visible = false; root.add(spare);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.055, -0.43); root.add(muzzle);
  return { root, M, hand, left, harp, drum, crank, hammer, trig, spare, muzzle, line,
    pose: { x: 0.065, y: -0.18, z: -0.44, rx: 0.09, ry: 0.08, rz: -0.05 }, smoke: 3, spin: 0 };
};
// Cutlass ------------------------------------------------------------------------------------
VM_BUILD.cutlass = (M) => {
  const root = new THREE.Group(), sword = new THREE.Group(); root.add(sword);
  // the blade: slightly curved, broadening towards the point, with a fuller; edge along -y side
  const s = new THREE.Shape();
  s.moveTo(-0.014, 0); s.quadraticCurveTo(-0.02, 0.32, -0.005, 0.6); s.lineTo(0.01, 0.62); s.quadraticCurveTo(0.03, 0.4, 0.02, 0.0); s.lineTo(-0.014, 0);
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.002, bevelSegments: 1, curveSegments: 16 }), M.blade);
  bl.position.z = -0.0015; sword.add(bl);
  const fuller = box(0.005, 0.38, 0.0075, M.dark, 0.006, 0.22, 0); sword.add(fuller);
  // the guard: a brass disc and a stirrup over the knuckles
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 22), M.brass); disc.position.y = -0.002; sword.add(disc);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.03, 0, 0), new THREE.Vector3(0.055, -0.04, 0), new THREE.Vector3(0.05, -0.1, 0), new THREE.Vector3(0.02, -0.13, 0)]);
  sword.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.005, 6, false), M.brass));
  // the grip, bound in wire, and the pommel
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.11, 12), M.wood); grip.position.y = -0.065; sword.add(grip);
  for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.0155, 0.0015, 4, 14), M.accent); t.rotation.x = Math.PI / 2; t.position.y = -0.02 - i * 0.017; sword.add(t); }
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), M.brass); pom.scale.set(1, 0.7, 1); pom.position.y = -0.125; sword.add(pom);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.06, 0.0); hand.rotation.set(-1.2, 0, 0); sword.add(hand);
  const tip = new THREE.Object3D(); tip.position.set(0.005, 0.6, 0); sword.add(tip);
  const base = new THREE.Object3D(); base.position.set(0.0, 0.12, 0); sword.add(base);
  sword.scale.setScalar(0.72);
  return { root, M, sword, hand, tip, base, pose: { x: 0.15, y: -0.24, z: -0.46, rx: -0.75, ry: 0.0, rz: -0.45 }, melee: true };
};

// Avtomat ------------------------------------------------------------------------------------
const VM_AVT_SIGHT = 0.083;   // the height of the sight line (the front post's tip) above the gun's origin
function vmAvtMag(M) {
  // a curved box magazine: three sections, each a touch further forward and tilted, and a base plate
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const b = box(0.024, 0.048, 0.05, M.dark, 0, -0.022 - i * 0.043, -i * 0.012); b.rotation.x = 0.13 * i; g.add(b); }
  g.add(box(0.03, 0.008, 0.058, M.accent, 0, -0.152, -0.036));
  g.add(box(0.026, 0.012, 0.03, M.iron, 0, 0.002, 0.01));   // the feed lips
  return g;
}
VM_BUILD.avtomat = (M) => {
  const root = new THREE.Group();
  // receiver and its cover
  root.add(box(0.044, 0.055, 0.28, M.iron, 0, 0.03, -0.06));
  root.add(box(0.038, 0.008, 0.26, M.dark, 0, 0.061, -0.06));
  root.add(box(0.046, 0.012, 0.03, M.brass, 0, 0.03, -0.19));   // the receiver's front ring
  // rear sight: a base and two ears either side of the notch
  root.add(box(0.03, 0.012, 0.024, M.dark, 0, 0.07, -0.03));
  for (const sx of [-1, 1]) root.add(box(0.008, 0.012, 0.012, M.dark, sx * 0.0095, 0.082, -0.03));
  // barrel, bands, brake
  root.add(zcyl(0.011, 0.011, 0.44, M.iron, 14, -0.2, 0, 0.035));
  root.add(zcyl(0.016, 0.015, 0.04, M.dark, 12, -0.62, 0, 0.035));
  for (const z of [-0.632, -0.645]) root.add(box(0.034, 0.005, 0.004, M.bore, 0, 0.035, z));   // the brake's ports
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), M.bore); bore.position.set(0, 0.035, -0.661); root.add(bore);
  // the wooden handguard, with an inlay, held by two brass bands
  root.add(box(0.04, 0.042, 0.26, M.wood, 0, 0.027, -0.33));
  root.add(box(0.0415, 0.004, 0.2, M.accent, 0, 0.03, -0.33));
  for (const z of [-0.205, -0.455]) root.add(zcyl(0.025, 0.025, 0.012, M.brass, 16, z, 0, 0.028));
  // front sight: a base on the barrel, the post, and a hood round it
  root.add(box(0.012, 0.024, 0.016, M.dark, 0, 0.056, -0.598));
  root.add(box(0.0035, 0.015, 0.004, M.dark, 0, VM_AVT_SIGHT - 0.0075, -0.6));
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0022, 6, 18, Math.PI * 1.25), M.dark); hood.position.set(0, 0.074, -0.6); hood.rotation.z = -Math.PI * 0.125; root.add(hood);
  // the magazine, ahead of the grip
  const magHome = new THREE.Vector3(0, 0.004, -0.1);
  const mag = vmAvtMag(M); mag.position.copy(magHome); root.add(mag);
  const old = vmAvtMag(M); old.visible = false; root.add(old);
  const fresh = vmAvtMag(M); fresh.visible = false; root.add(fresh);
  root.add(box(0.03, 0.01, 0.06, M.iron, 0, 0.002, -0.1));   // the well
  // pistol grip, trigger and guard
  const grip = box(0.03, 0.095, 0.036, M.wood, 0, -0.04, 0.055); grip.rotation.x = -0.28; root.add(grip);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.004, 0.012); root.add(guard);
  const trig = box(0.005, 0.022, 0.007, M.dark, 0, -0.004, 0.012); root.add(trig);
  // the stock, its brass butt plate and a strap swivel
  root.add(profile([[0.08, 0.056], [0.34, 0.036], [0.375, 0.036], [0.375, -0.078], [0.33, -0.072], [0.13, -0.006], [0.08, 0.004]], 0.036, M.wood, 0.004));
  root.add(box(0.04, 0.116, 0.01, M.brass, 0, -0.021, 0.38));
  root.add(box(0.006, 0.012, 0.01, M.brass, 0, -0.05, 0.25));
  // the charging handle, on the left (the left hand racks it)
  const handle = new THREE.Group(); handle.position.set(-0.024, 0.044, -0.13); root.add(handle);
  handle.add(box(0.014, 0.008, 0.01, M.dark, -0.006, 0, 0)); { const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), M.brass); knob.position.set(-0.015, 0, 0); handle.add(knob); }
  // hands: the right on the grip, the left under the handguard
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.058, 0.07); hand.rotation.z = -0.2; root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.012, -0.012, -0.34); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.035, -0.665); root.add(muzzle);
  return { root, M, hand, left, mag, old, fresh, magHome, handle, trig, muzzle,
    pose: { x: 0.075, y: -0.15, z: -0.36, rx: 0.06, ry: 0.07, rz: -0.04 }, smoke: 1 };
};

// ---------- each frame ----------
const vmSeg = (p, a, b) => { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); };
const vmLerp = (a, b, t) => a + (b - a) * t;
function vmClick(f, v) { try { tone(f, 'square', 0.001, v || 0.05, 0.03); } catch (e) {} }
function vmNoise(f, v, d) { try { noise('bandpass', f, 2, 0.002, v, d); } catch (e) {} }
function vmWeapon(id) {
  let w = VM.weapons[id];
  if (!w) { w = VM.weapons[id] = VM_BUILD[id](vmMatsFor(id)); VM.scene.add(w.root); }
  else vmRecolour(id, w);
  return w;
}
function vmDraw(dt) {
  const m = FPS.me;
  if (m.dead > 0) return true;
  if (!vmInit()) return false;
  if (FPS.scoped && fpsW().scope) return true;   // looking through the telescope: the gun's out of sight
  // your coat changed: the sleeves follow
  const sk = JSON.stringify(fpsColours());
  if (sk !== VM.sleeve) { VM.sleeve = sk; const c = fpsColours(); VM.H.sleeve.color.set(vmHex(c[0], '#3a2a1e')); VM.H.cuff.color.set(vmHex(c[2], '#7a5a3a')); }
  const pr = Math.min(dpr, 1.5);
  if (VM.w !== W || VM.h !== H || VM.pr !== pr) { VM.w = W; VM.h = H; VM.pr = pr; VM.r.setPixelRatio(pr); VM.r.setSize(W, H, false); VM.cam.aspect = W / H; VM.cam.updateProjectionMatrix(); }
  const id = FPSW[FPS.weapon] ? FPS.weapon : 'pepperbox', wpn = vmWeapon(id);
  for (const k in VM.weapons) VM.weapons[k].root.visible = k === id;
  for (const k in VM.weapons) for (const o of ['fresh', 'spent']) if (VM.weapons[k][o] && k !== id) VM.weapons[k][o].visible = false;
  if (VM.cur !== id) { VM.cur = id; VM.lastP = 1; VM.hammer = 1; VM.trail = []; VM.swingT = 9; VM.swings = FPS.vmShots || 0; VM.shots = FPS.vmShots || 0; VM.lhand.visible = false; }
  const narrow = W < H, sc = narrow ? 0.78 : 1, t = g.t, still = reduceMotion;
  // sway: lags behind your turns, bobs as you walk, breathes when you stand
  VM.sway[0] += ((FPS.lastLook ? -FPS.lastLook[0] : 0) * 0.0009 - VM.sway[0]) * Math.min(1, dt * 8);
  VM.sway[1] += ((FPS.lastLook ? FPS.lastLook[1] : 0) * 0.0009 - VM.sway[1]) * Math.min(1, dt * 8);
  const walk = m.walk ? 1 : 0;
  const S = { dt, t, still, sc, narrow, walk,
    bobX: still ? 0 : Math.sin(FPS.step * 0.5) * 0.012 * walk, bobY: still ? 0 : (Math.abs(Math.cos(FPS.step * 0.5)) * 0.01 * walk + Math.sin(t * 1.6) * 0.002),
    rec: FPS.recoil, R: fpsW().reload, p: m.reload > 0 ? 1 - m.reload / fpsW().reload : 1, reloading: m.reload > 0,
    draw: FPS.drawT > 0 ? 1 - FPS.drawT / 0.45 : 1, fired: false, trigger: FPS.mouseDown || FPS.touchFire || FPS.padFire };
  if ((FPS.vmShots || 0) !== VM.shots) { S.fired = true; S.nFired = (FPS.vmShots || 0) - VM.shots; VM.shots = FPS.vmShots || 0; }
  // the weapon's own movements
  VM_ANIM[id](wpn, S);
  if (id !== 'cutlass') VM.trailMesh.visible = false;
  // sounds as reload steps happen
  if (S.reloading && wpn.steps) { for (const [x, fn] of wpn.steps) if (VM.lastP < x && S.p >= x) fn(); }
  VM.lastP = S.reloading ? S.p : 1;
  // the flash and the smoke at the muzzle
  if (S.fired && !wpn.melee) { VM.flashT = id === 'blunderbuss' ? 0.09 : id === 'avtomat' ? 0.045 : 0.06; vmPuff(wpn, wpn.smoke || 3); if (wpn.flint) VM.panT = 0.06; }
  wpn.root.updateMatrixWorld(true);
  const mz = new THREE.Vector3(), mq = new THREE.Quaternion();
  if (wpn.muzzle) { wpn.muzzle.getWorldPosition(mz); wpn.muzzle.getWorldQuaternion(mq); VM.muzzle = mz.clone(); VM.muzzleQ = mq.clone(); }
  VM.flashT -= dt; VM.panT -= dt;
  VM.flash.visible = VM.flashT > 0 && !still && !!wpn.muzzle;
  if (VM.flash.visible) { VM.flash.position.copy(mz); VM.flash.quaternion.copy(mq); VM.flash.rotateZ(Math.random() * 3); VM.flash.scale.setScalar((id === 'blunderbuss' ? 1.6 : id === 'harpoon' ? 0.7 : id === 'avtomat' ? 0.85 : 1) * (0.8 + Math.random() * 0.5)); }
  VM.pan.visible = VM.panT > 0 && !!wpn.panAt && !still;
  if (VM.pan.visible) { wpn.panAt.getWorldPosition(VM.pan.position); VM.pan.lookAt(VM.cam.position); VM.pan.scale.setScalar(1 + Math.random()); }
  VM.flashL.position.copy(mz); VM.flashL.intensity = VM.flashT > 0 ? (id === 'blunderbuss' ? 5 : 3) * flashK() : 0;
  for (const s of VM.smoke) {
    if (s.t <= 0) { s.m.visible = false; continue; }
    s.t -= dt; s.m.visible = true;
    s.m.position.addScaledVector(s.v, dt); s.v.y += dt * 0.05;
    const k = s.t / s.T; s.m.material.opacity = 0.35 * k; s.m.scale.setScalar(s.size * (1 + (1 - k) * 2.5));
    s.m.lookAt(VM.cam.position);
  }
  for (const gr of VM.grains) { if (gr.t <= 0) { gr.m.visible = false; continue; } gr.t -= dt; gr.v.y -= dt * 1.5; gr.m.position.addScaledVector(gr.v, dt); gr.m.visible = true; }
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
function vmPuff(wpn, n) {
  wpn.root.updateMatrixWorld(true);
  const at = new THREE.Vector3(); if (wpn.muzzle) wpn.muzzle.getWorldPosition(at); else return;
  let k = 0;
  for (const s of VM.smoke) {
    if (s.t > 0) continue;
    s.T = s.t = 0.8 + Math.random() * 0.6; s.size = n > 5 ? 1.6 : 1; s.m.position.copy(at);
    s.v = new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.03 + Math.random() * 0.05, -0.05 - Math.random() * 0.12);
    if (++k >= n) break;
  }
}
// grains of powder or shot falling into a muzzle (from just above it)
function vmPour(at, lead, n) {
  let k = 0;
  for (const gr of VM.grains) {
    if (gr.t > 0 || gr.lead !== lead) continue;
    gr.t = 0.25 + Math.random() * 0.1; gr.m.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.02, 0.04 + Math.random() * 0.04, (Math.random() - 0.5) * 0.02));
    gr.v.set((Math.random() - 0.5) * 0.05, -0.1, (Math.random() - 0.5) * 0.05);
    if (++k >= n) break;
  }
}
// the weapon's resting place, plus sway, bob, kick, a reload's tilt and being brought up from below
function vmPlace(wpn, S, tip, extra) {
  const P = wpn.pose, e = extra || {}, sc = S.sc, rec = S.rec, d = 1 - S.draw;
  wpn.root.position.set(
    (P.x + S.bobX + VM.sway[0] - tip * 0.05 + (e.x || 0)) * sc,
    (P.y - S.bobY - VM.sway[1] + tip * 0.03 - rec * 0.012 - d * 0.28 + (e.y || 0)) * sc,
    (P.z - tip * 0.04 + rec * 0.04 + (e.z || 0)) * (S.narrow ? 1.12 : 1));
  wpn.root.rotation.set(P.rx + rec * 0.28 + tip * 0.45 - d * 0.6 + (e.rx || 0), P.ry + VM.sway[0] * 1.5 - tip * 0.15 + (e.ry || 0), P.rz + tip * 0.55 + (e.rz || 0));
  wpn.root.scale.setScalar(sc);
}
// the shared left hand, put somewhere in a weapon's own space
function vmLeftAt(wpn, pos, rot) {
  wpn.root.updateMatrixWorld(true);
  VM.lhand.visible = true;
  VM.lhand.position.copy(pos).applyMatrix4(wpn.root.matrixWorld);
  VM.lhand.quaternion.copy(wpn.root.quaternion); if (rot) VM.lhand.rotateX(rot[0]), VM.lhand.rotateY(rot[1]), VM.lhand.rotateZ(rot[2]);
  VM.lhand.scale.setScalar(S_SCALE(wpn));
}
const S_SCALE = wpn => wpn.root.scale.x;

const VM_ANIM = {};
VM_ANIM.pepperbox = (w, S) => {
  const p = S.p;
  if (S.fired) { VM.turnTo += Math.PI / 3 * S.nFired; VM.hammer = 0; }
  VM.turn += (VM.turnTo - VM.turn) * Math.min(1, S.dt * 18);
  w.cluster.rotation.z = VM.turn;
  VM.hammer = Math.min(1, VM.hammer + S.dt * 6);
  const tip = vmSeg(p, 0, 0.16) - vmSeg(p, 0.86, 1), off = vmSeg(p, 0.16, 0.28);
  const fall = p >= 0.28 && p < 0.62 ? (p - 0.28) / 0.34 : -1;
  const reach = vmSeg(p, 0.36, 0.58) - vmSeg(p, 0.76, 0.9), seat = vmSeg(p, 0.58, 0.74), cock = S.reloading ? vmSeg(p, 0.8, 0.9) : 1;
  if (S.reloading && p < VM.lastP - 0.5) VM.turnTo = VM.turn = 0;
  w.steps = w.steps || [[0.16, () => vmClick(520, 0.04)], [0.42, () => vmNoise(1800, 0.08, 0.12)], [0.74, () => vmClick(700, 0.07)], [0.88, () => { vmClick(900, 0.05); vmClick(600, 0.04); }], [0.01, () => { VM.turnTo = VM.turn = 0; }]];
  vmPlace(w, S, tip);
  w.hp.rotation.x = (S.reloading ? cock : VM.hammer) * -0.55;
  w.hand.userData.thumb.rotation.x = -1.35 + (S.reloading ? (1 - cock) * 0.5 : (1 - VM.hammer) * 0.35);
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
  const swapping = S.reloading && p >= 0.16 && p < 0.74;
  w.cluster.visible = !swapping;
  w.cluster.position.z = S.reloading && p < 0.28 ? -off * 0.09 : 0;
  w.root.updateMatrixWorld(true);
  const mountW = new THREE.Vector3(), mountQ = new THREE.Quaternion();
  w.mount.getWorldPosition(mountW); w.mount.getWorldQuaternion(mountQ);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(mountQ);
  w.spent.visible = swapping && fall < 1;
  if (w.spent.visible) {
    const f = Math.max(0, fall);
    w.spent.position.copy(mountW).addScaledVector(fwd, 0.09 * (p < 0.28 ? off : 1) + f * 0.05);
    w.spent.position.y -= f * f * 0.7; w.spent.position.x += f * 0.08;
    w.spent.quaternion.copy(mountQ); w.spent.rotateX(f * 2.5); w.spent.rotateZ(VM.turn + f * 3);
    w.spent.scale.setScalar(S.sc);
  }
  const showL = S.reloading && reach > 0.001;
  VM.lhand.visible = showL; w.fresh.visible = showL && p < 0.74;
  if (showL) {
    const home = new THREE.Vector3(-0.35 * S.sc, -0.45 * S.sc, -0.3);
    const at = p < 0.76 ? home.clone().lerp(mountW.clone().addScaledVector(fwd, 0.11 * (1 - seat)), reach) : mountW.clone().lerp(home, 1 - reach);
    w.fresh.position.copy(at); w.fresh.quaternion.copy(mountQ); w.fresh.scale.setScalar(S.sc);
    VM.lhand.position.copy(at).add(new THREE.Vector3(-0.02, -0.05, 0.02).applyQuaternion(mountQ));
    VM.lhand.quaternion.copy(mountQ); VM.lhand.rotateZ(-0.6); VM.lhand.rotateX(0.4); VM.lhand.scale.setScalar(S.sc);
  }
};
VM_ANIM.blunderbuss = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  // firing: the cock snaps forward and the frizzen flies open, then both are reset by the reload
  if (S.fired) { w.fired = 0.0001; }
  if (w.fired) w.fired = Math.min(1, w.fired + S.dt * 25);
  const tip = vmSeg(p, 0, 0.12) - vmSeg(p, 0.86, 1);
  const pour = vmSeg(p, 0.12, 0.2) - vmSeg(p, 0.33, 0.38), shot = vmSeg(p, 0.36, 0.42) - vmSeg(p, 0.46, 0.5);
  const rodOut = vmSeg(p, 0.48, 0.56) - vmSeg(p, 0.66, 0.72);
  const ram = p > 0.55 && p < 0.67 ? Math.abs(Math.sin((p - 0.55) / 0.12 * Math.PI * 2)) : 0;
  const prime = vmSeg(p, 0.72, 0.76) - vmSeg(p, 0.8, 0.83), shut = vmSeg(p, 0.8, 0.83), cock = vmSeg(p, 0.83, 0.88);
  w.steps = w.steps || [[0.16, () => vmNoise(4000, 0.05, 0.25)], [0.4, () => vmNoise(2400, 0.07, 0.2)], [0.58, () => vmNoise(600, 0.08, 0.1)], [0.64, () => vmNoise(600, 0.08, 0.1)], [0.82, () => vmClick(800, 0.06)], [0.87, () => { vmClick(1000, 0.05); vmClick(500, 0.05); }]];
  // reloading tips the bell up and towards you, so you can see into it
  vmPlace(w, S, 0, { x: -tip * 0.04, y: -tip * 0.04, z: -tip * 0.08, rx: tip * 0.55, ry: -tip * 0.3, rz: tip * 0.35 });
  const firedK = S.reloading ? (1 - cock) * (p < 0.83 ? 1 : 0) : (w.fired ? 1 : 0);
  if (S.reloading && p > 0.88) w.fired = 0;
  w.cock.rotation.x = firedK ? 0.75 * Math.min(1, w.fired || 1) : 0;
  w.friz.rotation.x = (S.reloading ? (1 - shut) : (w.fired ? 1 : 0)) * -0.9;
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
  // the horn: up to the muzzle to pour, then to the pan to prime
  w.horn.visible = S.reloading && (pour > 0.01 || prime > 0.01);
  if (w.horn.visible) {
    const atMuzzle = new THREE.Vector3(-0.03, 0.14, -0.54), atPan = new THREE.Vector3(0.08, 0.12, -0.02), home = new THREE.Vector3(-0.25, -0.3, 0.0);
    const target = p < 0.5 ? atMuzzle : atPan, k = p < 0.5 ? pour : prime;
    w.horn.position.copy(home).lerp(target, k); w.horn.rotation.set(0, 0, -0.9 * k - 0.3);
    if (k > 0.95 && Math.random() < 0.6) { w.root.updateMatrixWorld(true); vmPour((p < 0.5 ? w.muzzle : w.panAt).getWorldPosition(new THREE.Vector3()), false, 2); }
    vmLeftAt(w, w.horn.position.clone().add(new THREE.Vector3(0.03, -0.03, 0.03)), [0.2, 0, -0.4]);
  }
  if (S.reloading && shot > 0.01) {
    const at = new THREE.Vector3(-0.25, -0.3, 0.1).lerp(new THREE.Vector3(0.0, 0.12, -0.53), shot);
    vmLeftAt(w, at, [-0.6, 0, 0]);
    if (shot > 0.95 && Math.random() < 0.5) { w.root.updateMatrixWorld(true); vmPour(w.muzzle.getWorldPosition(new THREE.Vector3()), true, 3); }
  }
  // the ramrod: drawn up out of its pipes, turned into the bell, rammed twice, put back
  if (S.reloading && rodOut > 0.001) {
    const inBore = p > 0.53 && p < 0.69;
    if (inBore) { w.rod.position.set(0, 0.05, -0.3 - (1 - ram) * 0.12); w.rod.rotation.set(0, 0, 0); }
    else { w.rod.position.set(0, 0.012 + rodOut * 0.05, -0.05 - rodOut * 0.45); w.rod.rotation.set(0, 0, 0); }
    vmLeftAt(w, w.rod.position.clone().add(new THREE.Vector3(-0.02, 0.0, inBore ? 0.0 : -0.4)), [0.2, 0, -0.5]);
  } else { w.rod.position.set(0, 0.012, -0.05); w.rod.rotation.set(0, 0, 0); }
  w.left.visible = !VM.lhand.visible;
};
VM_ANIM.longarm = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) w.hammerDown = 1;
  const tip = vmSeg(p, 0, 0.12) - vmSeg(p, 0.86, 1);
  const cart = vmSeg(p, 0.12, 0.22) - vmSeg(p, 0.36, 0.4), rodOut = vmSeg(p, 0.4, 0.48) - vmSeg(p, 0.64, 0.7);
  const ram = p > 0.47 && p < 0.65 ? Math.abs(Math.sin((p - 0.47) / 0.18 * Math.PI * 2)) : 0;
  const capOn = vmSeg(p, 0.72, 0.8) - vmSeg(p, 0.8, 0.84), cock = vmSeg(p, 0.82, 0.88);
  w.steps = w.steps || [[0.2, () => vmNoise(3000, 0.06, 0.08)], [0.3, () => vmNoise(4500, 0.04, 0.3)], [0.52, () => vmNoise(700, 0.07, 0.08)], [0.6, () => vmNoise(700, 0.07, 0.08)], [0.8, () => vmClick(1100, 0.04)], [0.87, () => { vmClick(900, 0.05); vmClick(600, 0.04); }]];
  vmPlace(w, S, 0, { x: -tip * 0.04, y: -tip * 0.05, z: -tip * 0.1, rx: tip * 0.5, ry: -tip * 0.3, rz: tip * 0.4 });
  const down = S.reloading ? (p < 0.82 ? 1 : 1 - cock) : (w.hammerDown ? 1 : 0);
  if (S.reloading && p > 0.88) w.hammerDown = 0;
  if (!S.reloading && !w.hammerDown) w.hammer.rotation.x = 0; else w.hammer.rotation.x = 0.55 * down;
  w.cap.visible = !(w.hammerDown && (!S.reloading || p < 0.8));
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
  // the paper cartridge: up from the pouch, a tear at the corner, poured into the muzzle
  w.cart.visible = S.reloading && cart > 0.01;
  if (w.cart.visible) {
    const home = new THREE.Vector3(-0.2, -0.3, 0.05), mouth = new THREE.Vector3(-0.02, 0.15, -0.8);
    w.cart.position.copy(home).lerp(mouth, cart); w.cart.rotation.set(-1.2 * cart, 0, 0);
    if (cart > 0.95 && Math.random() < 0.5) { w.root.updateMatrixWorld(true); vmPour(w.muzzle.getWorldPosition(new THREE.Vector3()), false, 2); }
    vmLeftAt(w, w.cart.position.clone().add(new THREE.Vector3(0.0, -0.035, 0.02)), [-0.4, 0, -0.3]);
  }
  if (S.reloading && rodOut > 0.001) {
    const inBore = p > 0.46 && p < 0.66;
    if (inBore) { w.rod.position.set(0, 0.05, -0.5 - (1 - ram) * 0.14); w.rod.rotation.set(0, 0, 0); }
    else { w.rod.position.set(0, 0.018 + rodOut * 0.05, -0.06 - rodOut * 0.7); w.rod.rotation.set(0, 0, 0); }
    vmLeftAt(w, w.rod.position.clone().add(new THREE.Vector3(-0.02, 0, inBore ? 0.02 : -0.6)), [0.2, 0, -0.5]);
  } else { w.rod.position.set(0, 0.018, -0.06); w.rod.rotation.set(0, 0, 0); }
  if (S.reloading && capOn > 0.01) vmLeftAt(w, new THREE.Vector3(-0.15, -0.25, 0.1).lerp(new THREE.Vector3(0.04, 0.09, 0.02), capOn), [0, 0, -0.8]);
  w.left.visible = !VM.lhand.visible;
};
VM_ANIM.harpoon = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) { w.out = 0.0001; w.spin = 40; w.hammerDown = 1; }
  // the harpoon leaves the barrel, the drum pays out line
  if (w.out) w.out = Math.min(1, w.out + S.dt * 9);
  w.spin *= Math.pow(0.08, S.dt); w.drum.rotation.x += w.spin * S.dt;
  const tip = vmSeg(p, 0, 0.1) - vmSeg(p, 0.88, 1);
  const crank = p > 0.1 && p < 0.38 ? (p - 0.1) / 0.28 : -1;
  const bring = vmSeg(p, 0.38, 0.55), slide = vmSeg(p, 0.55, 0.76), cock = vmSeg(p, 0.8, 0.88);
  w.steps = w.steps || [[0.15, () => vmNoise(1200, 0.05, 0.2)], [0.25, () => vmNoise(1200, 0.05, 0.2)], [0.33, () => vmNoise(1200, 0.05, 0.2)], [0.74, () => vmClick(500, 0.08)], [0.87, () => { vmClick(800, 0.06); vmClick(450, 0.06); }]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: -tip * 0.03, z: -tip * 0.06, rx: tip * 0.4, ry: -tip * 0.25, rz: tip * 0.45 });
  if (S.reloading && p > 0.4) w.out = 0;
  w.harp.visible = S.reloading ? p >= 0.76 : (!w.out || w.out < 1);
  w.harp.position.z = w.out && !S.reloading ? -w.out * 0.9 : 0;
  w.line.visible = w.harp.visible;
  w.hammer.rotation.x = (S.reloading ? (p < 0.8 ? 1 : 1 - cock) : (w.hammerDown ? 1 : 0)) * 0.6;
  if (S.reloading && p > 0.88) w.hammerDown = 0;
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
  // the crank turns the line back onto the drum
  if (crank >= 0) {
    w.crank.rotation.x = -crank * Math.PI * 6; w.drum.rotation.x = -crank * Math.PI * 6;
    const c = new THREE.Vector3(-0.09, 0.03, -0.14), a = -crank * Math.PI * 6;
    vmLeftAt(w, c.clone().add(new THREE.Vector3(-0.02, Math.cos(a) * 0.05, Math.sin(a) * 0.05)), [0, -0.4, -0.6]);
  }
  // a new harpoon up from below and down the barrel
  w.spare.visible = S.reloading && p >= 0.38 && p < 0.76;
  if (w.spare.visible) {
    const front = new THREE.Vector3(0, 0.055, -0.95), home = new THREE.Vector3(-0.3, -0.35, -0.5);
    w.spare.position.copy(home).lerp(front, bring); w.spare.position.z += slide * 0.95; w.spare.rotation.z = (1 - bring) * 0.8;
    vmLeftAt(w, w.spare.position.clone().add(new THREE.Vector3(-0.015, -0.04, -0.35)), [0.2, 0, -0.5]);
  }
  w.left.visible = !VM.lhand.visible;
};
VM_ANIM.cutlass = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  // a new swing: forehand, backhand, thrust, round again
  if (S.fired) { VM.swingT = 0; VM.swingK = ((FPS.swing || 1) - 1) % 3; VM.trail = []; }
  const dur = FPSW.cutlass.rate; VM.swingT += S.dt;
  const k = Math.min(1, VM.swingT / dur);
  const wind = vmSeg(k, 0, 0.22), strike = vmSeg(k, 0.22, 0.5), back = vmSeg(k, 0.6, 1);
  let e = {};
  if (k < 1) {
    if (VM.swingK === 0) e = { x: 0.08 * wind - 0.32 * strike + 0.24 * back, y: 0.06 * wind - 0.08 * strike + 0.02 * back, rz: -0.6 * wind + 2.0 * strike - 1.4 * back, rx: 0.3 * wind - 0.9 * strike + 0.6 * back, ry: 0.4 * strike - 0.4 * back };
    else if (VM.swingK === 1) e = { x: -0.22 * wind + 0.34 * strike - 0.12 * back, y: 0.04 * wind - 0.06 * strike + 0.02 * back, rz: 1.3 * wind - 2.1 * strike + 0.8 * back, rx: 0.2 * wind - 0.8 * strike + 0.6 * back, ry: -0.3 * strike + 0.3 * back };
    else e = { x: -0.07 * wind + 0.07 * back, y: 0.08 * wind - 0.08 * back, z: 0.08 * wind - 0.3 * strike + 0.22 * back, rx: -1.0 * wind + 0.95 * back + 0.05 * strike, rz: 0.4 * wind - 0.4 * back };
  }
  // R: turn it to the light, then wipe it down with the other sleeve
  const look = vmSeg(p, 0, 0.25) - vmSeg(p, 0.8, 1), wipe = p > 0.35 && p < 0.75 ? (p - 0.35) / 0.4 : -1;
  if (S.reloading) e = { x: -0.06 * look, y: 0.08 * look, z: 0.04 * look, rx: 0.7 * look, ry: -1.1 * look, rz: -0.3 * look };
  w.steps = w.steps || [[0.4, () => vmNoise(5000, 0.03, 0.4)], [0.2, () => vmNoise(7000, 0.02, 0.2)]];
  vmPlace(w, S, 0, e);
  if (wipe >= 0) { w.root.updateMatrixWorld(true); vmLeftAt(w, new THREE.Vector3(-0.04, 0.12 + wipe * 0.45, 0.04), [0, 0, -1.4]); }
  // the trail behind the blade during the strike
  w.root.updateMatrixWorld(true);
  const a = w.tip.getWorldPosition(new THREE.Vector3()), b = w.base.getWorldPosition(new THREE.Vector3());
  if (k > 0.2 && k < 0.62 && !S.still) VM.trail.push([a, b]); else if (VM.trail.length) VM.trail.shift();
  while (VM.trail.length > VM.trailN) VM.trail.shift();
  const pos = VM.trailMesh.geometry.attributes.position, al = VM.trailMesh.geometry.attributes.alpha, n = VM.trail.length;
  VM.trailMesh.visible = n > 1;
  for (let i = 0; i < VM.trailN; i++) {
    const tr = VM.trail[Math.min(n - 1, i)] || [a, b], f = n ? i / Math.max(1, n - 1) : 0;
    pos.setXYZ(i * 2, tr[0].x, tr[0].y, tr[0].z); pos.setXYZ(i * 2 + 1, tr[1].x, tr[1].y, tr[1].z);
    al.setX(i * 2, i < n ? f : 0); al.setX(i * 2 + 1, i < n ? f * 0.2 : 0);
  }
  pos.needsUpdate = true; al.needsUpdate = true;
};
VM_ANIM.avtomat = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  // down the sights, or at the hip
  const want = FPS.scoped && !S.reloading ? 1 : 0;
  VM.ads = (VM.ads || 0) + (want - (VM.ads || 0)) * Math.min(1, S.dt * 14);
  const a = VM.ads < 0.002 ? 0 : VM.ads;
  // each round: the handle slams back, and the gun jumps a little this way and that
  if (S.fired) { w.bolt = 1; w.jx = Math.random() - 0.5; w.jy = Math.random(); }
  w.bolt = Math.max(0, (w.bolt || 0) - S.dt * 24);
  // the reload, in its parts
  const tip = vmSeg(p, 0, 0.1) - vmSeg(p, 0.88, 1);
  const reachOld = vmSeg(p, 0.07, 0.17) - vmSeg(p, 0.22, 0.3);
  const drop = S.reloading && p >= 0.19 && p < 0.42 ? (p - 0.19) / 0.23 : -1;
  const bring = vmSeg(p, 0.38, 0.56), seat = vmSeg(p, 0.56, 0.63), slap = p > 0.63 && p < 0.69 ? Math.sin((p - 0.63) / 0.06 * Math.PI) : 0;
  const toHandle = vmSeg(p, 0.69, 0.75) - vmSeg(p, 0.84, 0.9);
  const pull = vmSeg(p, 0.75, 0.8) * (1 - vmSeg(p, 0.82, 0.835));
  w.steps = w.steps || [[0.17, () => vmClick(650, 0.05)], [0.3, () => vmNoise(1500, 0.06, 0.12)], [0.4, () => vmNoise(900, 0.05, 0.2)], [0.62, () => vmClick(480, 0.08)], [0.66, () => vmNoise(700, 0.06, 0.06)], [0.79, () => vmClick(900, 0.06)], [0.83, () => { vmClick(560, 0.08); vmClick(1100, 0.04); }]];
  // at the hip: the usual place, with a lighter kick (it's fired so fast), tipped over to show the magazine on a reload
  const rec = S.rec, jx = w.jx || 0, jy = w.jy || 0;
  const S2 = Object.assign({}, S, { rec: rec * 0.45 });
  vmPlace(w, S2, 0, { x: -tip * 0.03 + jx * 0.006 * rec, y: -tip * 0.04 - slap * 0.012, z: -tip * 0.05, rx: tip * 0.3 + jy * 0.04 * rec, ry: -tip * 0.3 + jx * 0.03 * rec, rz: tip * 0.65 });
  // down the sights: the rear notch near the eye, the post on the middle of the view; the kick shoves it back and up
  if (a > 0) {
    const L = vmLerp;
    w.root.position.set(L(w.root.position.x, jx * 0.002 * rec, a), L(w.root.position.y, -VM_AVT_SIGHT - rec * 0.004, a), L(w.root.position.z, -0.19 + rec * 0.03, a));
    w.root.rotation.set(L(w.root.rotation.x, rec * (0.035 + jy * 0.02), a), L(w.root.rotation.y, jx * rec * 0.025, a), L(w.root.rotation.z, jx * rec * 0.02, a));
    w.root.scale.setScalar(L(S.sc, 1, a));
  }
  w.trig.rotation.x = S.trigger ? 0.35 : 0;
  // the handle: back with every round, and racked by hand at the end of a reload
  w.handle.position.z = -0.13 + Math.max(w.bolt * 0.045, pull * 0.07);
  // magazines: the empty one drops away, a full one comes up and is rocked in
  const out = S.reloading && p >= 0.19 && p < 0.63;
  w.mag.visible = !out;
  w.old.visible = drop >= 0 && drop < 1;
  if (w.old.visible) { const f = drop; w.old.position.set(f * 0.02, w.magHome.y - f * f * 0.55, w.magHome.z + f * 0.05); w.old.rotation.set(f * 1.6, 0, f * 0.7); }
  w.fresh.visible = S.reloading && p >= 0.38 && p < 0.63;
  if (w.fresh.visible) {
    const home = new THREE.Vector3(-0.2, -0.34, 0.04), under = new THREE.Vector3(0, w.magHome.y - 0.07, w.magHome.z - 0.02);
    w.fresh.position.copy(home).lerp(under, bring).lerp(w.magHome, seat);
    w.fresh.rotation.set((1 - bring) * 0.9 + (1 - seat) * 0.25 * bring, 0, (1 - bring) * -0.6);
  }
  // the left hand: to the catch, then with the full magazine, a slap, then over to the handle
  if (S.reloading) {
    if (reachOld > 0.01 && p < 0.3) vmLeftAt(w, new THREE.Vector3(-0.25, -0.35, 0.0).lerp(new THREE.Vector3(-0.02, -0.06, -0.1), reachOld), [0.4, 0, -0.5]);
    else if (w.fresh.visible) vmLeftAt(w, w.fresh.position.clone().add(new THREE.Vector3(-0.02, -0.08, 0.0)), [0.3, 0, -0.4]);
    else if (slap > 0.01) vmLeftAt(w, new THREE.Vector3(-0.01, -0.17 + slap * 0.02, -0.12), [0.2, 0, -0.3]);
    else if (toHandle > 0.01) vmLeftAt(w, new THREE.Vector3(-0.2, -0.25, -0.2).lerp(new THREE.Vector3(-0.05, 0.04, -0.13 + pull * 0.07), toHandle), [0, -0.6, -1.2]);
  }
  w.left.visible = !VM.lhand.visible;
};
