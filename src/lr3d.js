'use strict';
// The Lamp Road in 3D (three.js, its own canvas #lrCv): Gullhaven, the Lamp Wain, the ten players, the bulkheads,
// the pools of tar, the hung lanterns, the beacons and the broadsides, everything in flight, the effects, and the
// first-person camera with your hero's hands and weapon in front of it. src/lr.js owns the state (LRM); this only
// reads it, every frame, between the sim's ticks (bodies are drawn part way from where they were at the last tick
// to where they are now, LRM.alpha, so the motion is smooth at any frame rate).
//
// The art comes from src/lrdress.js (lrDressMap, lrWainModel, lrLightOn) and src/lrhero.js (lrHeroModel,
// lrViewModel, lrProjMesh, lrWallMesh, lrZoneMesh, lrFx), each used only if it's there (typeof checks), with plain
// shapes in its place when it isn't: the map's boxes coloured by kind and its ramps as slopes, the players as capsules
// in their side's colours with a head, the Wain as a box with a glowing lens, the projectiles as small spheres, the
// bulkheads as flat iron slabs, the zones as rings and discs, and the effects as sprites and lines.
// One-off events come from LRM.FX, each handled once (by id): its sound (lrFxSound in src/lr.js) and its effect.

var LR3 = { ok: false, r: null, scene: null, cam: null, dress: null, wain: null, models: [], view: null, viewHero: '', proj: new Map(), walls: new Map(), zones: new Map(), fx: null, ffx: [], beams: [], fxSeen: 0, eyeY: null, zoom: 1, shake: 0, lit: false, tex: {}, mats: {}, fall: null, t: 0 };
const lr3v = (x, y, z) => new THREE.Vector3(x, y, z);
function lr3Mat(hex, o) {
  const k = hex + (o ? JSON.stringify(o) : ''); if (LR3.mats[k]) return LR3.mats[k];
  const m = o && o.basic ? new THREE.MeshBasicMaterial({ color: hex }) : new THREE.MeshLambertMaterial({ color: hex });
  if (o) { if (o.em != null) m.emissive = new THREE.Color(o.em); if (o.op != null) { m.transparent = true; m.opacity = o.op; m.depthWrite = false; } if (o.add) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; } if (o.ds) m.side = THREE.DoubleSide; }
  return (LR3.mats[k] = m);
}
function lr3Soft() {
  if (LR3.tex.soft) return LR3.tex.soft;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (LR3.tex.soft = new THREE.CanvasTexture(c));
}
function lr3Glow(col, s, op) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: lr3Soft(), color: col, transparent: true, opacity: op == null ? 0.9 : op, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(s); return m; }
function lr3Mesh(geo, mat, x, y, z, par) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (par) par.add(m); return m; }

function lr3dInit() {
  if (LR3.ok) return true;
  if (typeof THREE === 'undefined') return false;
  const cv = $('lrCv'); if (!cv) return false;
  const dpr = window.devicePixelRatio || 1, lite = (typeof pwSaver === 'function' && pwSaver()) || (matchMedia && matchMedia('(pointer: coarse)').matches);
  try { LR3.r = new THREE.WebGLRenderer({ canvas: cv, antialias: !lite, powerPreference: 'high-performance' }); } catch (e) { return false; }
  LR3.r.setPixelRatio(Math.min(lite ? 1 : 1.5, dpr));
  const S = LR3.scene = new THREE.Scene();
  LR3.cam = new THREE.PerspectiveCamera(70, 1, 0.05, 900); LR3.cam.rotation.order = 'YXZ'; S.add(LR3.cam);
  if (typeof lrDressMap === 'function') { try { LR3.dress = lrDressMap(S, LR3.r); } catch (e) { console.error(e); LR3.dress = null; } }
  if (!LR3.dress) lr3dFallbackMap(S);
  if (typeof lrWainModel === 'function') { try { LR3.wain = lrWainModel(); } catch (e) { console.error(e); LR3.wain = null; } }
  if (!LR3.wain) LR3.wain = lr3dFallbackWain();
  S.add(LR3.wain.group);
  if (typeof lrFx === 'function') { try { LR3.fx = lrFx(S); } catch (e) { console.error(e); LR3.fx = null; } }
  LR3.ok = true; lr3dResize();
  addEventListener('resize', () => { if (LRM.on) lr3dResize(); });
  return true;
}
function lr3dResize() { if (!LR3.r) return; const w = innerWidth, h = innerHeight; LR3.r.setSize(w, h, false); LR3.cam.aspect = w / h; LR3.cam.updateProjectionMatrix(); }
// a new match: every player's model, the projectiles, the bulkheads and zones made again as they come
function lr3dMatch() {
  if (!LR3.ok) return;
  for (const m of LR3.models) if (m) LR3.scene.remove(m.m.group);
  LR3.models = [];
  for (const M of [LR3.proj, LR3.walls, LR3.zones]) { for (const v of M.values()) LR3.scene.remove(v.group || v); M.clear(); }
  for (const f of LR3.ffx) LR3.scene.remove(f.o); LR3.ffx = [];
  for (const b of LR3.beams) if (b) LR3.scene.remove(b); LR3.beams = [];
  LR3.fxSeen = 0; LR3.eyeY = null; LR3.lit = false; LR3.shake = 0;
  if (LR3.fall && LR3.fall.lamp) { LR3.fall.lamp.material = lr3Mat(0x3a3a3a); LR3.fall.glow.visible = false; }
}

// ---------- plain shapes, when the art isn't there ----------
const LR3_KIND = { wall: 0x6f6a64, house: 0xa08a70, shed: 0x7b6248, crate: 0x8b6a3e, stall: 0xb24a3a, hulk: 0x4a3a2c, rock: 0x6d6f6a, tower: 0xe8e2d4, spawn: 0x4a6a8a };
function lr3dFallbackMap(S) {
  const F = LR3.fall = {};
  S.background = lr3dSky();
  S.fog = new THREE.Fog(0x4a4c66, 80, 340);
  S.add(new THREE.HemisphereLight(0xbcc8ec, 0x3a3028, 0.95));
  const sun = new THREE.DirectionalLight(0xffc08a, 0.9); sun.position.set(-200, 70, 60); S.add(sun);
  const fill = new THREE.DirectionalLight(0x7a90c8, 0.35); fill.position.set(150, 90, -100); S.add(fill);
  const B = LR_MAP.bounds;
  const sea = lr3Mesh(new THREE.PlaneGeometry(1600, 1600), lr3Mat(0x1d3a52), 0, -0.8, 0, S); sea.rotation.x = -Math.PI / 2;
  const gnd = lr3Mesh(new THREE.PlaneGeometry(B.x1 - B.x0 + 10, B.z1 - B.z0 + 10), lr3Mat(0x5d5650), (B.x0 + B.x1) / 2, 0, (B.z0 + B.z1) / 2, S); gnd.rotation.x = -Math.PI / 2;
  // the Wain's road, darker, with the checkpoints across it in gold
  const P = LR_MAP.path, road = lr3Mat(0x3e3a36);
  for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], l = Math.hypot(bx - ax, bz - az), m = lr3Mesh(new THREE.PlaneGeometry(3.2, l + 3.2), road, (ax + bx) / 2, 0.02, (az + bz) / 2, S); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, Math.atan2(-(bx - ax), -(bz - az)), 0); }
  for (const c of LR_MAP.cps) { const a = lrPathAt(c * lrPathLen()), m = lr3Mesh(new THREE.BoxGeometry(5, 0.08, 0.5), lr3Mat(0xf2c14e, { em: 0x6a4a10 }), a.x, 0.05, a.z, S); m.rotation.y = a.yaw; }
  const edge = new THREE.LineBasicMaterial({ color: 0x1a1612, transparent: true, opacity: 0.5 });
  for (const b of LR_MAP.boxes) {
    const w = b[3] - b[0], h = b[4] - b[1], d = b[5] - b[2], cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
    if (b[6] === 'tower') {
      const t = lr3Mesh(new THREE.CylinderGeometry(3.6, 4.8, h, 16), lr3Mat(0xe8e2d4), cx, cy, cz, S);
      lr3Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.6, 16), lr3Mat(0x2a2a2a), cx, b[4] + 0.3, cz, S);
      F.lamp = lr3Mesh(new THREE.SphereGeometry(2, 14, 10), lr3Mat(0x3a3a3a), cx, b[4] + 2.4, cz, S);
      F.glow = lr3Glow(0xffe2a0, 40, 0.9); F.glow.position.set(cx, b[4] + 2.4, cz); F.glow.visible = false; S.add(F.glow);
      lr3Mesh(new THREE.ConeGeometry(3.4, 2.4, 16), lr3Mat(0x8a2a22), cx, b[4] + 5, cz, S); continue;
    }
    const geo = new THREE.BoxGeometry(w, h, d), m = lr3Mesh(geo, lr3Mat(LR3_KIND[b[6]] || 0x888888), cx, cy, cz, S);
    if (b[6] === 'house' || b[6] === 'shed') { const roof = lr3Mesh(new THREE.BoxGeometry(w + 0.6, 0.35, d + 0.6), lr3Mat(b[6] === 'house' ? 0x6a3a30 : 0x4a4a52), cx, b[4] + 0.17, cz, S); roof.userData.k = 'roof'; }
    if (b[6] !== 'wall') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge); e.position.copy(m.position); S.add(e); }
  }
  for (const r of LR_MAP.ramps) S.add(lr3dWedge(r));
  // a few lamps along the quay, so the streets read in the evening
  for (const [x, z] of [[-70, -2], [-40, 6], [-15, 8], [8, 6], [30, -6], [62, -6], [78, -4]]) { lr3Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), lr3Mat(0x222222), x, 1.7, z, S); const g = lr3Glow(0xffcf80, 2.4, 0.85); g.position.set(x, 3.5, z); S.add(g); }
}
function lr3dSky() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#151c36'); g.addColorStop(0.45, '#3c3f66'); g.addColorStop(0.72, '#9a6a78'); g.addColorStop(0.88, '#e89c6a'); g.addColorStop(1, '#ffd29a');
  x.fillStyle = g; x.fillRect(0, 0, 8, 256); return new THREE.CanvasTexture(c);
}
// a ramp as a slope: its top from h0 to h1 along its axis, down to the ground on every side
function lr3dWedge(r) {
  const [x0, z0, x1, z1, h0, h1, ax] = r, H = (x, z) => lrRampH(r, x, z);
  const top = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [x, H(x, z), z]), bot = top.map(([x, , z]) => [x, 0, z]), v = [];
  const quad = (a, b, c, d) => v.push(...a, ...b, ...c, ...a, ...c, ...d);
  quad(top[0], top[3], top[2], top[1]); quad(bot[0], bot[1], bot[2], bot[3]);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(bot[i], top[i], top[j], bot[j]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x8a7a66, side: THREE.DoubleSide })); m.userData.ax = ax; return m;
}
function lr3dFallbackWain() {
  const g = new THREE.Group(), iron = lr3Mat(0x3a3a40), brass = lr3Mat(0xb08a3a, { em: 0x2a1a00 });
  lr3Mesh(new THREE.BoxGeometry(2.0, 0.6, 3.2), iron, 0, 0.75, 0, g);
  lr3Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), brass, 0, 1.3, 0, g);
  const wheels = [];
  for (const [x, z] of [[-1.05, -1.1], [1.05, -1.1], [-1.05, 1.1], [1.05, 1.1]]) { const w = lr3Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12), lr3Mat(0x2a2420), x, 0.5, z, g); w.rotation.z = Math.PI / 2; wheels.push(w); }
  const lens = lr3Mesh(new THREE.SphereGeometry(0.6, 18, 14), lr3Mat(0xd8c890, { em: 0x8a6420 }), 0, 2.0, 0, g);
  const glow = lr3Glow(0xffd88a, 3.2, 0.5); glow.position.set(0, 2.0, 0); g.add(glow);
  const light = new THREE.PointLight(0xffc870, 1.2, 18); light.position.set(0, 2.4, 0); g.add(light);
  return { group: g, update(cart, dt) {
    for (const w of wheels) w.rotation.x = -(cart.s || 0) / 0.5;
    const col = cart.st === 'contest' ? 0xff6a50 : cart.st === 'push' ? 0xffe2a0 : cart.st === 'back' ? 0x9aa8d0 : 0xffd88a;
    glow.material.color.setHex(col); glow.material.opacity = cart.st === 'push' ? 0.6 : 0.4; light.intensity = cart.st === 'push' ? 1.6 : 1; lens.material.emissive.setHex(cart.st === 'contest' ? 0x902a20 : cart.st === 'push' ? 0xb08a30 : 0x8a6420);
  } };
}
function lr3dFallbackHero(hero, team) {
  const H = LR_HEROES[hero] || LR_HEROES.razorbill, T = LR_TEAMS[team], g = new THREE.Group(), r = H.r, h = H.h, hr = Math.max(0.22, r * 0.55);
  const main = lr3Mat(T.hex), trim = lr3Mat(T.hex2), skin = lr3Mat(0xd9b48f), dark = lr3Mat(0x222222);
  const body = new THREE.Group(); g.add(body);
  const legL = lr3Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.24, h * 0.42, 6), trim, -r * 0.4, h * 0.21, 0, body), legR = lr3Mesh(legL.geometry, trim, r * 0.4, h * 0.21, 0, body);
  lr3Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.9, h * 0.42, 10), main, 0, h * 0.62, 0, body);
  lr3Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, h * 0.07, 10), trim, 0, h * 0.7, 0, body);
  const head = lr3Mesh(new THREE.SphereGeometry(hr, 12, 10), hero === 'bollard' ? lr3Mat(0xb08a3a) : skin, 0, h - hr, 0, body);
  lr3Mesh(new THREE.BoxGeometry(hr * 1.1, hr * 0.35, hr * 0.4), hero === 'bollard' ? lr3Mat(0x203040, { em: 0x101820 }) : dark, 0, h - hr * 0.9, -hr * 0.85, body);
  if (hero === 'razorbill') { const hat = lr3Mesh(new THREE.ConeGeometry(hr * 1.5, hr * 0.8, 3), dark, 0, h - hr * 0.1, 0, body); hat.rotation.y = Math.PI; }
  if (hero === 'linnet') lr3Mesh(new THREE.SphereGeometry(hr * 1.02, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), trim, 0, h - hr * 0.95, 0, body);
  const arm = new THREE.Group(); arm.position.set(r * 0.85, h * 0.72, 0); body.add(arm);
  if (hero === 'bollard') { const bar = lr3Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6), lr3Mat(0x5a4a3a), 0, -0.3, -0.6, arm); bar.rotation.x = Math.PI / 2.4; }
  else if (hero === 'razorbill') { const gun = lr3Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.5), lr3Mat(0x3a2a1a), -0.2, -0.05, -0.6, arm); }
  else { lr3Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6), lr3Mat(0x2a2a2a), 0, 0, -0.2, arm); const lan = lr3Mesh(new THREE.SphereGeometry(0.14, 8, 6), lr3Mat(0xffe0a0, { em: 0xffb040 }), 0, 0.9, -0.2, arm); const gl = lr3Glow(0xffd080, 1.2, 0.8); gl.position.copy(lan.position); arm.add(gl); }
  const ring = lr3Mesh(new THREE.RingGeometry(r + 0.05, r + 0.22, 20), lr3Mat(T.hex, { basic: true, op: 0.7, ds: true }), 0, 0.03, 0, g); ring.rotation.x = -Math.PI / 2;
  let ph = 0;
  return { group: g, update(pose, dt) {
    ph += dt * pose.spd * 2.2; const sw = pose.gnd ? Math.sin(ph) * Math.min(0.7, pose.spd * 0.12) : 0.3;
    legL.rotation.x = sw; legR.rotation.x = -sw; arm.rotation.x = -pose.pitch * 0.8 + (pose.fire < 0.2 ? 0.25 * (1 - pose.fire / 0.2) : 0);
    if (pose.dead >= 0) { body.rotation.x = -Math.min(1, pose.dead * 3) * Math.PI / 2; g.visible = pose.dead < 3; ring.visible = false; } else { body.rotation.x = 0; g.visible = true; ring.visible = true; }
    head.scale.setScalar(pose.hurt < 0.12 ? 1.12 : 1);
  } };
}
function lr3dFallbackView(hero) {
  const g = new THREE.Group(), iron = lr3Mat(0x4a4a52), wood = lr3Mat(0x5a3a22), brass = lr3Mat(0xb08a3a);
  if (hero === 'bollard') { lr3Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.2), iron, 0.32, -0.32, -0.5, g); lr3Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.2), iron, -0.3, -0.34, -0.5, g); const b = lr3Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), wood, 0.1, -0.2, -0.75, g); b.rotation.set(1.2, 0, -0.7); }
  else if (hero === 'razorbill') { const br = lr3Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.0, 8), iron, 0.19, -0.17, -0.85, g); br.rotation.x = Math.PI / 2; lr3Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.5), wood, 0.19, -0.2, -0.38, g); lr3Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), brass, 0.19, -0.135, -0.62, g).rotation.x = Math.PI / 2; }
  else { const s = lr3Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), iron, 0.32, -0.35, -0.7, g); s.rotation.x = 1.25; const l = lr3Mesh(new THREE.SphereGeometry(0.035, 10, 8), lr3Mat(0xfff0c0, { em: 0xffb040 }), 0.34, -0.2, -1.25, g); const gl = lr3Glow(0xffd080, 0.2, 0.6); gl.position.copy(l.position); g.add(gl); }
  const base = g.position.clone();
  return { group: g, update(st, dt) {
    const k = st.fire < 0.12 ? 1 - st.fire / 0.12 : 0, bob = st.gnd ? Math.sin(LR3.t * 9) * 0.012 * Math.min(1, st.spd / 5) : 0;
    g.position.set(base.x + (hero === 'razorbill' && st.alt ? -0.2 : 0), base.y + bob + (st.reload > 0 ? -0.15 : 0), base.z + k * 0.06);
    g.rotation.set(hero === 'bollard' && st.fire < 0.35 ? -Math.sin(st.fire / 0.35 * Math.PI) * 0.6 : k * 0.08, hero === 'bollard' && st.fire < 0.35 ? Math.sin(st.fire / 0.35 * Math.PI) * 0.9 : 0, 0);
  } };
}
function lr3dFallbackProj(k, team) {
  if (k === 'bolt') { const g = new THREE.Group(); lr3Mesh(new THREE.SphereGeometry(0.1, 8, 6), lr3Mat(0xfff4c0, { basic: true }), 0, 0, 0, g); g.add(lr3Glow(0xffd880, 1.1, 0.9)); return g; }
  if (k === 'tar') return lr3Mesh(new THREE.SphereGeometry(0.18, 8, 6), lr3Mat(0x1a1410, { em: 0x401000 }));
  const g = new THREE.Group(); lr3Mesh(new THREE.SphereGeometry(0.16, 8, 6), lr3Mat(0xffe0a0, { em: 0xffa030 }), 0, 0, 0, g); g.add(lr3Glow(0xffc060, 1.4, 0.9)); return g;
}
function lr3dFallbackWall(team) {
  const g = new THREE.Group(); lr3Mesh(new THREE.BoxGeometry(6, 3, 0.5), lr3Mat(0x4a4e56), 0, 1.5, 0, g);
  lr3Mesh(new THREE.BoxGeometry(6.1, 0.18, 0.56), lr3Mat(LR_TEAMS[team].hex), 0, 2.9, 0, g); lr3Mesh(new THREE.BoxGeometry(6.1, 0.18, 0.56), lr3Mat(LR_TEAMS[team].hex), 0, 0.1, 0, g);
  for (let i = -2; i <= 2; i++) lr3Mesh(new THREE.BoxGeometry(0.1, 3, 0.58), lr3Mat(0x2a2c30), i * 1.4, 1.5, 0, g);
  return g;
}
function lr3dFallbackZone(z) {
  const g = new THREE.Group(), T = LR_TEAMS[z.team];
  if (z.k === 'tar') { const d = lr3Mesh(new THREE.CircleGeometry(z.r, 24), lr3Mat(0x140c08, { op: 0.85 }), 0, 0.04, 0, g); d.rotation.x = -Math.PI / 2; const f = lr3Glow(0xff6020, z.r * 1.4, 0.35); f.position.y = 0.4; g.add(f); return { group: g, update(zz) { f.material.opacity = 0.25 + Math.sin(LR3.t * 13) * 0.08; } }; }
  if (z.k === 'broadside') { const s = lr3Mesh(new THREE.PlaneGeometry(z.w, z.l), lr3Mat(0xff3020, { op: 0.35, ds: true }), 0, 0.06, 0, g); s.rotation.x = -Math.PI / 2; g.rotation.y = z.yaw; return { group: g, update(zz) { s.material.opacity = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(LR3.t * (6 + (1.4 - zz.t) * 14))); } }; }
  const ring = lr3Mesh(new THREE.RingGeometry(z.r - 0.15, z.r, 40), lr3Mat(z.k === 'beacon' ? 0xffe8a0 : 0xffc060, { op: 0.6, ds: true, basic: true }), 0, 0.05, 0, g); ring.rotation.x = -Math.PI / 2;
  if (z.k === 'lantern') { const l = lr3Mesh(new THREE.SphereGeometry(0.2, 10, 8), lr3Mat(0xfff0c0, { em: 0xffb040 }), 0, (z.y - (z.gy != null ? z.gy : z.y)), 0, g); const gl = lr3Glow(0xffcc70, 2.4, 0.85); gl.position.copy(l.position); g.add(gl); ring.position.y = -(z.y - (z.gy != null ? z.gy : z.y)) + 0.05; }
  if (z.k === 'beacon') { lr3Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), lr3Mat(0x2a2a2a), 0, 1.3, 0, g); const gl = lr3Glow(0xfff0b0, 5, 0.95); gl.position.y = 2.7; g.add(gl); const col = lr3Mesh(new THREE.CylinderGeometry(z.r, z.r, 0.6, 40, 1, true), lr3Mat(T.hex, { op: 0.12, ds: true, add: true }), 0, 0.3, 0, g); }
  return { group: g, update(zz) { ring.material.opacity = 0.35 + 0.25 * Math.sin(LR3.t * 4); } };
}
// the fallback effects: a sprite, a line or a mesh that lives a moment
function lr3dFall(kind, f) {
  const S = LR3.scene, add = (o, life, upd) => { S.add(o); LR3.ffx.push({ o, t: 0, life, upd }); };
  const T = LR_TEAMS[f.team | 0] || LR_TEAMS[0];
  if (kind === 'tracer' || kind === 'blink') {
    const g = new THREE.BufferGeometry().setFromPoints([lr3v(f.x, f.y, f.z), lr3v(f.x2, f.y2, f.z2)]), l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: kind === 'blink' ? 0xb8e0ff : 0xffe6a8, transparent: true, opacity: 0.9 }));
    add(l, kind === 'blink' ? 0.3 : 0.07, (o, k) => { o.material.opacity = 0.9 * (1 - k); });
  } else if (kind === 'hit' || kind === 'spark') { const s = lr3Glow(f.head ? 0xff5040 : f.bolt ? 0xfff0a0 : 0xffc080, f.head ? 0.8 : 0.45, 1); s.position.set(f.x, f.y, f.z); add(s, 0.15, (o, k) => { o.material.opacity = 1 - k; }); }
  else if (kind === 'heal') { const s = lr3Glow(0x80ff9a, 0.7, 0.9); s.position.set(f.x, f.y, f.z); add(s, 0.7, (o, k, dt) => { o.position.y += dt * 1.2; o.material.opacity = 0.9 * (1 - k); }); }
  else if (kind === 'blast' || kind === 'death' || kind === 'spawn') { const s = lr3Glow(kind === 'blast' ? 0xff7a30 : kind === 'spawn' ? 0xfff0c0 : T.hex, kind === 'blast' ? (f.r || 3) * 1.6 : 2.6, 0.9); s.position.set(f.x, f.y + (kind === 'blast' ? 0.3 : 1), f.z); add(s, 0.5, (o, k) => { o.material.opacity = 0.9 * (1 - k); o.scale.multiplyScalar(1.01); }); }
  else if (kind === 'sweep') { const m = new THREE.Mesh(new THREE.RingGeometry(1.2, 4, 18, 1, -0.87 + Math.PI / 2, 1.74), lr3Mat(0xffffff, { op: 0.35, ds: true, add: true })); m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, f.yaw, 0); m.position.set(f.x, f.y, f.z); add(m, 0.2, (o, k) => { o.material.opacity = 0.35 * (1 - k); }); }
  else if (kind === 'wave') { const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.5, 24, 1, Math.PI / 2 - 0.61, 1.22), lr3Mat(0x7ad0ff, { op: 0.55, ds: true, add: true })); const grp = new THREE.Group(); grp.add(m); m.rotation.x = -Math.PI / 2; grp.rotation.y = f.yaw; grp.position.set(f.x, (f.y || 0) + 0.3, f.z); add(grp, 0.8, (o, k) => { o.children[0].scale.setScalar(1 + k * 9); o.children[0].material.opacity = 0.55 * (1 - k); }); }
  else if (kind === 'rush') { const s = lr3Glow(0xc0d8ff, 2, 0.6); s.position.set(f.x, f.y, f.z); add(s, 0.4, (o, k) => { o.material.opacity = 0.6 * (1 - k); }); }
  else if (kind === 'volley') { const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw); for (let i = -2; i <= 2; i++) { const s = lr3Glow(0xffa040, 7, 1); s.position.set(f.x + fx * i * 4.4, 1.5, f.z + fz * i * 4.4); add(s, 0.7, (o, k) => { o.material.opacity = 1 - k; o.scale.setScalar(7 + k * 6); }); } }
}

// ---------- every frame ----------
const lr3Lerp = (a, b, k) => a + (b - a) * k;
function lr3dPose(p) { return { spd: Math.hypot(p.vx, p.vz), gnd: p.gnd, vy: p.vy, pitch: p.pitch, fire: p.fireT, alt: p.alt, act: p.act, ult: p.ult, dead: p.alive ? -1 : Math.max(0, 8 - p.deadT), hurt: LRM.t - p.hurtAt, reload: p.reload, beam: p.beam, brace: p.brace }; }
function lr3dDraw(dt) {
  if (!LR3.ok || !LRM.on) return;
  LR3.t += dt; const S = LR3.scene, A = LRM.alpha || 0, me = lrMe(), C = LRM.cart;
  // the Wain
  if (C) { const g = LR3.wain.group, x = lr3Lerp(C.px != null ? C.px : C.x, C.x, A), z = lr3Lerp(C.pz != null ? C.pz : C.z, C.z, A); g.position.set(x, C.y || 0, z); g.rotation.y = C.yaw; try { LR3.wain.update(C, dt); } catch (e) {} }
  if (LR3.dress && LR3.dress.update) try { LR3.dress.update(dt, LRM.t, C); } catch (e) {}
  if (LRM.win === 0 && !LR3.lit) { LR3.lit = true; if (typeof lrLightOn === 'function') try { lrLightOn(); } catch (e) {} if (LR3.fall && LR3.fall.lamp) { LR3.fall.lamp.material = lr3Mat(0xfff4c8, { basic: true }); LR3.fall.glow.visible = true; } }
  // the players
  const fp = me && me.alive && LRM.ph !== 'over';
  for (const p of LRM.P) {
    let M = LR3.models[p.i];
    if (!p.hero) { if (M) M.m.group.visible = false; continue; }
    if (!M || M.hero !== p.hero || M.team !== p.team) {
      if (M) S.remove(M.m.group);
      let m = null; if (typeof lrHeroModel === 'function') try { m = lrHeroModel(p.hero, p.team); } catch (e) { console.error(e); m = null; }
      if (!m) m = lr3dFallbackHero(p.hero, p.team);
      M = LR3.models[p.i] = { hero: p.hero, team: p.team, m }; S.add(m.group);
    }
    const g = M.m.group; g.visible = !(p === me && fp);
    g.position.set(lr3Lerp(p.px, p.x, A), lr3Lerp(p.py, p.y, A), lr3Lerp(p.pz, p.z, A)); g.rotation.y = p.yaw;
    if (g.visible) try { M.m.update(lr3dPose(p), dt); } catch (e) {}
  }
  // the bulkheads, the zones, the things in flight: made as they come, dropped as they go
  const sync = (M, list, make, place) => { const live = new Set(); for (const o of list) { live.add(o.id); let v = M.get(o.id); if (!v) { v = make(o); if (!v) continue; M.set(o.id, v); S.add(v.group || v); } place(v, o); } for (const [id, v] of M) if (!live.has(id)) { S.remove(v.group || v); M.delete(id); } };
  sync(LR3.walls, LRM.walls, w => { let m = null; if (typeof lrWallMesh === 'function') try { m = lrWallMesh(w.team); } catch (e) { m = null; } return m || lr3dFallbackWall(w.team); }, (v, w) => { v.position.set(w.x, w.y, w.z); v.rotation.y = w.yaw; });
  sync(LR3.zones, LRM.zones, z => { let m = null; if (typeof lrZoneMesh === 'function') try { m = lrZoneMesh(z.k, z.team); } catch (e) { m = null; } return m && m.group ? m : lr3dFallbackZone(z); }, (v, z) => { v.group.position.set(z.x, z.k === 'lantern' && z.gy != null ? z.gy : z.y, z.z); if (z.k === 'broadside') v.group.rotation.y = z.yaw; try { v.update(z, dt); } catch (e) {} });
  sync(LR3.proj, LRM.proj, j => { let m = null; if (typeof lrProjMesh === 'function') try { m = lrProjMesh(j.k, j.team); } catch (e) { m = null; } return m || lr3dFallbackProj(j.k, j.team); }, (v, j) => { v.position.set(j.x + j.vx * LR_DT * A, j.y + j.vy * LR_DT * A, j.z + j.vz * LR_DT * A); const l = Math.hypot(j.vx, j.vz); v.rotation.set(Math.atan2(j.vy, l), Math.atan2(-j.vx, -j.vz), 0, 'YXZ'); });
  // the events, each once (a guest's own shots and movement were shown as they happened, so the host's echo of them
  // is skipped: lr3dLocalFx)
  const guest = !!LRM.net && !lrHost();
  for (const f of LRM.FX) {
    if (f.id <= LR3.fxSeen) continue; LR3.fxSeen = f.id;
    if (LRM.t - f.t > 1) continue;
    if (guest && me && ((f.k === 'tracer' && f.a === me.i) || (LR3_OWN.includes(f.k) && f.v === me.i))) continue;
    lr3dEvent(f, me);
  }
  if (LR3.fx && LR3.fx.update) try { LR3.fx.update(dt); } catch (e) {}
  for (const f of LR3.ffx) { f.t += dt; f.upd && f.upd(f.o, Math.min(1, f.t / f.life), dt); }
  if (LR3.ffx.some(f => f.t >= f.life)) LR3.ffx = LR3.ffx.filter(f => { if (f.t < f.life) return true; S.remove(f.o); if (f.o.geometry && f.o.geometry !== LR3.keepGeo) f.o.geometry.dispose && f.o.geometry.dispose(); return false; });
  // Linnet's Mending Light, every frame it's held
  for (const p of LRM.P) {
    const q = p.alive && p.beam >= 0 ? LRM.P[p.beam] : null, eye = p === me && fp && LR3.cam ? lr3v(0.3, -0.12, -1.2).applyQuaternion(LR3.cam.quaternion).add(LR3.cam.position) : null;
    if (q) {
      const a = eye || lr3v(lr3Lerp(p.px, p.x, A), lr3Lerp(p.py, p.y, A) + p.h * 0.75, lr3Lerp(p.pz, p.z, A)), b = lr3v(lr3Lerp(q.px, q.x, A), lr3Lerp(q.py, q.y, A) + q.h * 0.6, lr3Lerp(q.pz, q.z, A));
      if (LR3.fx) { try { LR3.fx.spawn('beam', { x: a.x, y: a.y, z: a.z, x2: b.x, y2: b.y, z2: b.z, team: p.team }); } catch (e) {} }
      else { let l = LR3.beams[p.i]; if (!l) { l = LR3.beams[p.i] = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.85 })); S.add(l); } l.geometry.setFromPoints([a, b]); l.visible = true; }
    } else if (LR3.beams[p.i]) LR3.beams[p.i].visible = false;
  }
  lr3dCamera(dt, me, fp);
  lr3dRender(S);
}
// Two passes: the world at the player's own field of view, then the hands and weapon (on layer 1) over it at a fixed one,
// so they take the same room on the screen whatever the field of view is set to (and don't poke into walls)
function lr3dRender(S) {
  const r = LR3.r, cam = LR3.cam, v = LR3.view && LR3.view.group;
  if (!v || !v.visible) { cam.layers.set(0); r.render(S, cam); return; }
  if (LR3.vmLay !== v) { LR3.vmLay = v; v.traverse(o => o.layers.set(1)); S.traverse(o => { if (o.isLight) o.layers.enable(1); }); }
  cam.layers.set(0); r.render(S, cam);
  const fov = cam.fov, bg = S.background, ac = r.autoClear;
  cam.fov = 2 * Math.atan(Math.tan(36 * Math.PI / 180) / Math.max(1, cam.aspect / 1.78)) * 180 / Math.PI; cam.updateProjectionMatrix();
  S.background = null; r.autoClear = false; r.clearDepth(); cam.layers.set(1); r.render(S, cam);
  cam.layers.set(0); r.autoClear = ac; S.background = bg; cam.fov = fov; cam.updateProjectionMatrix();
}
const LR3_OWN = ['cast', 'sweep', 'rush', 'rise', 'blink'];
// one event: its sound, its effect, and the shake it gives you
function lr3dEvent(f, me) {
  try { lrFxSound(f); } catch (e) {}
  let ff = f;
  if (f.k === 'tracer' && me && f.a === me.i && LR3.cam) { const c = LR3.cam, v = lr3v(0.2, -0.16, -0.7).applyQuaternion(c.quaternion).add(c.position); ff = Object.assign({}, f, { x: v.x, y: v.y, z: v.z }); }
  if (me && f.k === 'hit' && f.v === me.i) LR3.shake = Math.min(0.6, LR3.shake + 0.12 + (f.n || 0) / 300);
  if (f.k === 'volley' && me && Math.hypot(f.x - me.x, f.z - me.z) < 30) LR3.shake = 0.8;
  if (f.k === 'wave' && me && Math.hypot(f.x - me.x, f.z - me.z) < 16) LR3.shake = Math.max(LR3.shake, 0.5);
  const ok = ['tracer', 'hit', 'heal', 'blast', 'sweep', 'rush', 'wave', 'blink', 'death', 'spawn', 'broadside', 'volley'].includes(f.k) || (f.k === 'spark');
  if (!ok) return;
  if (LR3.fx) { try { LR3.fx.spawn(f.k === 'spark' ? 'hit' : f.k, ff); } catch (e) {} } else lr3dFall(f.k, ff);
}
// an event of a guest's own, shown and heard at once rather than when the host's word comes back (src/lr.js lrGuestFire)
function lr3dLocalFx(f) { if (!LR3.ok || !LRM.on) return; lr3dEvent(f, lrMe()); }
// the camera: your eyes (or, while you're down, a little behind and above your body), with Razorbill's glass, the
// field of view setting, and a shake when you're hit
function lr3dCamera(dt, me, fp) {
  const cam = LR3.cam, A = LRM.alpha || 0; if (!me) return;
  const H = LR_HEROES[me.hero] || LR_HEROES.razorbill, h = me.hero ? me.h : 1.8;
  const x = lr3Lerp(me.px, me.x, A), y = lr3Lerp(me.py, me.y, A), z = lr3Lerp(me.pz, me.z, A), yaw = me.bot ? me.yaw : LRM.ly, pitch = me.bot ? me.pitch : LRM.lp;
  const ey = y + h * 0.88; if (LR3.eyeY == null || Math.abs(LR3.eyeY - ey) > 0.7 || !me.gnd) LR3.eyeY = ey; else LR3.eyeY += (ey - LR3.eyeY) * Math.min(1, dt * 22);   // (smoothed only for a step up or down)
  if (fp || LRM.ph === 'pick') { cam.position.set(x, LR3.eyeY, z); cam.rotation.set(pitch, yaw, 0); }
  else { const bx = x + Math.sin(yaw) * 4.5, bz = z + Math.cos(yaw) * 4.5; cam.position.set(bx, y + 3.2, bz); cam.lookAt(x, y + 1, z); }
  if (LR3.shake > 0) { const s = LR3.shake * 0.04 * (typeof flashK === 'function' ? Math.max(0.3, flashK()) : 1); cam.rotation.x += (Math.random() - 0.5) * s; cam.rotation.y += (Math.random() - 0.5) * s; LR3.shake = Math.max(0, LR3.shake - dt * 2.2); }
  const zoomTo = fp && me.hero === 'razorbill' && me.alt ? 2 : 1; LR3.zoom += (zoomTo - LR3.zoom) * Math.min(1, dt * 14);
  const hf = (typeof fovDeg === 'function' ? fovDeg() : 90) * Math.PI / 180, vf = 2 * Math.atan(Math.tan(hf / 2) / Math.max(0.4, cam.aspect)), v = 2 * Math.atan(Math.tan(Math.min(vf, 1.75) / 2) / LR3.zoom) * 180 / Math.PI;
  if (Math.abs(cam.fov - v) > 0.01) { cam.fov = v; cam.updateProjectionMatrix(); }
  // the hands and the weapon
  if (LR3.viewHero !== me.hero) {
    if (LR3.view) cam.remove(LR3.view.group);
    LR3.view = null; LR3.viewHero = me.hero;
    if (me.hero) { let v = null; if (typeof lrViewModel === 'function') try { v = lrViewModel(me.hero); } catch (e) { console.error(e); v = null; } LR3.view = v || lr3dFallbackView(me.hero); cam.add(LR3.view.group); }
  }
  if (LR3.view) { LR3.view.group.visible = fp && !(me.hero === 'razorbill' && LR3.zoom > 1.6); try { LR3.view.update({ fire: me.fireT, alt: me.alt, reload: me.reload, act: me.act, spd: Math.hypot(me.vx, me.vz), gnd: me.gnd, ult: me.ult, beam: me.beam }, dt); } catch (e) {} }
}
// where a point in the world falls on the screen (for the HUD's names and bars): { x, y, on (in front of you) }
function lr3dProject(x, y, z) {
  if (!LR3.ok) return { x: 0, y: 0, on: false };
  const v = lr3v(x, y, z).project(LR3.cam);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: v.z < 1 && v.z > -1 };
}
