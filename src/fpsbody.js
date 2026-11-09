// Wreckers' Night: the wreckers, in 3D: your own, seen over your shoulder, and everyone else on the island
// (the other players and the bots).
//
// A proper figure standing in the 3D island scene (so walls and rocks hide it and the lighthouse beam and
// lanterns light it), built from the wearer's colours (your boat skin's) and their outfit (ocrates.js):
//  - a long open-fronted coat (the hull colour) with turned-back cuffs, a stand collar, lapels and brass
//    buttons, and a skirt that swings out behind you as you run and flips up when you jump
//  - a waistcoat, a shirt and cravat, a sash in your sail colour, a belt with a brass buckle, a
//    bandolier across the back with cartridge pouches, a powder horn and a dirk at the hip
//  - breeches, stockings and turned-down sea boots with soles and heels
//  - a head with ears, hair tied back in a queue with a ribbon, and a hat: a tricorn with braided edges and a
//    cockade, or the outfit's own (bicorne, sou'wester, watch cap, hood); the finer outfits shimmer, glow,
//    have glowing eyes, or a halo
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
// Everyone else is posed from what's known of them: where they are and are facing, their aim, how fast they're
// moving (for the stride), their weapon (in its plain finish), its flash, their lantern; they're hidden in the
// dark exactly as they would be drawn flat, and their names and lantern glow are still painted over the top.
// Without WebGL (the Classic renderer) the flat figures in fps.js are drawn instead.

const FB = { tried: false, ok: false, root: null, key: '', mats: [], wpn: {}, cur: '', amp: 0, spd: 0, lx: null, ly: null, swing: 0 };
const FB_UP = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;

function fbCol(s, d) { try { if (typeof s === 'string' && /^#[0-9a-f]{3,8}$/i.test(s)) return new THREE.Color(s.slice(0, 7)); } catch (e) {} return new THREE.Color(d); }
function fbMat(c, extra) {
  const m = new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true, transparent: true }, extra || {}));
  m.userData.base = m.color.clone(); (FB.building || FB).mats.push(m); return m;
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

// one wrecker, built from their colours ([coat, sash, trim, lantern]) and their outfit (ocrates.js), if any
function fbFigure(c, outfitId) {
  const F = { mats: [], wpn: {}, key: JSON.stringify(c) + '|' + (outfitId || ''), amp: 0, spd: 0, lx: null, ly: null, swing: 0, ph: 0 };
  F.building = F;
  const oc = typeof ocOutfit === 'function' ? ocOutfit(outfitId) : null;
  F.oc = oc;
  const coatC = fbCol(oc ? oc.coat : c[0], '#3a2a1e'), trimC = fbCol(oc ? oc.trim : c[2], '#7a5a3a'), sashC = fbCol(oc ? oc.sash : c[1], '#a03028');
  const M = F.M = {
    coat: fbMat(coatC, { side: THREE.DoubleSide }), lining: fbMat(coatC.clone().multiplyScalar(0.55), { side: THREE.DoubleSide }),
    trim: fbMat(trimC), sash: fbMat(sashC, { side: THREE.DoubleSide }),
    waist: fbMat(oc && oc.waist ? oc.waist : sashC.clone().lerp(new THREE.Color('#2a2018'), 0.6)), shirt: fbMat('#d6cfbd'),
    breeches: fbMat(oc && oc.breeches ? oc.breeches : '#4a3f33'), stocking: fbMat('#c9c0aa'), leather: fbMat('#2a1c14'), tan: fbMat('#5c4028'),
    brass: fbMat(oc && oc.brass ? oc.brass : '#b8913c'), flesh: fbMat('#9a7058'), hair: fbMat('#2a1e16'), hat: fbMat(oc && oc.hat ? oc.hat : '#1b1713', { side: THREE.DoubleSide }),
    iron: fbMat('#3a3a3e'), horn: fbMat('#d8c9a0'),
    glass: new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true }),
  };
  const root = F.root = new THREE.Group(); root.visible = false;

  // ---- hips and legs ----
  const hips = F.hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const pelvis = fbMesh(new THREE.SphereGeometry(0.17, 10, 8), M.breeches, 0, -0.04, 0, hips); pelvis.scale.set(1.05, 0.7, 0.75);
  F.legs = [];
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
    F.legs.push({ leg, knee, s });
  }

  // ---- the coat's skirt, swinging from the waist ----
  const skirt = F.skirt = new THREE.Group(); skirt.position.y = 0.06; hips.add(skirt);
  const sk = fbDown(0.2, 0.29, 0.42, M.coat, 14, 1.0); sk.scale.z = 0.8; skirt.add(sk);
  const skl = fbDown(0.195, 0.285, 0.42, M.lining, 14, 1.0); skl.scale.z = 0.78; skl.material = M.lining; skirt.add(skl);
  // the back vent's two folds and their buttons
  for (const s of [-1, 1]) {
    fbMesh(new THREE.BoxGeometry(0.012, 0.36, 0.02), M.lining, s * 0.012, -0.2, 0.225, skirt).rotation.x = 0.12;
    for (let i = 0; i < 2; i++) fbMesh(new THREE.SphereGeometry(0.013, 6, 4), M.brass, s * 0.04, -0.02 - i * 0.06, 0.165 + i * 0.008, skirt);
  }
  fbMesh(new THREE.TorusGeometry(0.29, 0.012, 4, 20, Math.PI * 2 - 1.0), M.trim, 0, -0.42, 0, skirt).rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.5);

  // ---- the body above the waist ----
  const spine = F.spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
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
  F.shL = new THREE.Vector3(-0.215, 0.47, 0); F.shR = new THREE.Vector3(0.215, 0.47, 0);
  for (const sp of [F.shL, F.shR]) { const b = fbMesh(new THREE.SphereGeometry(0.088, 10, 8), M.coat, sp.x, sp.y, sp.z, spine); b.scale.set(1, 0.85, 0.95); }

  // ---- head ----
  const head = F.head = new THREE.Group(); head.position.y = 0.58; spine.add(head);
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
  // the hat (a tricorn unless the outfit says otherwise), and eyes that can glow
  F.hat = fbHat(head, M, oc ? oc.style : 'tricorn');
  F.eyes = [];
  if (oc && oc.eyes) { const em = new THREE.MeshBasicMaterial({ color: oc.eyes, transparent: true }); F.eyeMat = em; for (const s of [-1, 1]) F.eyes.push(fbMesh(new THREE.SphereGeometry(0.014, 6, 4), em, s * 0.036, 0.16, -0.098, head)); }

  // ---- arms: shoulder → elbow → wrist, placed each frame ----
  F.arms = [];
  for (const s of [-1, 1]) {
    const up = new THREE.Mesh(fbBoneGeo(0.06, 0.052), M.coat), fore = new THREE.Mesh(fbBoneGeo(0.052, 0.045), M.coat);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.053, 8, 6), M.coat);
    const cuff = new THREE.Mesh(fbBoneGeo(0.066, 0.07), M.trim);
    const ruffle = new THREE.Mesh(fbBoneGeo(0.042, 0.05), M.shirt);
    const hand = new THREE.Group(), palm = fbMesh(new THREE.BoxGeometry(0.07, 0.085, 0.035), M.flesh, 0, -0.04, 0, hand);
    fbMesh(new THREE.BoxGeometry(0.02, 0.05, 0.025), M.flesh, -s * 0.04, -0.03, -0.01, hand);
    spine.add(up, fore, elbow, cuff, ruffle, hand);
    F.arms.push({ s, up, fore, elbow, cuff, ruffle, hand, palm });
  }

  // ---- the lantern ----
  const lan = F.lan = new THREE.Group(); spine.add(lan);
  fbMesh(new THREE.TorusGeometry(0.035, 0.005, 4, 10, Math.PI), M.iron, 0, 0.0, 0, lan);
  const lb = new THREE.Group(); lb.position.y = -0.03; lan.add(lb);
  fbMesh(new THREE.ConeGeometry(0.06, 0.05, 6), M.iron, 0, -0.025, 0, lb);
  fbMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 6), M.glass, 0, -0.105, 0, lb);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; fbMesh(new THREE.BoxGeometry(0.008, 0.12, 0.008), M.iron, Math.sin(a) * 0.05, -0.105, Math.cos(a) * 0.05, lb); }
  fbMesh(new THREE.CylinderGeometry(0.055, 0.06, 0.02, 6), M.iron, 0, -0.17, 0, lb);
  F.lanBody = lb;

  // ---- the muzzle flash ----
  let tex = null; try { if (typeof VM !== 'undefined' && VM.softTex) tex = VM.softTex; } catch (e) {}
  F.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0xffc060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  F.flash.visible = false; root.add(F.flash);

  // a soft halo behind the finest outfits
  if (oc && oc.halo) { let tx = null; try { if (typeof VM !== 'undefined' && VM.softTex) tx = VM.softTex; } catch (e) {} F.halo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ map: tx, color: oc.halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 })); F.halo.position.y = 1.0; root.add(F.halo); }
  FB.building = null;
  F.aim = new THREE.Group(); F.spine.add(F.aim);
  GL3D.scene.add(root);
  return F;
}
// the hats: a tricorn (three upturned brims, braid and a cockade), a bicorne (two tall halves, front and back), a
// sou'wester (a round crown and a wide brim, deepest at the back to shed the rain), a knitted watch cap with a
// turned-up cuff, or a deep hood
function fbHat(head, M, style) {
  const hat = new THREE.Group(); hat.position.set(0, 0.215, 0); hat.rotation.x = -0.08; head.add(hat);
  if (style === 'bicorne') {
    hat.add(fbUp(0.1, 0.095, 0.07, M.hat, 12));
    for (const zf of [-1, 1]) {
      const half = new THREE.Group(); half.position.set(0, 0.0, zf * 0.035); half.rotation.x = zf * 0.12; hat.add(half);
      const sh = new THREE.Shape(); sh.moveTo(-0.24, 0); sh.quadraticCurveTo(-0.2, 0.08, 0, 0.17); sh.quadraticCurveTo(0.2, 0.08, 0.24, 0); sh.lineTo(-0.24, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }); g.translate(0, 0, -0.006);
      half.add(new THREE.Mesh(g, M.hat));
      const edge = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.007, 4, 18, Math.PI), M.trim); edge.scale.set(1.4, 1, 1); edge.position.z = zf * 0.008; half.add(edge);
    }
    const cock = fbMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), M.sash, 0, 0.07, -0.05, hat); cock.rotation.x = Math.PI / 2;
    fbMesh(new THREE.SphereGeometry(0.01, 5, 4), M.brass, 0, 0.07, -0.056, hat);
  } else if (style === 'souwester') {
    const dome = fbMesh(new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.hat, 0, 0.0, 0, hat); dome.scale.set(1, 0.9, 1.05);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.05, 18, 1, true), M.hat); brim.position.set(0, -0.02, 0.03); brim.rotation.x = -0.25; hat.add(brim);
    fbMesh(new THREE.TorusGeometry(0.195, 0.006, 4, 22), M.trim, 0, -0.045, 0.03, hat).rotation.set(Math.PI / 2 - 0.25, 0, 0);
    for (const sx of [-1, 1]) { const tie = fbMesh(new THREE.BoxGeometry(0.008, 0.14, 0.008), M.trim, sx * 0.09, -0.11, -0.02, hat); tie.rotation.z = sx * 0.15; }
  } else if (style === 'watchcap') {
    const cap = fbMesh(new THREE.SphereGeometry(0.114, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hat, 0, -0.04, 0.005, hat); cap.scale.set(0.95, 1.15, 1.02);
    fbMesh(new THREE.CylinderGeometry(0.112, 0.112, 0.05, 14), M.trim, 0, -0.05, 0.005, hat);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; fbMesh(new THREE.BoxGeometry(0.008, 0.07, 0.008), M.hat, Math.sin(a) * 0.106, 0.03, Math.cos(a) * 0.106 + 0.005, hat); }   // its ribbing
  } else if (style === 'hood') {
    hat.position.y = 0.14; hat.rotation.x = 0;
    const hood = fbMesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.72), M.hat, 0, 0.0, 0.02, hat); hood.scale.set(0.95, 1.08, 1.05);
    hood.material = M.hat;
    // the opening round the face, in shadow, and the hood falling to the shoulders
    const rim = fbMesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), M.hat, 0, -0.01, -0.125, hat); rim.scale.set(0.9, 1.15, 1);
    const drape = fbDown(0.14, 0.2, 0.18, M.hat, 12, 1.2); drape.position.set(0, -0.06, 0.02); hat.add(drape);
  } else {
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
  }
  return hat;
}
function fbDispose(F) {
  if (!F || !F.root) return;
  GL3D.scene.remove(F.root);
  F.root.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); });
  for (const m of F.mats) m.dispose();
}


// the held weapon: the first-person model, with its forearm sleeves taken off (the figure has its own arms).
// Your own in your weapon skin; everyone else's in its plain finish
function fbWeapon(F, id, plain) {
  const key = id + ':' + (!plain && typeof vmSkinOf === 'function' ? vmSkinOf(id).id : 'plain');
  let w = F.wpn[id];
  if (w && w.key === key) return w;
  if (w) { F.aim.remove(w.root); }
  let built = null;
  try { if (typeof vmInit === 'function' && vmInit() && VM_BUILD[id]) built = VM_BUILD[id](vmMatsFor(id, plain)); } catch (e) { built = null; }
  if (built) {
    for (const h of [built.hand, built.left]) if (h) { h.children[0].visible = false; h.children[1].visible = false; }
    for (const k in built.M) { const m = built.M[k]; if (m && m.isMaterial) { m.transparent = true; F.wmats = F.wmats || new Set(); F.wmats.add(m); } }
    for (const o of ['fresh', 'spent', 'old']) if (built[o] && built[o].parent && built[o].parent !== built.root) built[o].parent.remove(built[o]);
  } else {
    // no first-person models to borrow: a plain gun
    const root = new THREE.Group(), hand = new THREE.Object3D(); root.add(hand);
    fbMesh(new THREE.BoxGeometry(0.04, 0.05, id === 'pepperbox' ? 0.3 : 0.9), F.M.iron, 0, 0.03, -0.25, root);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.03, id === 'pepperbox' ? -0.4 : -0.7); root.add(muzzle);
    built = { root, hand, muzzle, melee: id === 'cutlass' };
  }
  w = F.wpn[id] = Object.assign(built, { key, id });
  F.aim.add(w.root);
  return w;
}

// a point in a weapon's space, in the spine's space
function fbIn(F, obj) { obj.updateWorldMatrix(true, false); return F.spine.worldToLocal(obj.getWorldPosition(new THREE.Vector3())); }

// pose a figure. s: where they are (x, y, jz, vz, h heading, p pitch), how fast they're going (spd), their stride
// (ph), the weapon (id) and whether it's theirs to skin (plain), how many times it's been reforged at the Lighthouse's
// Bench (pap), its kick (rec 0..1), being drawn (draw 0..1), a reload's tip (rl 0..1), a cutlass cut (slash 0..1,
// or -1), the lantern (lan), how well they're lit (see) and how solid they are (op), and the time (t)
function fbPose(F, s) {
  const dt = s.dt, root = F.root; root.visible = true;
  root.position.set(s.x, FPSC.GROUND + (s.jz || 0), -s.y);
  root.rotation.y = -s.h;
  const air = (s.jz || 0) > 0.02, amp = air ? 0 : Math.min(1, s.spd / FPSC.SPRINT);
  F.amp += (amp - F.amp) * Math.min(1, dt * 8);
  const A = F.amp, ph = s.ph || 0, run = A > 0.75;
  // legs: a stride, the knee bending as the foot comes through; tucked up in the air
  const tuck = air ? Math.min(1, (s.jz || 0) * 3) : 0;
  for (const L of F.legs) {
    const sw = Math.sin(ph + (L.s < 0 ? 0 : Math.PI)) * A * (run ? 0.75 : 0.55);
    L.leg.rotation.x = sw * (1 - tuck) + tuck * (L.s < 0 ? 0.7 : 0.35);
    L.knee.rotation.x = -(Math.max(0, Math.cos(ph + (L.s < 0 ? 0 : Math.PI))) * A * (run ? 1.3 : 0.9) + 0.04) * (1 - tuck) - tuck * (L.s < 0 ? 1.2 : 0.8);
  }
  F.hips.position.y = 0.95 - Math.abs(Math.cos(ph)) * 0.035 * A + 0.02 * A - (s.landed || 0) * 0.35;
  F.hips.rotation.y = Math.sin(ph) * 0.08 * A;
  // the coat skirt flares out behind as they go, and up when they jump
  const up = air ? Math.min(0.5, Math.max(0, -(s.vz || 0)) * 0.08 + 0.15) : 0;
  F.skirt.rotation.x = -(A * 0.32 + up) - Math.sin(ph * 2) * 0.04 * A;
  // the body leans into a run and follows the aim; the head does the rest
  const p = clamp(s.p || 0, -0.6, 0.6);
  F.spine.rotation.x = -A * 0.12 + p * 0.3;
  F.spine.rotation.y = -Math.sin(ph) * 0.1 * A;
  F.head.rotation.x = p * 0.45 - F.spine.rotation.x * 0.3;
  // the weapon: in the aim frame at the right shoulder, pitched the rest of the way to the aim
  const aim = F.aim; aim.position.set(0.2, 0.46, 0); aim.rotation.set(p * 0.7, -F.spine.rotation.y, 0);
  const id = s.id, wp = fbWeapon(F, id, s.plain), wdef = FPSW[id] || FPSW.pepperbox;
  for (const k in F.wpn) F.wpn[k].root.visible = k === id;
  if (typeof zmpSkinFor === 'function') zmpSkinFor(wp, id, s.pap | 0);   // [pap] reforged at the Lampwright's Bench: the Light's fire
  const rec = s.rec || 0, draw = s.draw || 0, rl = s.rl || 0;
  const long = id === 'blunderbuss' || id === 'longarm' || id === 'harpoon' || id === 'avtomat' || id === 'fresnel';
  if (wdef.melee) {
    // the cutlass, point up and forward; each cut sweeps it across
    const sl = s.slash == null ? -1 : s.slash;
    if (sl >= 0 && F.swing === 0) F.swing = 1;
    if (sl < 0) F.swing = 0;
    const cut = sl >= 0 ? Math.sin(sl * Math.PI) : 0, side = sl >= 0 ? (sl < 0.5 ? 1 : -1) : 0;
    wp.root.position.set(0.06 - cut * 0.3, -0.24 + cut * 0.12 - draw * 0.25, -0.3 - cut * 0.15);
    wp.root.rotation.set(-0.85 - cut * 0.7 + draw * 0.8 + rl * 0.5, cut * 0.9 * (side || 1), -0.25 - cut * 0.8 + rl * 0.6);
  } else {
    // where the right hand holds it, and from that, where the gun goes
    // (out at the right shoulder's line rather than the middle, so from behind the gun shows past the arm)
    const grip = long ? new THREE.Vector3(0.02, -0.05, -0.23) : new THREE.Vector3(0.05, -0.03, -0.47);
    const hp = wp.hand ? wp.hand.position : new THREE.Vector3();
    wp.root.rotation.set(rec * 0.35 + rl * 0.9 - draw * 0.9, rl * 0.3, rl * 0.4);
    wp.root.position.copy(grip).sub(hp.clone().applyEuler(wp.root.rotation));
    wp.root.position.z += rec * 0.07; wp.root.position.y -= draw * 0.2 + rl * 0.05;
  }
  // a flash at the muzzle when they fire
  if (rec > 0 && wp.muzzle) {
    F.flash.visible = true; F.root.updateMatrixWorld(true);
    F.flash.position.copy(F.root.worldToLocal(wp.muzzle.getWorldPosition(new THREE.Vector3())));
    F.flash.quaternion.copy(F.root.quaternion).invert().multiply(GL3D.camera.quaternion);
    F.flash.scale.setScalar(0.6 + rec * (id === 'blunderbuss' ? 1.4 : 0.8));
    F.flash.material.opacity = rec;
  } else F.flash.visible = false;
  // hands: the right on the grip; the left on the barrel of a long gun, else carrying the lantern
  root.updateMatrixWorld(true);
  const right = wp.hand && wp.hand.isObject3D && wp.hand.parent ? fbIn(F, wp.hand) : F.shR.clone().add(new THREE.Vector3(0, -0.4, -0.2));
  let left, lanAt, lanSwing = 0;
  if (long && wp.left) {
    left = fbIn(F, wp.left);
    lanAt = new THREE.Vector3(-0.2, 0.0, -0.05); lanSwing = Math.sin(ph * 2) * 0.15 * A;
  } else {
    const sw = Math.sin(ph + Math.PI) * A * 0.35;
    left = new THREE.Vector3(-0.25, 0.47 - 0.52 + Math.abs(sw) * 0.05, -0.04 - sw * 0.3 - 0.06);
    lanAt = left.clone().add(new THREE.Vector3(0, -0.02, 0)); lanSwing = -sw * 0.8 + Math.sin(s.t * 1.7) * 0.05;
  }
  F.lan.position.copy(lanAt); F.lan.rotation.set(lanSwing, 0, Math.sin(ph) * 0.1 * A);
  F.M.glass.color.set(s.lan ? (reduceMotion ? 0xffd88a : new THREE.Color(1, 0.84 + 0.04 * Math.sin(s.t * 13), 0.55)) : 0x2a2622);
  const poles = [new THREE.Vector3(-0.5, -0.6, 0.6), new THREE.Vector3(0.6, -0.7, 0.4)];
  for (const a of F.arms) {
    const S = a.s < 0 ? F.shL : F.shR, T = a.s < 0 ? left : right;
    const E = fbIK(S, T, 0.29, 0.27, poles[a.s < 0 ? 0 : 1].normalize());
    fbBone(a.up, S, E); a.elbow.position.copy(E);
    const Wr = E.clone().lerp(T, 0.82); fbBone(a.fore, E, Wr);
    const C = E.clone().lerp(T, 0.62); fbBone(a.cuff, C, E.clone().lerp(T, 0.86));
    fbBone(a.ruffle, E.clone().lerp(T, 0.84), E.clone().lerp(T, 0.94));
    // the figure's own hand shows where the weapon has none (the lantern hand, or a plain gun)
    const own = a.s < 0 ? !(long && wp.left) : !(wp.hand && wp.hand.parent && wp.hand.children && wp.hand.children.length);
    a.hand.visible = own; a.hand.position.copy(T); a.hand.quaternion.setFromUnitVectors(FB_UP, T.clone().sub(E).normalize().negate());
  }
  // lit as they're lit, and as solid as they're seen
  const see = s.see, op = s.op;
  for (const mt of F.mats) { mt.color.copy(mt.userData.base).multiplyScalar(see); mt.opacity = op; }
  F.M.glass.opacity = op;
  if (F.wmats) for (const mt of F.wmats) mt.opacity = op;
  // an outfit's own light: a shimmer in the trim (Mate), a glow and glowing eyes (Captain), and for the Admirals
  // the whole coat alight, and a halo
  const oc = F.oc;
  if (oc && oc.fx) {
    const t = reduceMotion ? 0 : s.t, gcol = fbCol(oc.glow || oc.trim, '#ffffff');
    const pulse = oc.fx === 'shimmer' ? 0.25 + 0.25 * Math.sin(t * 2.2) : oc.fx === 'glow' ? 0.55 + 0.25 * Math.sin(t * 1.8) : 0.75 + 0.25 * Math.sin(t * 2.6);
    // (a hood stays dark: only its wearer's trim, sash and buttons are alight)
    const keys = oc.fx === 'shimmer' ? ['trim'] : oc.fx === 'glow' ? ['trim', 'sash'] : ['trim', 'sash', 'brass'].concat(oc.style === 'hood' ? [] : ['hat']);
    for (const k of keys) { const mt = F.M[k]; if (mt) { mt.emissive = mt.emissive || new THREE.Color(); mt.emissive.copy(gcol); mt.emissiveIntensity = pulse * op * (k === 'hat' ? 0.35 : 1); } }
    if (oc.fx === 'aura') { const mt = F.M.coat; mt.emissive.copy(gcol); mt.emissiveIntensity = (0.12 + 0.1 * Math.sin(t * 1.3)) * op; }
    if (F.eyeMat) F.eyeMat.opacity = op * (0.7 + 0.3 * Math.sin(t * 3));
    if (F.halo) { F.halo.material.opacity = op * (0.28 + 0.14 * Math.sin(t * 1.6)); F.halo.quaternion.copy(F.root.quaternion).invert().multiply(GL3D.camera.quaternion); }
  }
  return true;
}

// your own figure, over your shoulder: built (again, when your colours or outfit change) and posed each frame
function fpsBodySync(show) {
  if (!show || typeof GL3D === 'undefined' || !GL3D.scene) { if (FB.fig) FB.fig.root.visible = false; return false; }
  const outfit = typeof ocEquippedId === 'function' ? ocEquippedId() : '';
  const key = JSON.stringify(fpsColours()) + '|' + outfit;
  if (!FB.fig || FB.fig.key !== key) {
    try { if (FB.fig) fbDispose(FB.fig); FB.fig = fbFigure(fpsColours(), outfit); FB.ok = true; } catch (e) { console.warn('fps body', e); FB.ok = false; FB.fig = null; return false; }
  }
  const F = FB.fig, m = FPS.me, dt = Math.min(0.05, FPS.dtLast || 0.016), w = fpsW();
  if (F.lx != null) { const v = Math.hypot(m.x - F.lx, m.y - F.ly) / Math.max(0.001, dt); F.spd += (Math.min(12, v) - F.spd) * Math.min(1, dt * 10); }
  F.lx = m.x; F.ly = m.y;
  fbPose(F, {
    dt, x: m.x, y: m.y, jz: m.jz, vz: m.vz, h: m.h, p: m.p, spd: F.spd, ph: FPS.step || 0, landed: FPS.landed,
    id: FPS.weapon, plain: false, pap: typeof zmpTier === 'function' && ZM.on ? zmpTier(FPS.weapon) : 0, rec: Math.max(0, (FPS.meFlashT || 0) / 0.12), draw: Math.max(0, (FPS.drawT || 0) / 0.45),
    rl: m.reload > 0 ? Math.sin(Math.min(1, 1 - m.reload / w.reload) * Math.PI) : 0,
    slash: (FPS.meSlashT || 0) > 0 ? 1 - FPS.meSlashT / 0.3 : -1, lan: !!m.lan, t: g.t,
    // lit by the beam and your lantern like everything else; and see-through when the camera's squeezed up close
    see: clamp(0.5 + 0.5 * fpsSeeAt(m.x, m.y, m.lan), 0.45, 1),
    op: FPS.camPull == null ? 1 : clamp(0.3 + (FPS.camPull - 0.15) / 0.35 * 0.7, 0.3, 1),
  });
  return true;
}
function fpsBodyHide() { if (FB.fig) FB.fig.root.visible = false; }

// everyone else on the island, the other players and the wreckers (bots), as the same 3D figures, in their own
// colours and outfits: built when first seen (up to the nearest ten), posed each frame, hidden in the dark
const FBR = new Map();   // id -> figure
const FB_MAX = 10;
function fpsFiguresSync() {
  if (typeof GL3D === 'undefined' || !GL3D.scene) return;
  const dt = Math.min(0.05, FPS.dtLast || 0.016), m = FPS.me, used = new Set();
  const all = [];
  for (const o of FPS.remote.values()) if (!o.dead && o.id !== FPS.specId) all.push(o);   // (not the one you're watching through: src/zombies.js)
  for (const o of FPS.bots) if (!(o.dead > 0)) all.push(o);
  for (const o of all) o._d = Math.hypot(o.x - m.x, o.y - m.y);
  all.sort((a, b) => a._d - b._d);
  for (const o of all.slice(0, FB_MAX)) {
    if (o._d > 160) continue;
    const vis = Math.max(fpsSeeAt(o.x, o.y, o.lan), (o.flashT || 0) > 0 ? 1 : 0);
    let F = FBR.get(o.id);
    if (vis < 0.04) { if (F) F.root.visible = false; continue; }
    const outfit = typeof ocOutfit === 'function' && ocOutfit(o.o) ? o.o : '';
    const cols = Array.isArray(o.c) ? o.c : ['#3a2a1e', '#d8d0bc', '#7a5a3a', '#ffd88a'];
    const key = JSON.stringify(cols) + '|' + outfit;
    if (!F || F.key !== key) { if (F) fbDispose(F); try { F = fbFigure(cols, outfit); } catch (e) { console.warn('fps figure', e); continue; } FBR.set(o.id, F); }
    used.add(o.id);
    if (F.lx != null) { const v = Math.hypot(o.x - F.lx, o.y - F.ly) / Math.max(0.001, dt); F.spd += (Math.min(12, v) - F.spd) * Math.min(1, dt * 6); }
    if (!o.walk) F.spd *= Math.pow(0.02, dt);
    F.lx = o.x; F.ly = o.y;
    F.ph += dt * F.spd * 8 / FPSC.SPEED;
    const id = (typeof FPSW_BY_CODE !== 'undefined' && FPSW_BY_CODE[o.w]) || 'pepperbox';
    fbPose(F, {
      dt, x: o.x, y: o.y, jz: o.jz || 0, vz: 0, h: o.h || 0, p: o.p || 0, spd: F.spd, ph: F.ph,
      id, plain: true, pap: o.rf | 0, rec: Math.max(0, Math.min(1, (o.flashT || 0) / 0.12)), draw: 0, rl: 0,
      slash: (o.slashT || 0) > 0 ? 1 - o.slashT / 0.3 : -1, lan: !!o.lan, t: g.t,
      see: 0.25 + 0.75 * Math.min(1, vis), op: Math.min(1, vis * 1.2),
    });
  }
  for (const [id, F] of FBR) if (!used.has(id)) { F.root.visible = false; if (!all.some(o => o.id === id)) { fbDispose(F); FBR.delete(id); } }
}
function fpsFiguresHide() { for (const F of FBR.values()) F.root.visible = false; }

// your figure hides what's behind it among the flat things drawn over the 3D scene (other wreckers, the
// drowned, Verity), the same way a rock does
function fpsBodyOccluder() {
  if (!FB.fig || !FB.fig.root.visible || !GL3D.occ) return;
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
