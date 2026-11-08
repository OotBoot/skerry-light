// Wreckers' Night: your own wrecker, in 3D, seen over your shoulder.
//
// A proper figure standing in the 3D island scene (so rocks hide it and the lighthouse beam and your
// lantern light it), built from your boat skin's colours:
//  - a long open-fronted coat (the hull colour) with turned-back cuffs, a stand collar, lapels and brass
//    buttons, and a skirt that swings out behind you as you run and flips up when you jump
//  - a waistcoat, a shirt and cravat, a sash in your sail colour, a belt with a brass buckle, a
//    bandolier across the back with cartridge pouches, a powder horn and a dirk at the hip
//  - breeches, stockings and turned-down sea boots with soles and heels
//  - a head with ears, hair tied back in a queue with a ribbon, and a tricorn with braided edges and a
//    cockade
//  - the weapon you're holding, the same 3D model (and skin) as in first person, in your hands: the
//    pepperbox held out in one hand, the long guns shouldered with the left hand on the barrel, the
//    cutlass carried point-up and swung with each cut
//  - a lantern: in your left hand when the right one is enough, hooked to your belt when you need both;
//    its glass glows while it's lit
// It moves with you: legs and arms swing as you walk (faster and longer as you run), you bob and lean,
// your head and gun follow your aim up and down, the gun kicks back when you fire and tips up while you
// reload, your legs tuck when you jump and you sink a little when you land.
//
// Arms are placed by a small two-bone reach (shoulder, elbow, wrist) to wherever the hands are.
// Without WebGL (the Classic renderer) the flat figure in fps.js is drawn instead.

const FB = { tried: false, ok: false, root: null, key: '', mats: [], wpn: {}, cur: '', amp: 0, spd: 0, lx: null, ly: null, swing: 0 };
const FB_UP = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;

function fbCol(s, d) { try { if (typeof s === 'string' && /^#[0-9a-f]{3,8}$/i.test(s)) return new THREE.Color(s.slice(0, 7)); } catch (e) {} return new THREE.Color(d); }
function fbMat(c, extra) {
  const m = new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true, transparent: true }, extra || {}));
  m.userData.base = m.color.clone(); FB.mats.push(m); return m;
}
function fbMesh(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(m); return m; }
// a cylinder hanging down from y=0 to y=-h (for limbs and the coat skirt), optionally open at the front
function fbDown(rt, rb, h, mat, seg, gap) {
  const g = gap ? new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, true, Math.PI + gap / 2, Math.PI * 2 - gap) : new THREE.CylinderGeometry(rt, rb, h, seg || 10);
  g.translate(0, -h / 2, 0); return new THREE.Mesh(g, mat);
}
function fbUp(rb, rt, h, mat, seg, gap) {
  const g = gap ? new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1, true, Math.PI + gap / 2, Math.PI * 2 - gap) : new THREE.CylinderGeometry(rt, rb, h, seg || 10);
  g.translate(0, h / 2, 0); return new THREE.Mesh(g, mat);
}
// a limb segment: a unit-length cylinder stretched and turned to run from a to b
function fbBoneGeo(r1, r2) { const g = new THREE.CylinderGeometry(r2, r1, 1, 9); g.translate(0, 0.5, 0); return g; }
function fbBone(mesh, a, b) {
  const d = b.clone().sub(a), L = Math.max(0.001, d.length());
  mesh.position.copy(a); mesh.quaternion.setFromUnitVectors(FB_UP, d.multiplyScalar(1 / L)); mesh.scale.set(1, L, 1);
}
// shoulder → elbow → wrist: where the elbow goes so both bones reach, bending towards `pole`
function fbIK(S, T, L1, L2, pole) {
  const d = T.clone().sub(S); let len = d.length();
  const max = L1 + L2 - 0.002, min = Math.abs(L1 - L2) + 0.01;
  len = Math.min(max, Math.max(min, len)); const dir = d.normalize();
  const a = (L1 * L1 - L2 * L2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const bend = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return S.clone().add(dir.clone().multiplyScalar(a)).add(bend.multiplyScalar(h));
}

function fbBuild() {
  const c = fpsColours();
  if (FB.root) { GL3D.scene.remove(FB.root); FB.root.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); }); }
  for (const m of FB.mats) m.dispose();
  FB.mats = []; FB.wpn = {}; FB.cur = ''; FB.key = JSON.stringify(c);
  const coatC = fbCol(c[0], '#3a2a1e'), trimC = fbCol(c[2], '#7a5a3a'), sashC = fbCol(c[1], '#a03028');
  const M = FB.M = {
    coat: fbMat(coatC, { side: THREE.DoubleSide }), lining: fbMat(coatC.clone().multiplyScalar(0.55), { side: THREE.DoubleSide }),
    trim: fbMat(trimC), sash: fbMat(sashC, { side: THREE.DoubleSide }),
    waist: fbMat(sashC.clone().lerp(new THREE.Color('#2a2018'), 0.6)), shirt: fbMat('#d6cfbd'),
    breeches: fbMat('#4a3f33'), stocking: fbMat('#c9c0aa'), leather: fbMat('#2a1c14'), tan: fbMat('#5c4028'),
    brass: fbMat('#b8913c'), flesh: fbMat('#9a7058'), hair: fbMat('#2a1e16'), hat: fbMat('#1b1713', { side: THREE.DoubleSide }),
    iron: fbMat('#3a3a3e'), horn: fbMat('#d8c9a0'),
    glass: new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true }),
  };
  const root = FB.root = new THREE.Group(); root.visible = false;

  // ---- hips and legs ----
  const hips = FB.hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const pelvis = fbMesh(new THREE.SphereGeometry(0.17, 10, 8), M.breeches, 0, -0.04, 0, hips); pelvis.scale.set(1.05, 0.7, 0.75);
  FB.legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.095, 0, 0); hips.add(leg);
    leg.add(fbDown(0.088, 0.068, 0.45, M.breeches, 9));
    fbMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 9), M.breeches, 0, -0.44, 0, leg);            // the breeches' knee band
    fbMesh(new THREE.SphereGeometry(0.012, 6, 4), M.brass, s * 0.06, -0.44, -0.03, leg);               // its button
    const knee = new THREE.Group(); knee.position.y = -0.45; leg.add(knee);
    knee.add(fbDown(0.062, 0.052, 0.12, M.stocking, 9));
    const shaft = fbDown(0.07, 0.064, 0.33, M.leather, 10); shaft.position.y = -0.08; knee.add(shaft);
    const cuff = fbDown(0.085, 0.078, 0.07, M.tan, 10); cuff.position.y = -0.06; knee.add(cuff);    // the turned-down top
    const foot = fbMesh(new THREE.BoxGeometry(0.1, 0.075, 0.25), M.leather, 0, -0.43, -0.045, knee);
    foot.geometry.translate(0, 0, 0); foot.scale.set(1, 1, 1);
    fbMesh(new THREE.BoxGeometry(0.11, 0.025, 0.27), M.tan, 0, -0.485, -0.045, knee);                  // the sole
    fbMesh(new THREE.BoxGeometry(0.09, 0.04, 0.06), M.tan, 0, -0.47, 0.06, knee);                     // the heel
    FB.legs.push({ leg, knee, s });
  }

  // ---- the coat's skirt, swinging from the waist ----
  const skirt = FB.skirt = new THREE.Group(); skirt.position.y = 0.06; hips.add(skirt);
  const sk = fbDown(0.2, 0.29, 0.42, M.coat, 14, 1.0); sk.scale.z = 0.8; skirt.add(sk);
  const skl = fbDown(0.195, 0.285, 0.42, M.lining, 14, 1.0); skl.scale.z = 0.78; skl.material = M.lining; skirt.add(skl);
  // the back vent's two folds and their buttons
  for (const s of [-1, 1]) {
    fbMesh(new THREE.BoxGeometry(0.012, 0.36, 0.02), M.lining, s * 0.012, -0.2, 0.225, skirt).rotation.x = 0.12;
    for (let i = 0; i < 2; i++) fbMesh(new THREE.SphereGeometry(0.013, 6, 4), M.brass, s * 0.04, -0.02 - i * 0.06, 0.165 + i * 0.008, skirt);
  }
  fbMesh(new THREE.TorusGeometry(0.29, 0.012, 4, 20, Math.PI * 2 - 1.0), M.trim, 0, -0.42, 0, skirt).rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.5);

  // ---- the body above the waist ----
  const spine = FB.spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  const waist = fbUp(0.165, 0.185, 0.52, M.waist, 12); waist.scale.z = 0.72; spine.add(waist);
  for (let i = 0; i < 5; i++) fbMesh(new THREE.SphereGeometry(0.01, 6, 4), M.brass, 0, 0.1 + i * 0.075, -0.135, spine);
  const shirt = fbMesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), M.shirt, 0, 0.5, -0.12, spine); shirt.rotation.x = -0.15;
  const cravat = fbMesh(new THREE.ConeGeometry(0.04, 0.1, 6), M.shirt, 0, 0.49, -0.14, spine); cravat.rotation.x = Math.PI;
  const coatU = fbUp(0.2, 0.225, 0.55, M.coat, 14, 0.95); coatU.scale.z = 0.8; spine.add(coatU);
  const coatL = fbUp(0.195, 0.22, 0.55, M.lining, 14, 0.95); coatL.scale.z = 0.78; spine.add(coatL);
  // lapels turned back in the trim colour, with their buttons
  for (const s of [-1, 1]) {
    const lap = fbMesh(new THREE.BoxGeometry(0.07, 0.28, 0.012), M.trim, s * 0.1, 0.4, -0.152, spine); lap.rotation.set(-0.12, s * 0.5, s * 0.08);
    for (let i = 0; i < 3; i++) fbMesh(new THREE.SphereGeometry(0.012, 6, 4), M.brass, s * (0.105 + i * 0.004), 0.31 + i * 0.075, -0.17, spine);
    for (let i = 0; i < 3; i++) fbMesh(new THREE.SphereGeometry(0.012, 6, 4), M.brass, s * 0.12, -0.05 - i * 0.07, -0.19, spine);
  }
  const collar = fbUp(0.13, 0.12, 0.08, M.coat, 12, 1.3); collar.position.y = 0.53; collar.scale.z = 0.85; spine.add(collar);
  // the seam down the back and the coat's back panel buttons, seen over your shoulder
  fbMesh(new THREE.BoxGeometry(0.008, 0.5, 0.008), M.lining, 0, 0.27, 0.178, spine);
  // belt, buckle, sash and its hanging knot
  const belt = fbUp(0.19, 0.19, 0.055, M.leather, 14); belt.position.y = -0.01; belt.scale.z = 0.76; spine.add(belt);
  fbMesh(new THREE.BoxGeometry(0.065, 0.05, 0.015), M.brass, 0, 0.017, -0.148, spine);
  fbMesh(new THREE.BoxGeometry(0.04, 0.03, 0.017), M.leather, 0, 0.017, -0.149, spine);
  const sash = fbUp(0.195, 0.2, 0.07, M.sash, 14); sash.position.y = 0.045; sash.scale.z = 0.78; spine.add(sash);
  const knot = fbMesh(new THREE.SphereGeometry(0.03, 8, 6), M.sash, -0.17, 0.07, -0.07, spine); knot.scale.set(1, 0.8, 0.8);
  for (const k of [0, 1]) { const t = fbMesh(new THREE.BoxGeometry(0.035, 0.18, 0.012), M.sash, -0.18 - k * 0.02, -0.04, -0.07 + k * 0.03, spine); t.rotation.z = 0.15 + k * 0.12; }
  // the bandolier: over the left shoulder, across the back to the right hip, with cartridge pouches
  for (const zf of [-1, 1]) {
    const strap = fbMesh(new THREE.BoxGeometry(0.055, 0.68, 0.014), M.tan, 0, 0.27, zf * 0.168, spine); strap.rotation.z = 0.62; strap.rotation.x = zf * 0.05;
  }
  for (let i = 0; i < 4; i++) {
    const p = fbMesh(new THREE.BoxGeometry(0.055, 0.06, 0.035), M.leather, 0.14 - i * 0.085, 0.12 + i * 0.11, 0.19, spine); p.rotation.z = 0.62;
    fbMesh(new THREE.BoxGeometry(0.058, 0.02, 0.038), M.tan, 0.14 - i * 0.085, 0.145 + i * 0.11, 0.19, spine).rotation.z = 0.62;
  }
  // a powder horn and a dirk at the right hip
  const horn = fbMesh(new THREE.ConeGeometry(0.035, 0.2, 8), M.horn, 0.2, 0.0, 0.08, spine); horn.rotation.set(0.2, 0, 1.2);
  fbMesh(new THREE.CylinderGeometry(0.037, 0.037, 0.02, 8), M.brass, 0.25, 0.03, 0.08, spine).rotation.z = 1.2;
  const dirk = fbMesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), M.leather, 0.17, -0.08, -0.06, spine); dirk.rotation.z = 0.25;
  fbMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 6), M.tan, 0.2, 0.06, -0.06, spine).rotation.z = 0.25;
  // shoulders
  FB.shL = new THREE.Vector3(-0.215, 0.47, 0); FB.shR = new THREE.Vector3(0.215, 0.47, 0);
  for (const sp of [FB.shL, FB.shR]) { const b = fbMesh(new THREE.SphereGeometry(0.088, 10, 8), M.coat, sp.x, sp.y, sp.z, spine); b.scale.set(1, 0.85, 0.95); }

  // ---- head ----
  const head = FB.head = new THREE.Group(); head.position.y = 0.58; spine.add(head);
  fbMesh(new THREE.CylinderGeometry(0.05, 0.058, 0.08, 8), M.flesh, 0, 0.02, 0, head);
  const skull = fbMesh(new THREE.SphereGeometry(0.105, 14, 10), M.flesh, 0, 0.14, 0, head); skull.scale.set(0.9, 1.05, 1);
  const hair = fbMesh(new THREE.SphereGeometry(0.111, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.hair, 0, 0.145, 0.008, head); hair.scale.set(0.92, 1.05, 1.02);
  const hairB = fbMesh(new THREE.SphereGeometry(0.108, 12, 8, -Math.PI / 2, Math.PI, Math.PI * 0.3, Math.PI * 0.45), M.hair, 0, 0.13, 0.012, head); hairB.scale.set(0.92, 1.05, 1.02);
  const queue = fbDown(0.022, 0.012, 0.16, M.hair, 6); queue.position.set(0, 0.1, 0.1); queue.rotation.x = 0.25; head.add(queue);
  for (const s of [-1, 1]) { const r = fbMesh(new THREE.BoxGeometry(0.035, 0.025, 0.015), M.sash, s * 0.022, 0.085, 0.112, head); r.rotation.z = s * 0.5; }
  for (const s of [-1, 1]) fbMesh(new THREE.SphereGeometry(0.022, 6, 5), M.flesh, s * 0.095, 0.13, 0.005, head).scale.set(0.5, 1, 0.8);
  fbMesh(new THREE.ConeGeometry(0.018, 0.045, 5), M.flesh, 0, 0.13, -0.105, head).rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) fbMesh(new THREE.SphereGeometry(0.01, 5, 4), M.leather, s * 0.035, 0.16, -0.093, head);
  fbMesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), M.hair, 0, 0.065, -0.095, head);                   // a short beard along the jaw
  // the tricorn: a crown and three upturned brims, edged with braid, a cockade on the left
  const hat = FB.hat = new THREE.Group(); hat.position.set(0, 0.215, 0); hat.rotation.x = -0.08; head.add(hat);
  const crown = fbUp(0.105, 0.098, 0.09, M.hat, 12); hat.add(crown);
  fbMesh(new THREE.CylinderGeometry(0.098, 0.098, 0.012, 12), M.hat, 0, 0.09, 0, hat);
  fbMesh(new THREE.CylinderGeometry(0.108, 0.108, 0.018, 12), M.trim, 0, 0.01, 0, hat);                 // the band
  const brimR = 0.2;
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + Math.PI / 3 + i * (Math.PI * 2 / 3);                                             // the corners point front, back-left, back-right
    const mx = Math.sin(a) * brimR * 0.55, mz = Math.cos(a) * brimR * 0.55;
    const side = new THREE.Group(); side.position.set(mx, 0.005, mz); side.rotation.y = a; hat.add(side);
    const wall = fbMesh(new THREE.BoxGeometry(0.3, 0.09, 0.012), M.hat, 0, 0.035, 0, side); wall.rotation.x = 0.55;
    const edge = fbMesh(new THREE.BoxGeometry(0.3, 0.012, 0.016), M.trim, 0, 0.075, 0.022, side); edge.rotation.x = 0.55;
    fbMesh(new THREE.BoxGeometry(0.26, 0.012, 0.11), M.hat, 0, -0.002, -0.045, side);
  }
  const cock = fbMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.01, 10), M.sash, -0.13, 0.06, -0.07, hat); cock.rotation.set(Math.PI / 2, 0, 0.9);
  fbMesh(new THREE.SphereGeometry(0.008, 5, 4), M.brass, -0.135, 0.06, -0.075, hat);

  // ---- arms: shoulder → elbow → wrist, placed each frame ----
  FB.arms = [];
  for (const s of [-1, 1]) {
    const up = new THREE.Mesh(fbBoneGeo(0.06, 0.052), M.coat), fore = new THREE.Mesh(fbBoneGeo(0.052, 0.045), M.coat);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.053, 8, 6), M.coat);
    const cuff = new THREE.Mesh(fbBoneGeo(0.066, 0.07), M.trim);
    const ruffle = new THREE.Mesh(fbBoneGeo(0.042, 0.05), M.shirt);
    const hand = new THREE.Group(), palm = fbMesh(new THREE.BoxGeometry(0.07, 0.085, 0.035), M.flesh, 0, -0.04, 0, hand);
    fbMesh(new THREE.BoxGeometry(0.02, 0.05, 0.025), M.flesh, -s * 0.04, -0.03, -0.01, hand);
    spine.add(up, fore, elbow, cuff, ruffle, hand);
    FB.arms.push({ s, up, fore, elbow, cuff, ruffle, hand, palm });
  }

  // ---- the lantern ----
  const lan = FB.lan = new THREE.Group(); spine.add(lan);
  fbMesh(new THREE.TorusGeometry(0.035, 0.005, 4, 10, Math.PI), M.iron, 0, 0.0, 0, lan);
  const lb = new THREE.Group(); lb.position.y = -0.03; lan.add(lb);
  fbMesh(new THREE.ConeGeometry(0.06, 0.05, 6), M.iron, 0, -0.025, 0, lb);
  fbMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 6), M.glass, 0, -0.105, 0, lb);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; fbMesh(new THREE.BoxGeometry(0.008, 0.12, 0.008), M.iron, Math.sin(a) * 0.05, -0.105, Math.cos(a) * 0.05, lb); }
  fbMesh(new THREE.CylinderGeometry(0.055, 0.06, 0.02, 6), M.iron, 0, -0.17, 0, lb);
  FB.lanBody = lb;

  // ---- the muzzle flash ----
  let tex = null; try { if (typeof VM !== 'undefined' && VM.softTex) tex = VM.softTex; } catch (e) {}
  FB.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0xffc060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  FB.flash.visible = false; root.add(FB.flash);

  GL3D.scene.add(root);
}

// the held weapon: the first-person model, with its forearm sleeves taken off (the figure has its own arms)
function fbWeapon(id) {
  const key = id + ':' + (typeof vmSkinOf === 'function' ? vmSkinOf(id).id : '');
  let w = FB.wpn[id];
  if (w && w.key === key) return w;
  if (w) { FB.aim.remove(w.root); }
  let built = null;
  try { if (typeof vmInit === 'function' && vmInit() && VM_BUILD[id]) built = VM_BUILD[id](vmMatsFor(id)); } catch (e) { built = null; }
  if (built) {
    for (const h of [built.hand, built.left]) if (h) { h.children[0].visible = false; h.children[1].visible = false; }
    for (const k in built.M) { const m = built.M[k]; if (m && m.isMaterial) { m.transparent = true; FB.wmats = FB.wmats || new Set(); FB.wmats.add(m); } }
  } else {
    // no first-person models to borrow: a plain gun
    const root = new THREE.Group(), hand = new THREE.Object3D(); root.add(hand);
    fbMesh(new THREE.BoxGeometry(0.04, 0.05, id === 'pepperbox' ? 0.3 : 0.9), FB.M.iron, 0, 0.03, -0.25, root);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.03, id === 'pepperbox' ? -0.4 : -0.7); root.add(muzzle);
    built = { root, hand, muzzle, melee: id === 'cutlass' };
  }
  w = FB.wpn[id] = Object.assign(built, { key, id });
  FB.aim.add(w.root);
  return w;
}

// a point in a weapon's space, in the spine's space
const FB_V = new THREE.Vector3();
function fbIn(obj) { obj.updateWorldMatrix(true, false); return FB.spine.worldToLocal(obj.getWorldPosition(new THREE.Vector3())); }

// each frame, from fpsDrawScene, before the 3D scene is drawn: show (or hide) your figure and pose it
function fpsBodySync(show) {
  if (!show || typeof GL3D === 'undefined' || !GL3D.scene) { if (FB.root) FB.root.visible = false; return false; }
  if (!FB.root || FB.key !== JSON.stringify(fpsColours())) {
    try { fbBuild(); FB.aim = new THREE.Group(); FB.spine.add(FB.aim); FB.ok = true; } catch (e) { console.warn('fps body', e); FB.ok = false; FB.root = null; return false; }
  }
  const m = FPS.me, dt = Math.min(0.05, FPS.dtLast || 0.016), w = fpsW(), id = FPS.weapon;
  const root = FB.root; root.visible = true;
  root.position.set(m.x, FPSC.GROUND + (m.jz || 0), -m.y);
  root.rotation.y = -m.h;
  // how fast you're going, from where you were
  if (FB.lx != null) { const v = Math.hypot(m.x - FB.lx, m.y - FB.ly) / Math.max(0.001, dt); FB.spd += (Math.min(12, v) - FB.spd) * Math.min(1, dt * 10); }
  FB.lx = m.x; FB.ly = m.y;
  const air = (m.jz || 0) > 0.02, amp = air ? 0 : Math.min(1, FB.spd / FPSC.SPRINT);
  FB.amp += (amp - FB.amp) * Math.min(1, dt * 8);
  const A = FB.amp, ph = FPS.step || 0, run = A > 0.75;
  // legs: a stride, the knee bending as the foot comes through; tucked up in the air
  const tuck = air ? Math.min(1, (m.jz || 0) * 3) : 0;
  for (const L of FB.legs) {
    const sw = Math.sin(ph + (L.s < 0 ? 0 : Math.PI)) * A * (run ? 0.75 : 0.55);
    L.leg.rotation.x = sw * (1 - tuck) + tuck * (L.s < 0 ? 0.7 : 0.35);
    L.knee.rotation.x = -(Math.max(0, Math.cos(ph + (L.s < 0 ? 0 : Math.PI))) * A * (run ? 1.3 : 0.9) + 0.04) * (1 - tuck) - tuck * (L.s < 0 ? 1.2 : 0.8);
  }
  FB.hips.position.y = 0.95 - Math.abs(Math.cos(ph)) * 0.035 * A + 0.02 * A - (FPS.landed || 0) * 0.35;
  FB.hips.rotation.y = Math.sin(ph) * 0.08 * A;
  // the coat skirt flares out behind you as you go, and up when you jump
  const up = air ? Math.min(0.5, Math.max(0, -(m.vz || 0)) * 0.08 + 0.15) : 0;
  FB.skirt.rotation.x = -(A * 0.32 + up) - Math.sin(ph * 2) * 0.04 * A;
  // the body leans into a run and follows your aim; the head does the rest
  const p = clamp(m.p || 0, -0.6, 0.6);
  FB.spine.rotation.x = -A * 0.12 + p * 0.3;
  FB.spine.rotation.y = -Math.sin(ph) * 0.1 * A;
  FB.head.rotation.x = p * 0.45 - FB.spine.rotation.x * 0.3;
  // the weapon: in the aim frame at the right shoulder, pitched the rest of the way to your aim
  const aim = FB.aim; aim.position.set(0.2, 0.46, 0); aim.rotation.set(p * 0.7 - FB.spine.rotation.x * 0.0, -FB.spine.rotation.y, 0);
  const wp = fbWeapon(id);
  for (const k in FB.wpn) FB.wpn[k].root.visible = k === id;
  const rec = Math.max(0, (FPS.meFlashT || 0) / 0.12), draw = Math.max(0, (FPS.drawT || 0) / 0.45);
  const rl = m.reload > 0 ? Math.sin(Math.min(1, 1 - m.reload / w.reload) * Math.PI) : 0;
  const long = id === 'blunderbuss' || id === 'longarm' || id === 'harpoon';
  if (w.melee) {
    // the cutlass, point up and forward; each cut sweeps it across
    const s = (FPS.meSlashT || 0) > 0 ? 1 - FPS.meSlashT / 0.3 : -1;
    if (s >= 0 && FB.swing === 0) FB.swing = 1;
    if (s < 0) FB.swing = 0;
    const cut = s >= 0 ? Math.sin(s * Math.PI) : 0, side = s >= 0 ? (s < 0.5 ? 1 : -1) : 0;
    wp.root.position.set(0.06 - cut * 0.3, -0.24 + cut * 0.12 - draw * 0.25, -0.3 - cut * 0.15);
    wp.root.rotation.set(-0.85 - cut * 0.7 + draw * 0.8 + rl * 0.5, cut * 0.9 * (side || 1), -0.25 - cut * 0.8 + rl * 0.6);
  } else {
    // where the right hand holds it, and from that, where the gun goes
    // (out at the right shoulder's line rather than the middle, so from behind the gun shows past your arm)
    const grip = long ? new THREE.Vector3(0.02, -0.05, -0.23) : new THREE.Vector3(0.05, -0.03, -0.47);
    const hp = wp.hand ? wp.hand.position : new THREE.Vector3();
    wp.root.rotation.set(rec * 0.35 + rl * 0.9 - draw * 0.9, rl * 0.3, rl * 0.4);
    wp.root.position.copy(grip).sub(hp.clone().applyEuler(wp.root.rotation));
    wp.root.position.z += rec * 0.07; wp.root.position.y -= draw * 0.2 + rl * 0.05;
  }
  // a flash at the muzzle when you fire
  if (rec > 0 && wp.muzzle) {
    FB.flash.visible = true; FB.root.updateMatrixWorld(true);
    FB.flash.position.copy(FB.root.worldToLocal(wp.muzzle.getWorldPosition(new THREE.Vector3())));
    FB.flash.quaternion.copy(FB.root.quaternion).invert().multiply(GL3D.camera.quaternion);
    FB.flash.scale.setScalar(0.6 + rec * (id === 'blunderbuss' ? 1.4 : 0.8));
    FB.flash.material.opacity = rec;
  } else FB.flash.visible = false;
  // hands: the right on the grip; the left on the barrel of a long gun, else carrying the lantern
  root.updateMatrixWorld(true);
  const right = wp.hand && wp.hand.isObject3D && wp.hand.parent ? fbIn(wp.hand) : FB.shR.clone().add(new THREE.Vector3(0, -0.4, -0.2));
  let left, lanAt, lanSwing = 0;
  if (long && wp.left) {
    left = fbIn(wp.left);
    lanAt = new THREE.Vector3(-0.2, 0.0, -0.05); lanSwing = Math.sin(ph * 2) * 0.15 * A;
  } else {
    const sw = Math.sin(ph + Math.PI) * A * 0.35;
    left = new THREE.Vector3(-0.25, 0.47 - 0.52 + Math.abs(sw) * 0.05, -0.04 - sw * 0.3 - 0.06);
    lanAt = left.clone().add(new THREE.Vector3(0, -0.02, 0)); lanSwing = -sw * 0.8 + Math.sin(g.t * 1.7) * 0.05;
  }
  FB.lan.position.copy(lanAt); FB.lan.rotation.set(lanSwing, 0, Math.sin(ph) * 0.1 * A);
  const lit = !!m.lan;
  FB.M.glass.color.set(lit ? (reduceMotion ? 0xffd88a : new THREE.Color(1, 0.84 + 0.04 * Math.sin(g.t * 13), 0.55)) : 0x2a2622);
  const poles = [new THREE.Vector3(-0.5, -0.6, 0.6), new THREE.Vector3(0.6, -0.7, 0.4)];
  for (const a of FB.arms) {
    const S = a.s < 0 ? FB.shL : FB.shR, T = a.s < 0 ? left : right;
    const E = fbIK(S, T, 0.29, 0.27, poles[a.s < 0 ? 0 : 1].normalize());
    fbBone(a.up, S, E); a.elbow.position.copy(E);
    const W = E.clone().lerp(T, 0.82); fbBone(a.fore, E, W);
    const C = E.clone().lerp(T, 0.62); fbBone(a.cuff, C, E.clone().lerp(T, 0.86));
    fbBone(a.ruffle, E.clone().lerp(T, 0.84), E.clone().lerp(T, 0.94));
    // the figure's own hand shows where the weapon has none (the lantern hand, or a plain gun)
    const own = a.s < 0 ? !(long && wp.left) : !(wp.hand && wp.hand.parent && wp.hand.children && wp.hand.children.length);
    a.hand.visible = own; a.hand.position.copy(T); a.hand.quaternion.setFromUnitVectors(FB_UP, T.clone().sub(E).normalize().negate());
  }
  // lit by the beam and your lantern like everything else; and see-through when the camera's squeezed up close
  const see = clamp(0.5 + 0.5 * fpsSeeAt(m.x, m.y, m.lan), 0.45, 1);
  const op = FPS.camPull == null ? 1 : clamp(0.3 + (FPS.camPull - 0.15) / 0.35 * 0.7, 0.3, 1);
  for (const mt of FB.mats) { mt.color.copy(mt.userData.base).multiplyScalar(see); mt.opacity = op; }
  FB.M.glass.opacity = op;
  if (FB.wmats) for (const mt of FB.wmats) mt.opacity = op;
  return true;
}
function fpsBodyHide() { if (FB.root) FB.root.visible = false; }

// your figure hides what's behind it among the flat things drawn over the 3D scene (other wreckers, the
// drowned, Verity), the same way a rock does
function fpsBodyOccluder() {
  if (!FB.root || !FB.root.visible || !GL3D.occ) return;
  const m = FPS.me, pts = [], P = [[-0.2, 0.05, 0], [0.2, 0.05, 0], [-0.26, 0.95, 0], [0.26, 0.95, 0], [-0.28, 1.5, 0], [0.28, 1.5, 0], [-0.15, 1.8, 0], [0.15, 1.8, 0], [0, 1.93, 0]];
  const c0 = cam(m.x, m.y, FPSC.GROUND + (m.jz || 0) + 1); if (c0.f < 0.7) return;
  const sh = Math.sin(m.h), ch = Math.cos(m.h);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [lx, ly] of P) {
    const c = cam(m.x + ch * lx, m.y - sh * lx, FPSC.GROUND + (m.jz || 0) + ly); if (c.f < 0.3) return;
    const q = proj(c); pts.push([q.x, q.y]); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  const h = hull(pts), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  GL3D.occ.push({ f: c0.f - 0.2, pts: h.map(q => [mx + (q[0] - mx) * 0.85, my + (q[1] - my) * 0.92]), x0, x1, y0, y1 });
  GL3D.occ.sort((a, b) => a.f - b.f);
}
