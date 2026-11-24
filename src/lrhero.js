'use strict';
// The Lamp Road: the heroes' figures, their hands and weapons in first person, what they throw, what they set down and
// the flashes and smoke of a fight. Built from three.js's plain shapes with src/lrdress.js's lrBatch (each limb one
// mesh), in the crews' colours: the Lamplighters gold and sea blue, the Wreckers rust and tar. This file is the rig, the
// pools and the dispatch; each hero's own art is registered by its hero file (src/lrh_<id>.js), so a new hero needs no
// edit here:
//   lrDefHeroArt(id, { spec: { h, hipY, stride, spd }, model(team) -> a rig from lrhRig(id, team) with m.anim(m, pose,
//     dt) set, finished with m.finish() (or a ready { group, update(pose, dt), muzzle, height }), view(V) -> { muzzle,
//     anim(st, dt) } built into V = { g, root, st, mk(parent, x, y, z), B(node) -> { L, G } batches (lit, glowing),
//     flashSpr(col, s), lit, glow } (the materials), portraitY (how far below the top of the head the portrait looks,
//     0.25) })
//   lrDefProjArt(kind, (g, TC, add, team) => {})       build what's in flight into the group g (TC: the crew's colours)
//   lrDefZoneArt(kind, (g, TC, spr, team) => upd)       build a zone into g; upd(zone, dt, T) each frame (T: its age)
//   lrDefWallArt(kind, team => Object3D)                a wall kind, centred at its bottom middle, facing +-z
//   lrDefFx(kind, fn(o, X) | { init(X) -> s, spawn(o, X, s), update(dt, X, s) })   an event's effect; X the pools'
//     helpers: { sprite, rod, ring, burst, smoke, gy, later, TCol, pool(n, make), take(pool), K (every effect), root }
// Anything not registered is drawn plainly by src/lr3d.js (a capsule, a sphere, a ring).
//   lrHeroModel(heroId, team) -> { group, update(pose, dt), muzzle, height }   feet at the origin, facing -z
//   lrViewModel(heroId)       -> { group, update(st, dt), muzzle }             a child of the camera (which looks -z)
//   lrMuzzle(model)           -> THREE.Vector3   where a shot or a bolt leaves (world), for either of the above
//   lrProjMesh(kind, team)    -> Object3D (each points itself along its flight and trails)
//   lrWallMesh(team, kind)    -> Object3D
//   lrZoneMesh(kind, team)    -> { group, update(zone, dt) }
//   lrFx(scene)               -> { spawn(kind, o), update(dt) }   pooled: nothing is made after it starts
//   lrHeroPortrait(heroId, team) -> a data URL (a head-and-shoulders picture, rendered once and kept)
var LRH_ART = {}, LRH_PROJ = {}, LRH_ZONE = {}, LRH_WALL = {}, LRH_FX = {};
function lrDefHeroArt(id, a) { LRH_ART[id] = a; }
function lrDefProjArt(kind, fn) { LRH_PROJ[kind] = fn; }
function lrDefZoneArt(kind, fn) { LRH_ZONE[kind] = fn; }
function lrDefWallArt(kind, fn) { LRH_WALL[kind] = fn; }
function lrDefFx(kind, d) { LRH_FX[kind] = d; }

const LRHM = { pr: null, cache: {}, tex: {} };
const LRH_TEAM = [
  { main: 0xf2c14e, trim: 0x3d7fb8, deep: 0x2c5a86, cloth: 0x34628c, glow: 0xffd27a, flame: 0xffc060 },   // the Lamplighters
  { main: 0xc8463a, trim: 0x2a2522, deep: 0x8a2e26, cloth: 0x2a2522, glow: 0xff6a48, flame: 0xff7a40 },   // the Wreckers
];
const LRH_SKIN = 0xd8a888, LRH_IRON = 0x3c3e44, LRH_BRASS = 0xc89a40, LRH_WOOD = 0x5a3c24, LRH_LEATH = 0x5a3a22;

function lrhNode(parent, x, y, z, name) { const n = new THREE.Group(); n.position.set(x || 0, y || 0, z || 0); if (name) n.name = name; parent.add(n); return n; }
const lrhSm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lrhLerp = (a, b, f) => a + (b - a) * f;
const lrhClamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- two bones to a point ----------
// arm and fore are bones hanging down their own -y (fore at (0, -a, 0) in arm), arm.position the shoulder in its parent's
// space; T the target and pole (which way the elbow goes) in that space too
let LRH_V = null;
function lrhIK(arm, fore, T, pole, a, b) {
  if (!LRH_V) LRH_V = { d: new THREE.Vector3(), n: new THREE.Vector3(), u: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(), q: new THREE.Quaternion(), dn: new THREE.Vector3(0, -1, 0), p: new THREE.Vector3() };
  const V = LRH_V, S = arm.position;
  V.d.copy(T).sub(S); let D = V.d.length();
  D = lrhClamp(D, Math.abs(a - b) + 1e-3, a + b - 1e-3); if (V.d.lengthSq() < 1e-9) V.d.set(0, -1, 0); V.d.normalize();
  const cA = lrhClamp((a * a + D * D - b * b) / (2 * a * D), -1, 1), sA = Math.sqrt(1 - cA * cA);
  V.p.copy(pole).normalize();
  V.n.copy(V.p).addScaledVector(V.d, -V.d.dot(V.p)); if (V.n.lengthSq() < 1e-6) V.n.set(0, 0, 1).addScaledVector(V.d, -V.d.z); V.n.normalize();
  V.u.copy(V.d).multiplyScalar(cA).addScaledVector(V.n, sA);
  arm.quaternion.setFromUnitVectors(V.dn, V.u);
  V.e.copy(S).addScaledVector(V.u, a);
  V.f.copy(S).addScaledVector(V.d, D).sub(V.e).normalize();
  V.q.copy(arm.quaternion).invert(); V.f.applyQuaternion(V.q);
  fore.quaternion.setFromUnitVectors(V.dn, V.f);
}

// ---------- a figure's rig ----------
function lrhRig(id, team) {
  const S = (LRH_ART[id] && LRH_ART[id].spec) || { h: 1.8, hipY: 0.95, stride: 1.7, spd: 5.5 }, TC = LRH_TEAM[team ? 1 : 0];
  const g = new THREE.Group(); g.name = 'lrHero:' + id;
  const lit = new THREE.MeshLambertMaterial({ vertexColors: true }), glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const body = lrhNode(g, 0, 0, 0, 'body'), hips = lrhNode(body, 0, S.hipY, 0, 'hips');
  const parts = new Map();
  const P = n => { let p = parts.get(n); if (!p) { p = { L: lrBatch(), G: lrBatch() }; parts.set(n, p); } return p; };
  const m = { id, team: team ? 1 : 0, TC, S, g, body, hips, lit, glow, P, parts, st: { ph: 0, run: 0, air: 0, last: 0 }, pose: {} };
  m.finish = () => {
    for (const [n, p] of parts) { const a = p.L.mesh(lit), b = p.G.mesh(glow); if (a) n.add(a); if (b) n.add(b); }
    parts.clear();
    return m;
  };
  return m;
}
// legs: from hip joints at (+-hx, 0, 0) of the hips, thigh a, shin b; each gets its own cloth, boot
function lrhLegs(m, hx, a, b, draw) {
  for (const s of [-1, 1]) {
    const leg = lrhNode(m.hips, s * hx, 0, 0), shin = lrhNode(leg, 0, -a, 0);
    draw(m.P(leg), m.P(shin), s, a, b);
    if (s < 0) { m.legL = leg; m.shinL = shin; } else { m.legR = leg; m.shinR = shin; }
  }
  m.legA = a; m.legB = b;
}
function lrhArms(m, sx, sy, sz, a, b, draw) {
  for (const s of [-1, 1]) {
    const arm = lrhNode(m.spine, s * sx, sy, sz), fore = lrhNode(arm, 0, -a, 0), hand = lrhNode(fore, 0, -b, 0);
    draw(m.P(arm), m.P(fore), m.P(hand), s, a, b);
    if (s < 0) { m.armL = arm; m.foreL = fore; m.handL = hand; } else { m.armR = arm; m.foreR = fore; m.handR = hand; }
  }
  m.armA = a; m.armB = b;
}


// ---------- what every figure does: walk, run, jump, fall, flinch, die ----------
function lrhBase(m, pose, dt) {
  const S = m.S, st = m.st, spd = pose.spd || 0, gnd = pose.gnd !== false;
  st.run += (lrhClamp(spd / S.spd, 0, 1.3) - st.run) * Math.min(1, dt * 10);
  st.air += ((gnd ? 0 : 1) - st.air) * Math.min(1, dt * 12);
  st.ph += dt * spd / S.stride * Math.PI * 2;
  const r = Math.min(1, st.run) * (1 - st.air), ph = st.ph;
  const sw = Math.sin(ph) * 0.72 * r;
  const up = (pose.vy || 0) > 0 ? 1 : 0.6;
  m.legL.rotation.set(lrhLerp(sw, 0.65 * up, st.air), 0, 0); m.legR.rotation.set(lrhLerp(-sw, -0.15, st.air), 0, 0);
  m.shinL.rotation.set(lrhLerp(-Math.max(0, Math.cos(ph)) * 1.1 * r - 0.04, -1.1 * up, st.air), 0, 0);
  m.shinR.rotation.set(lrhLerp(-Math.max(0, Math.cos(ph + Math.PI)) * 1.1 * r - 0.04, -0.55, st.air), 0, 0);
  m.hips.position.set(0, S.hipY + Math.abs(Math.sin(ph)) * 0.045 * r - 0.02 * r, 0);
  m.hips.rotation.set(0, Math.sin(ph) * 0.12 * r, 0);
  m.spine.rotation.set(-0.12 * r, -Math.sin(ph) * 0.1 * r, 0);
  m.head.rotation.set(0, 0, 0);
  m.body.rotation.set(0, 0, 0); m.body.position.set(0, 0, 0);
  // a hit: a flinch and a flash
  const hk = pose.hurt != null && pose.hurt >= 0 && pose.hurt < 0.3 ? 1 - pose.hurt / 0.3 : 0;
  m.spine.rotation.x += hk * 0.22; m.head.rotation.x += hk * 0.25;
  m.lit.emissive.setRGB(0.4 * hk, 0.08 * hk, 0.04 * hk);
  return { r, ph, hk };
}
function lrhDead(m, pose, dir) {
  if (!(pose.dead != null && pose.dead >= 0)) return 0;
  const f = lrhSm(0, 0.75, pose.dead), k = lrhSm(0, 0.3, pose.dead);
  m.legL.rotation.x = 0.3 * k; m.legR.rotation.x = -0.1 * k; m.shinL.rotation.x = -1.2 * k * (1 - f * 0.7); m.shinR.rotation.x = -0.9 * k * (1 - f * 0.6);
  m.hips.position.y = m.S.hipY - 0.25 * k * (1 - f);
  m.body.rotation.x = dir * 1.5 * f; m.body.position.y = 0.12 * f; m.body.position.z = -dir * 0.25 * f;
  m.spine.rotation.x = dir * 0.2 * f; m.head.rotation.x = dir * 0.4 * f;
  return f;
}
// sets both hands to targets (spine space) with elbows out and down
const LRH_POLE_L = typeof THREE !== 'undefined' ? new THREE.Vector3(-0.8, -0.8, 0.4) : null, LRH_POLE_R = typeof THREE !== 'undefined' ? new THREE.Vector3(0.8, -0.8, 0.4) : null;
function lrhHands(m, TL, TR, poleL, poleR) {
  if (TL) lrhIK(m.armL, m.foreL, TL, poleL || LRH_POLE_L, m.armA, m.armB);
  if (TR) lrhIK(m.armR, m.foreR, TR, poleR || LRH_POLE_R, m.armA, m.armB);
}
// a point given in a node's own space, in its parent's (the node's matrix brought up to date)
function lrhAt(node, x, y, z, out) { node.updateMatrix(); return out.set(x, y, z).applyMatrix4(node.matrix); }


function lrHeroModel(heroId, team) {
  const A = LRH_ART[heroId]; if (!A || !A.model) return null;
  const m = A.model(team); if (!m.g) return m;   // (a ready { group, update } as it is, else a rig with its anim)
  const api = {
    group: m.g, muzzle: m.muzzle, height: m.S.h, rig: m,
    update(pose, dt) { m.anim(m, pose || {}, Math.min(0.1, dt || 0)); },
  };
  api.update({ spd: 0, gnd: true, pitch: 0, act: {}, dead: -1, hurt: -1 }, 0.016);
  return api;
}
// where a shot leaves from (world): the muzzle of the piece, the lantern on the staff, the end of the capstan bar
function lrMuzzle(model, out) {
  out = out || new THREE.Vector3();
  const mz = model && (model.muzzle || (model.rig && model.rig.muzzle));
  if (!mz) return model && model.group ? model.group.getWorldPosition(out) : out.set(0, 0, 0);
  mz.updateWorldMatrix(true, false);
  return mz.getWorldPosition(out);
}

// ---------- first person ----------
// The hands and the weapon, a child of the camera (which looks down -z): resting low on the right. Small and close (within
// 0.7 m of the eye), so the camera's near plane should be 0.05 or less.
function lrViewModel(heroId) {
  const g = new THREE.Group(); g.name = 'lrView:' + heroId;
  const lit = new THREE.MeshLambertMaterial({ vertexColors: true }), glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const root = lrhNode(g, 0, 0, 0), st = { ph: 0, run: 0, sw: 0, t: 0, lastFire: 9, sweepSide: 1 };
  const mk = (parent, x, y, z) => { const n = lrhNode(parent, x, y, z); return n; };
  const fin = [];
  const B = n => { const o = { n, L: lrBatch(), G: lrBatch() }; fin.push(o); return o; };
  const done = () => { for (const o of fin) { const a = o.L.mesh(lit), b = o.G.mesh(glow); if (a) { a.frustumCulled = false; o.n.add(a); } if (b) { b.frustumCulled = false; o.n.add(b); } } };
  let muzzle, anim;
  const flashSpr = (col, s) => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); f.scale.setScalar(s); return f; };
  const A = LRH_ART[heroId]; if (!A || !A.view) return null;
  ({ muzzle, anim } = A.view({ g, root, st, mk, B, flashSpr, lit, glow }));
  done();
  const api = {
    group: g, muzzle,
    update(s, dt) {
      s = s || {}; dt = Math.min(0.1, dt || 0);
      const spd = s.spd || 0; st.run = lrhLerp(st.run, s.gnd === false ? 0 : Math.min(1, spd / 6), Math.min(1, dt * 8)); st.ph += dt * spd * 1.9;
      root.position.set(Math.sin(st.ph) * 0.012 * st.run, -Math.abs(Math.cos(st.ph)) * 0.014 * st.run + (s.gnd === false ? 0.01 : 0), 0);
      root.rotation.set(0, 0, Math.sin(st.ph) * 0.015 * st.run);
      anim(s, dt);
    },
  };
  api.update({}, 0.016);
  return api;
}

// ---------- projectiles ----------
// each turns itself along the way it's going (from where it was the frame before) and keeps a short trail
function lrhTrailer(g, head, n, mat, step) {
  const pts = [], trail = [];
  for (let k = 0; k < n; k++) { const s = new THREE.Sprite(mat.clone()); s.visible = false; g.add(s); trail.push(s); }
  const v = new THREE.Vector3(), w = new THREE.Vector3(), inv = new THREE.Matrix4();
  let last = null;
  head.onBeforeRender = () => {
    g.updateWorldMatrix(true, false); v.setFromMatrixPosition(g.matrixWorld);
    if (last && v.distanceToSquared(last) > 1e-6) {
      w.copy(v).sub(last).normalize();
      if (g.userData.point !== false) { const p = g.parent; g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), w); if (p) { const q = new THREE.Quaternion(); p.getWorldQuaternion(q); g.quaternion.premultiply(q.invert()); } g.updateMatrixWorld(true); }
    }
    if (!last || v.distanceToSquared(last) > (step || 0.3) * (step || 0.3)) { pts.unshift(v.clone()); if (pts.length > n) pts.pop(); last = last || new THREE.Vector3(); last.copy(v); }
    inv.copy(g.matrixWorld).invert();
    for (let k = 0; k < n; k++) { const s = trail[k]; if (k < pts.length) { s.visible = true; s.position.copy(pts[k]).applyMatrix4(inv); s.material.opacity = (1 - k / n) * 0.5; s.updateMatrixWorld(); } else s.visible = false; }
  };
}
function lrProjMesh(kind, team) {
  const TC = LRH_TEAM[team ? 1 : 0], g = new THREE.Group(); g.name = 'lrProj:' + kind;
  const add = (o) => { g.add(o); return o; };
  const f = LRH_PROJ[kind]; if (!f) return null;
  f(g, TC, add, team);
  return g;
}

// ---------- walls ----------
// the art of a wall kind registered with lrDefWallArt (Bollard's bulkhead by default)
function lrWallMesh(team, kind) { const f = LRH_WALL[kind || 'bulkhead']; return f ? f(team) : null; }

// ---------- zones ----------
function lrhRingMesh(r0, r1, col, op) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48, 1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.05; return m;
}
function lrhStripeTex() {
  if (LRHM.tex.stripe) return LRHM.tex.stripe;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff';
  for (let k = -64; k < 128; k += 32) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 16, 0); x.lineTo(k + 16 + 64, 64); x.lineTo(k + 64, 64); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (LRHM.tex.stripe = t);
}
function lrZoneMesh(kind, team) {
  const TC = LRH_TEAM[team ? 1 : 0], g = new THREE.Group(); g.name = 'lrZone:' + kind;
  const spr = (col, s, op, add) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: col, transparent: true, opacity: op, blending: add === false ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false })); o.scale.setScalar(s); g.add(o); return o; };
  let T = 0;
  const place = z => { if (z.x != null) g.position.x = z.x; if (z.z != null) g.position.z = z.z; g.position.y = z.y != null ? z.y : (typeof lrGround === 'function' && z.x != null ? lrGround(z.x, z.z) : g.position.y); };
  const upd = (LRH_ZONE[kind] || (() => null))(g, TC, spr, team); if (!upd) return null;
  return { group: g, update(z, dt) { z = z || {}; T += dt || 0; place(z); upd(z, dt || 0, T); } };
}

// ---------- effects ----------
// Pools made once: glow sprites (sparks, smoke, flashes), rods (tracers, healing beams, blink trails), flat rings, the
// sweep's arc, the wave's sector, light columns. A spawn takes the oldest free one; nothing is added to the scene later.
function lrFx(scene) {
  const root = new THREE.Group(); root.name = 'lrFx'; scene.add(root);
  const tex = lrGlowTex(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const pool = (n, make) => { const a = []; for (let k = 0; k < n; k++) { const o = make(k); o.obj.visible = false; root.add(o.obj); o.life = 0; o.max = 1; a.push(o); } return a; };
  const take = a => { let best = a[0]; for (const o of a) { if (o.life <= 0) return o; if (o.life < best.life) best = o; } return best; };
  const SP = pool(160, () => ({ obj: new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), v: new THREE.Vector3() }));
  const rodG = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); rodG.translate(0, 0.5, 0);
  const RD = pool(40, () => ({ obj: new THREE.Mesh(rodG, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  const ringG = new THREE.RingGeometry(0.85, 1, 48, 1); ringG.rotateX(-Math.PI / 2);
  const RG = pool(24, () => ({ obj: new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  const colG = new THREE.CylinderGeometry(0.7, 0.9, 1, 16, 1, true); colG.translate(0, 0.5, 0);
  { const p = colG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const f = 1 - p.getY(i); c.push(f, f, f); } colG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const CL = pool(6, () => ({ obj: new THREE.Mesh(colG, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })) }));
  const later = [];   // things set to happen after a moment: [time left, fn]
  const TCol = t => LRH_TEAM[t ? 1 : 0];

  // a glow sprite: at p, colour, size s (grows by grow a second), life, velocity, gravity, normal (smoke) or additive
  const sprite = (x, y, z, col, s, life, vx, vy, vz, grow, grav, smoke) => {
    const o = take(SP), m = o.obj.material;
    o.obj.position.set(x, y, z); o.obj.scale.setScalar(s); o.obj.visible = true;
    m.color.setHex(col); m.opacity = smoke ? 0.55 : 1; m.blending = smoke ? THREE.NormalBlending : THREE.AdditiveBlending; m.rotation = Math.random() * 6;
    o.v.set(vx || 0, vy || 0, vz || 0); o.s = s; o.grow = grow || 0; o.grav = grav || 0; o.life = o.max = life; o.op = m.opacity; o.beam = false;
    return o;
  };
  const rod = (x, y, z, x2, y2, z2, r, col, life, op, beam) => {
    const o = take(RD); V.set(x2 - x, y2 - y, z2 - z); const L = V.length() || 1e-3;
    o.obj.position.set(x, y, z); Q.setFromUnitVectors(UP, V.multiplyScalar(1 / L)); o.obj.quaternion.copy(Q); o.obj.scale.set(r, L, r);
    o.obj.material.color.setHex(col); o.obj.material.opacity = op; o.op = op; o.obj.visible = true; o.life = o.max = life; o.r = r; o.beam = !!beam; o.drawn = false;
    if (beam) o.obj.onAfterRender = () => { o.drawn = true; }; else o.obj.onAfterRender = () => {};
    return o;
  };
  const ring = (x, y, z, r0, r1, col, life, op) => { const o = take(RG); o.obj.position.set(x, y, z); o.obj.scale.setScalar(r0); o.obj.material.color.setHex(col); o.obj.material.opacity = op; o.op = op; o.r0 = r0; o.r1 = r1; o.obj.visible = true; o.life = o.max = life; return o; };
  const burst = (x, y, z, col, n, sp, s, life, up) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, e = Math.random() * 2 - 1, q = Math.sqrt(1 - e * e); sprite(x, y, z, col, s * (0.6 + Math.random() * 0.6), life * (0.6 + Math.random() * 0.6), Math.cos(a) * q * sp, e * sp + (up || 0), Math.sin(a) * q * sp, -s / life * 0.5, 9); } };
  const smoke = (x, y, z, n, s, life, col) => { for (let k = 0; k < n; k++) sprite(x + (Math.random() - 0.5) * s, y + Math.random() * s * 0.5, z + (Math.random() - 0.5) * s, col || 0x3a3430, s * (0.6 + Math.random() * 0.5), life * (0.7 + Math.random() * 0.5), (Math.random() - 0.5) * 0.8, 0.8 + Math.random(), (Math.random() - 0.5) * 0.8, s * 0.9, 0, true); };
  const gy = (x, z) => typeof lrGround === 'function' ? lrGround(x, z) : 0;

  const K = {
    tracer(o) { const c = TCol(o.team); rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.025, c.glow, 0.09, 0.9); rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.008, 0xfff8e0, 0.06, 1); sprite(o.x, o.y, o.z, 0xffd080, 0.5, 0.06); },
    hit(o) { burst(o.x, o.y, o.z, 0xffd090, 7, 3.5, 0.18, 0.25); sprite(o.x, o.y, o.z, 0xfff0c0, 0.6, 0.08); smoke(o.x, o.y, o.z, 1, 0.3, 0.5, 0x5a5450); },
    heal(o) { for (let k = 0; k < 6; k++) sprite(o.x + (Math.random() - 0.5) * 0.8, o.y + Math.random() * 0.6, o.z + (Math.random() - 0.5) * 0.8, k % 2 ? 0xffe08a : 0xb8ff9a, 0.22, 0.8, 0, 1.4 + Math.random(), 0, -0.1); ring(o.x, (o.y || 0) - 0.8 + 0.06, o.z, 0.4, 1.2, 0xffe08a, 0.5, 0.5); },
    beam(o) { const b = rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.07, 0xffd27a, 0.25, 0.55, true); const c = rod(o.x, o.y, o.z, o.x2, o.y2, o.z2, 0.022, 0xfff8e0, 0.25, 0.9, true); void b; void c; if (Math.random() < 0.5) sprite(o.x2, o.y2, o.z2, 0xffe08a, 0.5, 0.15, 0, 0.6, 0); },
    blast(o) { const r = o.r || 3; sprite(o.x, o.y, o.z, 0xffe0a0, r * 1.2, 0.15, 0, 0, 0, r * 6); burst(o.x, o.y, o.z, 0xff9a40, 12, r * 2.5, 0.4, 0.5, 2); smoke(o.x, o.y, o.z, 6, r * 0.6, 1.4); ring(o.x, gy(o.x, o.z) + 0.08, o.z, 0.3, r * 1.2, 0xffb060, 0.4, 0.7); },
    death(o) { const c = TCol(o.team); smoke(o.x, o.y + 0.6, o.z, 6, 0.9, 1.6, 0x3a3634); burst(o.x, o.y + 1, o.z, c.glow, 12, 3, 0.25, 0.7, 1.5); ring(o.x, gy(o.x, o.z) + 0.06, o.z, 0.3, 2.2, c.main, 0.6, 0.6); },
    // the statuses every hero may give: stars round the head (stunned), a snare of ropes on the ground (rooted)
    stun(o) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; sprite(o.x + Math.cos(a) * 0.45, o.y + 0.25, o.z + Math.sin(a) * 0.45, 0xffe070, 0.3, Math.min(1.5, o.t || 1), -Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4); } sprite(o.x, o.y + 0.2, o.z, 0xfff4c0, 0.9, 0.2); },
    root(o) { const y = gy(o.x, o.z) + 0.06; ring(o.x, y, o.z, 0.3, 1.1, 0x9fd0ff, Math.min(1.2, o.t || 1), 0.8); ring(o.x, y, o.z, 1.4, 0.6, 0x6a8aa0, 0.5, 0.6); },
    spawn(o) { const c = TCol(o.team), cl = take(CL); cl.obj.position.set(o.x, o.y || 0, o.z); cl.obj.scale.set(1, 3.2, 1); cl.obj.material.color.setHex(c.glow); cl.obj.material.opacity = 0.8; cl.obj.visible = true; cl.life = cl.max = 0.8; burst(o.x, (o.y || 0) + 1, o.z, c.glow, 10, 1.5, 0.2, 0.8, 1.5); ring(o.x, (o.y || 0) + 0.06, o.z, 0.4, 1.6, c.main, 0.6, 0.8); },
  };
  // the effects the hero files registered (lrDefFx): their pools made now, their spawns among the rest
  const X = { root, tex, pool, take, sprite, rod, ring, burst, smoke, gy, later, TCol, K }, ups = [];
  for (const k in LRH_FX) { const d = LRH_FX[k]; if (typeof d === 'function') K[k] = o => d(o, X); else { const s = d.init ? d.init(X) : null; if (d.spawn) K[k] = o => d.spawn(o, X, s); if (d.update) ups.push(dt => d.update(dt, X, s)); } }
  return {
    root,
    spawn(kind, o) { const f = K[kind]; if (f && o) f(o); },
    update(dt) {
      dt = Math.min(0.1, dt || 0);
      for (let i = later.length - 1; i >= 0; i--) { later[i][0] -= dt; if (later[i][0] <= 0) { const f = later[i][1]; later.splice(i, 1); f(); } }
      for (const o of SP) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = o.life / o.max; o.v.y -= o.grav * dt; o.obj.position.addScaledVector(o.v, dt); o.s = Math.max(0.01, o.s + o.grow * dt); o.obj.scale.setScalar(o.s); o.obj.material.opacity = o.op * Math.min(1, f * 2); }
      for (const o of RD) { if (o.life <= 0) continue; o.life -= dt; if (o.beam ? o.drawn : o.life <= 0) { o.life = 0; o.obj.visible = false; continue; } if (o.life <= 0) { o.obj.visible = false; continue; } if (!o.beam) { const f = o.life / o.max; o.obj.material.opacity = o.op * f; o.obj.scale.x = o.obj.scale.z = o.r * (0.5 + f * 0.5); } }
      for (const o of RG) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max; o.obj.scale.setScalar(o.r0 + (o.r1 - o.r0) * Math.sqrt(f)); o.obj.material.opacity = o.op * (1 - f); }
      for (const u of ups) u(dt);
      for (const o of CL) { if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) { o.obj.visible = false; continue; } const f = 1 - o.life / o.max; o.obj.scale.set(1 - f * 0.6, 3.2 + f * 2, 1 - f * 0.6); o.obj.material.opacity = 0.8 * (1 - f); }
    },
  };
}

// ---------- portraits ----------
function lrHeroPortrait(heroId, team) {
  const key = heroId + (team ? 1 : 0);
  if (LRHM.cache[key]) return LRHM.cache[key];
  let url = '';
  try {
    if (!LRHM.pr) {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setClearColor(0x000000, 0);
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xc8d0f0, 0x5a4a40, 1.0));
      const k = new THREE.DirectionalLight(0xffd0a0, 0.9); k.position.set(-1, 1.2, -1.5); sc.add(k);
      const rim = new THREE.DirectionalLight(0x8aa8ff, 0.6); rim.position.set(1.5, 0.5, 1); sc.add(rim);
      LRHM.pr = { c, r, sc, cam: new THREE.PerspectiveCamera(30, 1, 0.05, 20) };
    }
    const P = LRHM.pr, TC = LRH_TEAM[team ? 1 : 0];
    const m = lrHeroModel(heroId, team); if (!m) throw new Error('no art for ' + heroId); m.update({ spd: 0, gnd: true, pitch: 0.05, act: {}, dead: -1, hurt: -1 }, 0.016);
    m.group.rotation.y = 0.45; P.sc.add(m.group);
    const h = m.height, hy = h - ((LRH_ART[heroId] && LRH_ART[heroId].portraitY) || 0.25);
    P.cam.position.set(-0.55 * h / 1.8, hy + 0.05, -1.75 * h / 1.8); P.cam.lookAt(0, hy - 0.12 * h / 1.8, 0);
    P.r.setClearColor(TC.deep, 1);
    P.r.render(P.sc, P.cam);
    // a ring in the crew's colour round it
    const out = document.createElement('canvas'); out.width = out.height = 160; const x = out.getContext('2d');
    x.drawImage(P.c, 0, 0);
    const gr = x.createRadialGradient(80, 80, 50, 80, 80, 80); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)'); x.fillStyle = gr; x.fillRect(0, 0, 160, 160);
    x.lineWidth = 8; x.strokeStyle = '#' + TC.main.toString(16).padStart(6, '0'); x.strokeRect(4, 4, 152, 152);
    url = out.toDataURL('image/png');
    P.sc.remove(m.group);
    m.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } else if (o.isSprite) o.material.dispose(); });
  } catch (e) {
    // no WebGL: a drawn badge
    const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), TC = LRH_TEAM[team ? 1 : 0];
    x.fillStyle = '#' + TC.deep.toString(16).padStart(6, '0'); x.fillRect(0, 0, 160, 160);
    x.fillStyle = '#' + TC.main.toString(16).padStart(6, '0'); x.font = 'bold 90px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((heroId || '?')[0].toUpperCase(), 80, 86);
    url = c.toDataURL('image/png');
  }
  return (LRHM.cache[key] = url);
}
