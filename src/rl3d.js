'use strict';
// Skerry Clash in 3D (three.js, its own canvas #rlCv): the two keepers' rocks on the sea at dusk, the race running
// between them, the two stone causeways, the six towers, every troop and building as a small low-poly model, the
// shots in flight, the spells, the deaths and the towers coming down. src/rl.js owns the state; this only reads it.
// Arena tiles to three.js: (x, y, height) is (x - 9, height, 16 - y), so the middle of the race is the origin and
// side 0's rock is towards +z. The camera looks down at a tilt from your own side (from -z when you play side 1, so
// your rock is always at the bottom of the screen) and is fitted each resize to the room the HUD leaves (rl3dFit).
// Colours read from your side of the screen: your units stand on a blue ring with blue trim and blue health bars,
// theirs red, whichever side you play. The towers come from rlTowerMesh(skin, kind, side) (src/rlcrates.js, Meta's)
// when it's there, passed side 0 for yours and 1 for theirs so the trim follows the same rule; else a plain
// whitewashed lighthouse here.
// Models are built once per card and side (rl3dProto) and cloned; their moving parts are found by name (body, legL,
// legR, armL, armR, wingL, wingR, clawL, clawR, legs, seg0.., flame, gun, bell, tail). The effects are pools of
// sprites (glows, smoke, sparks, drops) and rings on the ground, fed by RL.FX (each handled once, by id).
// The second 32 (v200) are built in rl3dBuild2 and moved in rl3dAnim2: a Burning Lens draws a beam to what it holds
// (u.tg while st is 'hit', wider and whiter with u.rp), a Lobster Knight carries his tail-fan shield while u.sh lasts,
// a Wrecker Chief has a faint gold ring four tiles round him, a Ship's Cat flies the arc of its pounce ('leap'), and any
// unit shows, now and then, a streak of wind (u.hs), a gold spark (u.ral), a drip (u.tar, slow) or a green twinkle
// (u.mend). Their events: heal, leap, chain (lightning rods between the points), pull, blast, oil (a "+1" that rises),
// shield, burst, summon (the Shipwreck's hulk falls, breaks and settles: RL3.props), spin. Their zones: mend, haste
// (wind streaks), dot (a cloud and falling rain), whirl (a turning spiral and a funnel); any other kind gets a plain
// ring. Their shots: herring, net, grenade and mortar (arcing, with a ring where they'll land), rocket, song, bolt2,
// gale. A shooter's gun kicks when its shot appears. Unknown cards fall back to a plain figure, unknown kinds to nothing.
// The resolution follows the frame rate as in src/golf3d.js, and the battery saver caps it (src/power.js).

const RL3 = { ok: false, r: null, scene: null, cam: null, units: new Map(), dying: [], shots: new Map(), zones: new Map(), towers: [], protos: {}, t: 0, seen: 0, ghost: null, zone: null, zoneKey: '', fxq: [], parts: [], rings: [], bolts: [], arcs: [], words: [], props: [] };
const RL_G0 = 0.6;   // (the height of the rocks' tops and the causeways above the sea)
const rv = (x, y, h) => new THREE.Vector3(x - 9, h || 0, 16 - y);
const RL_MINE = 0x3d8cff, RL_THEIRS = 0xe8453c;

// ---------- materials and shapes, shared ----------
const RL3M = {}, RL3G = {};
function rlMat(hex, o) {
  const k = hex + (o ? JSON.stringify(o) : ''); if (RL3M[k]) return RL3M[k];
  const m = o && o.basic ? new THREE.MeshBasicMaterial({ color: hex }) : new THREE.MeshLambertMaterial({ color: hex, flatShading: true });
  if (o) { if (o.em != null) m.emissive = new THREE.Color(o.em); if (o.op != null) { m.transparent = true; m.opacity = o.op; m.depthWrite = !!o.dw; } if (o.add) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; } if (o.ds) m.side = THREE.DoubleSide; }
  return (RL3M[k] = m);
}
function rlGeo(k, f) { return RL3G[k] || (RL3G[k] = f()); }
const gBox = (w, h, d) => rlGeo('b' + [w, h, d], () => new THREE.BoxGeometry(w, h, d));
const gCyl = (a, b, h, n) => rlGeo('c' + [a, b, h, n], () => new THREE.CylinderGeometry(a, b, h, n || 8));
const gSph = (r, n) => rlGeo('s' + [r, n], () => new THREE.SphereGeometry(r, n || 8, Math.max(4, ((n || 8) * 0.7) | 0)));
const gCone = (r, h, n) => rlGeo('k' + [r, h, n], () => new THREE.ConeGeometry(r, h, n || 7));
const gIco = (r, d) => rlGeo('i' + [r, d], () => new THREE.IcosahedronGeometry(r, d || 0));
const gDod = r => rlGeo('d' + r, () => new THREE.DodecahedronGeometry(r, 0));
const gTor = (r, t, n) => rlGeo('t' + [r, t, n], () => new THREE.TorusGeometry(r, t, 5, n || 10));
// a mesh into a parent: position, rotation, scale, and a name for the animated parts
function rlAdd(par, geo, mat, p, r, s, name) {
  const m = new THREE.Mesh(geo, mat); if (p) m.position.set(p[0], p[1], p[2]); if (r) m.rotation.set(r[0], r[1], r[2]);
  if (s != null) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
  if (name) m.name = name; par.add(m); return m;
}
function rlGrp(par, p, name) { const g = new THREE.Group(); if (p) g.position.set(p[0], p[1], p[2]); if (name) g.name = name; par.add(g); return g; }
// a soft round texture (for glows, smoke, shadows) and a plain white one (for the bars)
function rlTex(kind) {
  if (RL3['tx' + kind]) return RL3['tx' + kind];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  if (kind === 'white') { x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); }
  else {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (kind === 'glow') { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    else if (kind === 'smoke') { g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.6, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.7, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c); return (RL3['tx' + kind] = t);
}

// ---------- the scene ----------
function rl3dInit() {
  if (RL3.ok) return true;
  if (typeof THREE === 'undefined') return false;
  const cv = $('rlCv'), dpr = window.devicePixelRatio || 1, touch = matchMedia && matchMedia('(pointer: coarse)').matches;
  RL3.lite = touch || dpr >= 2;
  try { RL3.r = new THREE.WebGLRenderer({ canvas: cv, antialias: !RL3.lite, powerPreference: 'high-performance' }); } catch (e) { return false; }
  RL3.dprRaw = dpr; rl3dPower(true);
  const S = RL3.scene = new THREE.Scene();
  S.fog = new THREE.Fog(0x4a4a66, 90, 300);
  RL3.cam = new THREE.PerspectiveCamera(36, 1, 0.5, 900);
  // dusk: the sun low over the sea to the west, a violet sky above, warm light on the rocks and long cool shade
  S.add(new THREE.HemisphereLight(0xb4b8e8, 0x4a3438, 0.95));
  const sun = RL3.sun = new THREE.DirectionalLight(0xffb27a, 1.15); sun.position.set(-60, 34, 18); S.add(sun);
  const fill = new THREE.DirectionalLight(0x8090d0, 0.32); fill.position.set(40, 30, -30); S.add(fill);
  const sd = sun.position.clone().normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 14), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sd: { value: sd }, top: { value: new THREE.Color(0x1c2350) }, mid: { value: new THREE.Color(0x6a4f86) }, hor: { value: new THREE.Color(0xf0a070) }, glow: { value: new THREE.Color(0xffc080) } },
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 sd, top, mid, hor, glow; varying vec3 vd; void main(){ float h = clamp(vd.y, -0.2, 1.0); vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.18, 0.75, h)); float s = max(dot(vd, sd), 0.0); c += glow * (pow(s, 6.0) * 0.45 + pow(s, 120.0) * 1.4) * (1.0 - smoothstep(0.1, 0.6, h)); gl_FragColor = vec4(c, 1.0); }' }));
  sky.renderOrder = -2; S.add(sky);
  // the sea and the race: one sheet of water, the current running hard between the rocks
  RL3.seaU = { t: { value: 0 }, deep: { value: new THREE.Color(0x1d3a52) }, shal: { value: new THREE.Color(0x3d6e7c) }, glow: { value: new THREE.Color(0xffb070) }, haze: { value: new THREE.Color(0x8a6c86) }, cp: { value: new THREE.Vector3() } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), new THREE.ShaderMaterial({ uniforms: RL3.seaU, fog: false,
    vertexShader: 'varying vec3 wp; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); wp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: [
      'uniform float t; uniform vec3 deep, shal, glow, haze, cp; varying vec3 wp;',
      'float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }',
      'void main(){ vec2 p = wp.xz; float race = (1.0 - smoothstep(0.7, 2.2, abs(p.y))) * (1.0 - smoothstep(14.0, 30.0, abs(p.x)));',
      ' float fl = t * (0.25 + race * 1.7);',
      ' float n = vn(vec2(p.x * 0.55 - fl * 1.4, p.y * 1.1 + t * 0.07)) * 0.6 + vn(vec2(p.x * 1.7 - fl * 2.6, p.y * 2.4 - t * 0.2)) * 0.4;',
      ' vec3 c = mix(deep, shal, n * 0.65 + race * 0.2);',
      ' float st = smoothstep(0.7, 0.95, vn(vec2(p.x * 0.9 - t * 2.6, p.y * 5.0))) * race;',
      ' float cw = 0.0; for (int i = 0; i < 2; i++) { float cx = i == 0 ? -5.5 : 5.5; float e = abs(abs(p.x - cx) - 1.05); cw += smoothstep(0.35, 0.0, e) * race * (0.5 + 0.5 * vn(vec2(p.y * 3.0 + t * 3.0, p.x))); }',
      ' float bank = smoothstep(0.28, 0.0, abs(abs(p.y) - 1.0)) * step(abs(p.x), 11.2) * (0.45 + 0.55 * vn(vec2(p.x * 2.0 - t * 3.0, t)));',
      ' c += vec3(0.75, 0.78, 0.8) * (st * 0.32 + cw * 0.55 + bank * 0.4);',
      ' c += glow * pow(n, 5.0) * 0.35 * (0.5 + race);',
      ' float d = length(p - cp.xz); c = mix(c, haze, smoothstep(50.0, 240.0, d));',
      ' gl_FragColor = vec4(c, 1.0); }'].join('\n') }));
  sea.rotation.x = -Math.PI / 2; S.add(sea);
  rl3dRocks(); rl3dCauseways(); rl3dDecor();
  // the deploy zone (shown while a troop or building is picked), the placement ghost, the effects' pools
  const zc = RL3.zoneCv = document.createElement('canvas'); zc.width = 18 * 8; zc.height = 32 * 8;
  RL3.zoneTex = new THREE.CanvasTexture(zc); RL3.zoneTex.magFilter = THREE.NearestFilter;
  RL3.zone = new THREE.Mesh(new THREE.PlaneGeometry(18, 32), new THREE.MeshBasicMaterial({ map: RL3.zoneTex, transparent: true, depthWrite: false }));
  RL3.zone.rotation.x = -Math.PI / 2; RL3.zone.position.set(0, RL_G0 + 0.03, 0); RL3.zone.renderOrder = 2; RL3.zone.visible = false; S.add(RL3.zone);
  const gh = RL3.ghost = new THREE.Group(); gh.visible = false; S.add(gh);
  gh.userData.ring = rlAdd(gh, new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), [0, 0.06, 0], [-Math.PI / 2, 0, 0]);
  gh.userData.disc = rlAdd(gh, new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), [0, 0.05, 0], [-Math.PI / 2, 0, 0]);
  gh.userData.ring.renderOrder = gh.userData.disc.renderOrder = 3;
  RL3.ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false });
  for (let i = 0; i < (RL3.lite ? 140 : 220); i++) { const add = i % 2 === 0, m = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex(add ? 'glow' : 'smoke'), transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false })); m.visible = false; m.renderOrder = 4; S.add(m); RL3.parts.push({ m, add, life: 0 }); }
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; S.add(m); RL3.rings.push({ m, life: 0 }); }
  for (let i = 0; i < 6; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xd8e8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); l.frustumCulled = false; l.visible = false; S.add(l); RL3.bolts.push({ l, life: 0, delay: 0 }); }
  // (the chain lightning's strokes: thin additive rods, nine to a stroke, a white core in a blue sheath)
  const segGeo = rlGeo('beamCyl', () => { const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; });
  for (let i = 0; i < 8; i++) { const l = new THREE.Group(), mat = [0x6a90ff, 0xf0f6ff].map((c, j) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: j ? 1 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); for (let k = 0; k < 18; k++) { const m = new THREE.Mesh(segGeo, mat[k & 1]); l.add(m); } l.userData.mat = mat; l.visible = false; S.add(l); RL3.arcs.push({ l, life: 0, delay: 0 }); }
  RL3.ok = true; rl3dResize();
  return true;
}
// the two rocks: an irregular outline, cliffs down to the sea, the top painted (turf, paths, flagstones by the towers)
function rl3dRocks() {
  const r = rlRng(77), S = RL3.scene;
  const top = rl3dPaintBank(), tex = new THREE.CanvasTexture(top.cv);
  tex.anisotropy = Math.min(4, RL3.r.capabilities.getMaxAnisotropy ? RL3.r.capabilities.getMaxAnisotropy() : 1);
  for (const s of [0, 1]) {
    // the outline, in arena tiles of side 0's rock (y from -4 to 15), turned for side 1's
    const pts = [], X0 = -2.6, X1 = 20.6, Y0 = -4.2, Y1 = RLC.R0, nn = 64;
    for (let i = 0; i <= nn; i++) {
      const a = i / nn;
      // round from the race's edge, along the outer side, the back, the other side, and back to the race
      let x, y;
      if (a < 0.25) { const f = a / 0.25; x = X1 + Math.sin(f * Math.PI) * 0.4; y = Y1 - f * (Y1 - Y0); }
      else if (a < 0.5) { const f = (a - 0.25) / 0.25; x = X1 - f * (X1 - X0); y = Y0 - Math.sin(f * Math.PI) * 0.7; }
      else if (a < 0.75) { const f = (a - 0.5) / 0.25; x = X0 - Math.sin(f * Math.PI) * 0.4; y = Y0 + f * (Y1 - Y0); }
      else break;
      const edge = y > Y1 - 0.5 ? 0 : 1; x += (r() - 0.5) * 0.9 * edge; y += (a > 0.25 && a < 0.5 ? (r() - 0.5) * 0.9 : 0);
      pts.push([x, y]);
    }
    pts.push([X0 + 0.6, Y1], [X1 - 0.6, Y1]);
    const shp = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0] - 9, (s ? RLC.H - p[1] : p[1]) - 16)));
    const tg = new THREE.ShapeGeometry(shp);
    // (the top's texture is laid in arena tiles: u across x -2.6..20.6, v along y -4.2..15 of side 0's rock)
    const uv = tg.attributes.uv, pos = tg.attributes.position;
    for (let i = 0; i < uv.count; i++) { const x = pos.getX(i) + 9, y = s ? RLC.H - (pos.getY(i) + 16) : pos.getY(i) + 16; uv.setXY(i, (x - top.x0) / top.w, (y - top.y0) / top.h); }
    const tm = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: tex })); tm.rotation.x = -Math.PI / 2; tm.position.y = RL_G0; S.add(tm);
    const eg = new THREE.ExtrudeGeometry(shp, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.45, bevelSegments: 1, steps: 1 });
    const em = new THREE.Mesh(eg, rlMat(0x52504a)); em.rotation.x = -Math.PI / 2; em.position.y = RL_G0 - 2.95; S.add(em);
    // boulders round the shore, and a few up on the turf off the arena
    for (let i = 0; i < 46; i++) {
      const p = pts[(r() * pts.length) | 0], x = p[0] + (r() - 0.5) * 1.6, y = p[1] + (r() - 0.5) * 1.2; if (y > RLC.R0 - 0.6 && x > -1 && x < 19) continue;
      const k = 0.4 + r() * 1.1, m = rlAdd(S, gDod(1), rlMat(r() < 0.5 ? 0x4e4a44 : 0x3e3a36), null, [r() * 3, r() * 3, r() * 3], [k, k * (0.5 + r() * 0.4), k]); m.position.copy(rv(x, s ? RLC.H - y : y, RL_G0 - 0.5 + r() * 0.4));
    }
    for (let i = 0; i < 10; i++) { const x = r() < 0.5 ? -1.6 - r() * 0.8 : 19.6 + r() * 0.8, y = -3 + r() * 16, k = 0.25 + r() * 0.45; const m = rlAdd(S, gDod(1), rlMat(0x56524a), null, [r() * 3, r() * 3, 0], [k, k * 0.6, k]); m.position.copy(rv(x, s ? RLC.H - y : y, RL_G0)); }
  }
  // skerries further out, dark against the evening water
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 34 + r() * 60, k = 0.8 + r() * 2.8; const m = rlAdd(S, gDod(1), rlMat(0x2e2a2c), null, [r() * 3, r() * 3, r() * 3], [k, k * 0.45, k * 0.9]); m.position.set(Math.cos(a) * d * 0.75, -0.2, Math.sin(a) * d); }
}
// the painted top of a rock (side 0's; side 1's wears the same, turned)
function rl3dPaintBank() {
  const x0 = -3.2, y0 = -4.8, w = 24.4, h = RLC.R0 - y0 + 0.2, ppt = 24, cv = document.createElement('canvas'); cv.width = Math.round(w * ppt); cv.height = Math.round(h * ppt);
  const c = cv.getContext('2d'), X = x => (x - x0) * ppt, Y = y => (y0 + h - y) * ppt, r = rlRng(5);
  c.fillStyle = '#58663e'; c.fillRect(0, 0, cv.width, cv.height);
  // off the arena: rougher, darker, stonier
  c.fillStyle = '#4b5236'; c.fillRect(0, 0, X(0), cv.height); c.fillRect(X(18), 0, cv.width - X(18), cv.height); c.fillRect(0, Y(0), cv.width, cv.height - Y(0));
  for (let i = 0; i < 9000; i++) { const t = r(); c.fillStyle = t < 0.45 ? 'rgba(30,40,20,0.16)' : t < 0.8 ? 'rgba(170,190,110,0.09)' : 'rgba(120,110,90,0.14)'; c.fillRect(r() * cv.width, r() * cv.height, 1 + r() * 3, 1 + r() * 3); }
  // the arena's tiles, very faint, so a placement can be judged
  for (let i = 0; i < 18; i++) for (let j = 0; j < 15; j++) if ((i + j) % 2 === 0) { c.fillStyle = 'rgba(255,255,220,0.035)'; c.fillRect(X(i), Y(j + 1), ppt, ppt); }
  // the worn paths: from the Great Light to each Lamp Tower, and on to the causeway
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (P, wd, col) => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.lineWidth = wd * ppt; c.strokeStyle = col; c.stroke(); };
  for (const lx of RLC.LX) { const P = [[9, 3.5], [lx + (9 - lx) * 0.35, 5.6], [lx, 7], [lx, 11], [lx, 15.2]]; path(P, 1.9, 'rgba(120,102,72,0.55)'); path(P, 1.2, 'rgba(150,128,90,0.65)'); }
  for (let i = 0; i < 1600; i++) { const lx = RLC.LX[i & 1], y = 7 + r() * 8.2, x = lx + (r() - 0.5) * 1.3; c.fillStyle = r() < 0.5 ? 'rgba(80,66,46,0.35)' : 'rgba(190,170,130,0.3)'; c.fillRect(X(x), Y(y), 2, 2); }
  // flagstones round the towers
  const flags = (x, y, R) => { c.fillStyle = '#8c8578'; c.beginPath(); c.arc(X(x), Y(y), R * ppt, 0, 7); c.fill(); for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * R * 0.95; c.fillStyle = r() < 0.5 ? 'rgba(60,55,50,0.35)' : 'rgba(200,195,180,0.25)'; c.fillRect(X(x + Math.cos(a) * d) - 4, Y(y + Math.sin(a) * d) - 3, 7 + r() * 6, 5 + r() * 4); } c.strokeStyle = 'rgba(40,36,30,0.5)'; c.lineWidth = 2; c.stroke(); };
  flags(9, 3.5, 2.6); flags(RLC.LX[0], 7, 2); flags(RLC.LX[1], 7, 2);
  // the edge of the arena: a dashed line of whitewashed stones, and the race's edge
  c.setLineDash([6, 8]); c.strokeStyle = 'rgba(230,225,205,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(X(0), Y(15)); c.lineTo(X(0), Y(0)); c.lineTo(X(18), Y(0)); c.lineTo(X(18), Y(15)); c.stroke(); c.setLineDash([]);
  c.fillStyle = 'rgba(70,60,50,0.55)'; c.fillRect(0, Y(15.2), cv.width, 0.5 * ppt);
  return { cv, x0, y0, w, h };
}
function rl3dCauseways() {
  const S = RL3.scene;
  for (const cx of RLC.LX) {
    const g = rlGrp(S); g.position.copy(rv(cx, 16, 0));
    rlAdd(g, gBox(2.15, 1.5, 3.4), rlMat(0x857a6e), [0, RL_G0 - 0.75, 0]);
    // the slabs across, and the stones at the edges
    for (let i = 0; i < 5; i++) rlAdd(g, gBox(2.2, 0.08, 0.62), rlMat(i % 2 ? 0x9e9384 : 0xa89c8a), [0, RL_G0 + 0.01, -1.36 + i * 0.68]);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) rlAdd(g, gBox(0.24, 0.22, 0.5), rlMat(0x6f655c), [sx * 1.02, RL_G0 + 0.08, -1.2 + i * 0.8], [0, (i % 2) * 0.2, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { rlAdd(g, gCyl(0.13, 0.16, 0.7, 6), rlMat(0x4a3d32), [sx * 1.0, RL_G0 + 0.3, sz * 1.55]); }
  }
}
// what's on the rocks off the arena: a keeper's cottage with a lit window, a boat drawn up, barrels and lobster pots
function rl3dDecor() {
  const S = RL3.scene;
  for (const s of [0, 1]) {
    const Y = y => s ? RLC.H - y : y, g = rlGrp(S), rot = s ? Math.PI : 0;
    const ct = rlGrp(g); ct.position.copy(rv(-1.4, Y(1.2), RL_G0)); ct.rotation.y = rot + 0.5;
    rlAdd(ct, gBox(1.6, 1.0, 1.1), rlMat(0xe6e0d0), [0, 0.5, 0]);
    rlAdd(ct, gCone(1.25, 0.8, 4), rlMat(0x4a4448), [0, 1.38, 0], [0, Math.PI / 4, 0], [1, 1, 0.75]);
    rlAdd(ct, gBox(0.22, 0.5, 0.22), rlMat(0x8a7a6a), [0.45, 1.55, 0]);
    rlAdd(ct, gBox(0.26, 0.26, 0.04), rlMat(0xffd080, { em: 0xffa040 }), [-0.35, 0.55, 0.56]);
    rlAdd(ct, gBox(0.26, 0.26, 0.04), rlMat(0xffd080, { em: 0xffa040 }), [0.35, 0.55, 0.56]);
    const bt = rlGrp(g); bt.position.copy(rv(20.3, Y(4.5), RL_G0 - 0.1)); bt.rotation.set(0, rot + 0.3, 0.15);
    rlAdd(bt, gSph(0.5, 8), rlMat(0x7a4a2e), [0, 0.15, 0], null, [0.7, 0.45, 1.9]);
    rlAdd(bt, gBox(0.72, 0.06, 1.6), rlMat(0x5a3a22), [0, 0.38, 0]);
    rlAdd(bt, gBox(0.08, 0.06, 1.4), rlMat(RL_MINE === 0 ? 0 : 0xd8d0c0), [0.34, 0.36, 0]);
    for (let i = 0; i < 3; i++) rlAdd(g, gCyl(0.2, 0.2, 0.46, 8), rlMat(0x6a4a2e), null).position.copy(rv(19.4 + (i % 2) * 0.45, Y(8.4 + i * 0.4), RL_G0 + 0.23));
    for (let i = 0; i < 2; i++) { const p = rlAdd(g, gCyl(0.28, 0.32, 0.36, 6), rlMat(0x8a6a3a, { op: 0.9, dw: true }), null); p.position.copy(rv(-1.6 + i * 0.5, Y(9.5 + i * 0.7), RL_G0 + 0.18)); }
  }
}

// ---------- the size of things on the screen ----------
function rl3dScale(dt) {
  const S = RL3.fps || (RL3.fps = { n: 0, t: 0, good: 0 }); if (!(dt > 0) || dt > 0.25) return;
  S.n++; S.t += dt; if (S.t < 1.5) return;
  const avg = S.t / S.n; S.n = 0; S.t = 0; let pr = RL3.pr;
  const aim = typeof pwFrameS === 'function' ? pwFrameS() : 0;
  if (avg > Math.max(1 / 50, aim * 1.2)) { pr = Math.max(0.6, pr - (avg > Math.max(1 / 30, aim * 1.6) ? 0.25 : 0.12)); S.good = 0; }
  else if (avg < Math.max(1 / 58, aim * 1.06)) { if (++S.good >= 3 && pr < RL3.prMax) { pr = Math.min(RL3.prMax, pr + 0.1); S.good = 0; } }
  if (Math.abs(pr - RL3.pr) > 1e-3) { RL3.pr = pr; RL3.r.setPixelRatio(pr); rl3dResize(); }
}
function rl3dPower(first) { if (!RL3.r) return; RL3.prMax = Math.min(RL3.lite ? 1.25 : 1.5, RL3.dprRaw || 1, typeof pwSaver === 'function' && pwSaver() ? 1.25 : 9); RL3.pr = RL3.prMax; RL3.r.setPixelRatio(RL3.pr); if (!first) rl3dResize(); }
function rl3dResize() { if (!RL3.r) return; RL3.r.setSize(innerWidth, innerHeight, false); RL3.fitKey = ''; }
// the camera, fitted so the whole arena shows in the room between the HUD's top and its hand of cards (or a watcher's bar)
function rl3dFit() {
  // (a watcher has no hand: its Watching bar, src/rlhud.js, stands in for it)
  const w = innerWidth, h = innerHeight, top = $('rlTop'), hb = $('rlBottom'), sb = $('rlSpecBar'), bot = hb && hb.offsetParent ? hb : sb && !sb.hidden ? sb : null;
  const br = bot ? bot.getBoundingClientRect() : { left: 0, right: w, top: h - 140 }, tr = top ? [...top.children].map(e => e.getBoundingClientRect()) : [];
  // the room for the arena: under the top bar and over the hand; or, when the hand sits to one side (a short wide
  // screen), between the names on the left and the hand on the right, top to bottom
  const side = br.left > w * 0.3 && br.right > w - 30;
  let x0 = 0, x1 = w, y0 = (top ? top.getBoundingClientRect().bottom : 46) + 4, y1 = br.top - 4;
  if (side) { x0 = Math.max(0, ...tr.filter(r => r.right < w / 2).map(r => r.right)) + 6; x1 = br.left - 6; y0 = 6; y1 = h - 6; }
  const key = [w, h, x0, x1, y0, y1, RL.me].map(Math.round).join(','); if (key === RL3.fitKey) return; RL3.fitKey = key;
  const C = RL3.cam, availH = Math.max(80, y1 - y0), availW = Math.max(80, x1 - x0 - (w < 600 ? 4 : 20));
  C.aspect = w / h; C.fov = w < h ? 38 : 34; C.clearViewOffset(); C.updateProjectionMatrix();
  const pitch = (w < h ? 58 : side ? 50 : 54) * Math.PI / 180, dir = RL.me ? -1 : 1, corners = [];
  for (const x of [-0.2, 18.2]) for (const y of [-0.6, 32.6]) for (const hh of [RL_G0, RL_G0 + 1.2]) corners.push(rv(x, y, hh));
  for (const y of [3.5, 28.5]) corners.push(rv(9, y, RL_G0 + 7.4));   // (and the Great Lights' heads, with their labels)
  const v = new THREE.Vector3();
  const place = d => { C.position.set(0, Math.sin(pitch) * d, Math.cos(pitch) * d * dir); C.lookAt(0, RL_G0, 0); C.updateMatrixWorld(); C.matrixWorldInverse.copy(C.matrixWorld).invert(); let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; for (const c of corners) { v.copy(c).project(C); const px = (v.x + 1) / 2 * w, py = (1 - v.y) / 2 * h; a0 = Math.min(a0, px); a1 = Math.max(a1, px); b0 = Math.min(b0, py); b1 = Math.max(b1, py); } return [a0, a1, b0, b1]; };
  let lo = 8, hi = 400;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, b = place(m); if (b[1] - b[0] <= availW && b[3] - b[2] <= availH) hi = m; else lo = m; }
  const b = place(hi), cx = (b[0] + b[1]) / 2, cy = (b[2] + b[3]) / 2;
  C.setViewOffset(w, h, cx - (x0 + x1) / 2, cy - (y0 + y1) / 2, w, h); C.updateProjectionMatrix();
  RL3.right = new THREE.Vector3(dir, 0, 0);
}
// a tap on the screen to arena tiles (null off the arena's ground)
function rl3dPick(cx, cy) {
  if (!RL3.ok) return null;
  const rect = $('rlCv').getBoundingClientRect(), nx = (cx - rect.left) / rect.width * 2 - 1, ny = -((cy - rect.top) / rect.height * 2 - 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(nx, ny), RL3.cam);
  const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-5) return null;
  const k = (RL_G0 - o.y) / d.y; if (k < 0) return null;
  return { x: o.x + d.x * k + 9, y: 16 - (o.z + d.z * k) };
}
// arena tiles to the screen (for the HUD's labels over the towers)
function rl3dProject(x, y, h) { if (!RL3.ok) return null; const v = rv(x, y, h).project(RL3.cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: v.z < 1 }; }

// ---------- the towers ----------
function rl3dTowerPlain(kind, side) {
  const g = new THREE.Group(), great = kind === 'great', H = great ? 4.4 : 3.0, R = great ? 1.35 : 0.95, trim = side ? RL_THEIRS : RL_MINE;
  rlAdd(g, gCyl(R * 1.18, R * 1.3, 0.5, 10), rlMat(0x8a8178), [0, 0.25, 0]);
  rlAdd(g, gCyl(R * 0.72, R, H, 12), rlMat(0xf0ece2), [0, 0.5 + H / 2, 0]);
  for (const f of [0.3, 0.62]) rlAdd(g, gCyl(R * (1 - f * 0.28) * 1.015, R * (1 - (f - 0.06) * 0.28) * 1.015, H * 0.09, 12), rlMat(trim), [0, 0.5 + H * f, 0]);
  rlAdd(g, gBox(R * 0.3, R * 0.46, 0.06), rlMat(0x3a3030), [0, 0.5 + H * 0.15, R * 0.98]);
  rlAdd(g, gBox(R * 0.2, R * 0.24, 0.05), rlMat(0xffd27a, { em: 0x8a5a20 }), [0, 0.5 + H * 0.48, R * 0.85]);
  const top = 0.5 + H;
  rlAdd(g, gCyl(R * 0.95, R * 0.8, 0.16, 12), rlMat(0x3a3438), [0, top + 0.08, 0]);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; rlAdd(g, gBox(0.04, 0.3, 0.04), rlMat(0x2a2628), [Math.cos(a) * R * 0.9, top + 0.3, Math.sin(a) * R * 0.9]); }
  const lamp = rlAdd(g, gCyl(R * 0.5, R * 0.5, great ? 0.8 : 0.6, 10), rlMat(0xfff0b0, { em: 0xffc050 }), [0, top + (great ? 0.56 : 0.46), 0]);
  rlAdd(g, gCone(R * 0.62, great ? 0.6 : 0.5, 10), rlMat(trim), [0, top + (great ? 1.26 : 1.02), 0]);
  rlAdd(g, gSph(0.1, 6), rlMat(0x2a2628), [0, top + (great ? 1.6 : 1.3), 0]);
  g.userData.lamp = lamp;
  return g;
}
function rl3dTowersBuild() {
  for (const T of RL3.towers) { RL3.scene.remove(T.g); if (T.rubble) RL3.scene.remove(T.rubble); }
  RL3.towers = [];
  RL.T.forEach((t, i) => {
    const rel = t.side === RL.me ? 0 : 1, sk = RL.skins[t.side] || '';
    let m = null;
    if (typeof rlTowerMesh === 'function') { try { m = rlTowerMesh(sk, t.k, rel); } catch (e) { console.error(e); m = null; } }
    if (!m) m = rl3dTowerPlain(t.k, rel);
    const g = new THREE.Group(); g.add(m); g.position.copy(rv(t.x, t.y, RL_G0)); g.rotation.y = t.side ? Math.PI : 0; RL3.scene.add(g);
    const lampObj = m.userData && m.userData.lamp, lh = t.k === 'great' ? 5.4 : 3.9;
    // the glow round the lamp, and the beam that turns while the light's awake
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('glow'), color: 0xffd890, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.position.set(0, lh, 0); glow.scale.setScalar(t.k === 'great' ? 3.2 : 2.4); g.add(glow);
    const beam = new THREE.Group(); beam.position.set(0, lh, 0); g.add(beam);
    const bg = new THREE.ConeGeometry(1.1, 9, 12, 1, true); bg.translate(0, -4.5, 0); bg.rotateZ(Math.PI / 2);
    const bm = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    rlAdd(beam, bg, bm, [0, 0, 0], [0, 0, -0.12]); rlAdd(beam, bg, bm, [0, 0, 0], [0, Math.PI, -0.12]);
    const shadow = rlAdd(RL3.scene, new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: rlTex('shadow'), transparent: true, depthWrite: false }), null, [-Math.PI / 2, 0, 0], t.r * 1.9); shadow.position.copy(rv(t.x + 0.5, t.y - 0.4, RL_G0 + 0.02));
    RL3.towers.push({ g, m, lamp: lampObj, glow, beam, bm, lh, down: 0, fall: 0, shadow, hitT: -9, shotSeen: null });
  });
}
function rl3dRubble(t) {
  const g = new THREE.Group(), r = rlRng(t.id * 13 + 1);
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = r() * t.r * 1.1, k = 0.2 + r() * 0.45; rlAdd(g, gDod(1), rlMat(r() < 0.6 ? 0xd8d2c4 : 0x8a8178), [Math.cos(a) * d, k * 0.4, Math.sin(a) * d], [r() * 3, r() * 3, r() * 3], [k, k * 0.7, k]); }
  rlAdd(g, gCyl(t.r * 0.8, t.r * 1.0, 0.9, 10), rlMat(0xe8e2d4), [0, 0.45, 0]);
  g.position.copy(rv(t.x, t.y, RL_G0)); RL3.scene.add(g); return g;
}

// ---------- bars ----------
function rl3dBar(w, h) {
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('white'), color: 0x101418, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false, fog: false }));
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('white'), color: 0xffffff, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  bg.center.set(0.5, 0.5); fg.center.set(0, 0.5); bg.renderOrder = 8; fg.renderOrder = 9; bg.scale.set(w + 0.08, h + 0.08, 1); fg.scale.set(w, h, 1);
  RL3.scene.add(bg, fg); return { bg, fg, w, h };
}
function rl3dBarSet(B, pos, f, col, show) {
  B.bg.visible = B.fg.visible = !!show; if (!show) return;
  B.bg.position.copy(pos); B.fg.position.copy(pos).addScaledVector(RL3.right || new THREE.Vector3(1, 0, 0), -B.w / 2);
  B.fg.scale.x = Math.max(0.001, B.w * Math.max(0, Math.min(1, f))); B.fg.material.color.setHex(col);
}
function rl3dBarDrop(B) { if (B) RL3.scene.remove(B.bg, B.fg); }

// ---------- the units' models ----------
// a person: legs, a body, a head and two arms on shoulders that swing; o says what they wear and carry
function rlPerson(o) {
  const g = new THREE.Group(), s = o.s || 1, body = rlGrp(g, [0, 0, 0], 'body'), skin = rlMat(o.skin || 0xe0b08a);
  for (const sx of [-1, 1]) {
    const leg = rlGrp(body, [sx * 0.11 * s, 0.46 * s, 0], sx < 0 ? 'legL' : 'legR');
    if (!o.skirt) { rlAdd(leg, gBox(0.15 * s, 0.4 * s, 0.17 * s), rlMat(o.trou || 0x3a3a48), [0, -0.21 * s, 0]); rlAdd(leg, gBox(0.17 * s, 0.1 * s, 0.24 * s), rlMat(o.boot || 0x2a2220), [0, -0.42 * s, 0.03 * s]); }
  }
  if (o.skirt) rlAdd(body, gCone(0.3 * s, 0.62 * s, 8), rlMat(o.skirt), [0, 0.33 * s, 0], null, null, 'skirt');
  const tw = (o.wide || 1) * 0.44 * s;
  const torso = rlAdd(body, gBox(tw, 0.44 * s, 0.27 * s * (o.deep || 1)), rlMat(o.coat || 0x5a4a3a), [0, 0.7 * s, 0], null, null, 'torso');
  if (o.long) rlAdd(body, gBox(tw * 1.04, 0.3 * s, 0.29 * s), rlMat(o.coat), [0, 0.42 * s, -0.01]);
  if (o.trim !== undefined) rlAdd(body, gBox(tw * 1.04, 0.07 * s, 0.29 * s * (o.deep || 1)), rlMat(o.trim), [0, 0.52 * s, 0]);
  if (o.stripes) for (const y of [0.62, 0.78]) rlAdd(body, gBox(tw * 1.02, 0.05 * s, 0.28 * s), rlMat(o.stripes), [0, y * s, 0]);
  const head = rlGrp(body, [0, 1.06 * s, 0], 'head');
  rlAdd(head, gSph(0.15 * s * (o.bighead || 1), 8), skin, [0, 0, 0]);
  if (o.hat) o.hat(head, s);
  for (const sx of [-1, 1]) {
    const arm = rlGrp(body, [sx * (tw / 2 + 0.06 * s), 0.88 * s, 0], sx < 0 ? 'armL' : 'armR');
    rlAdd(arm, gBox(0.11 * s, 0.38 * s, 0.12 * s), rlMat(o.sleeve || o.coat || 0x5a4a3a), [0, -0.17 * s, 0]);
    rlAdd(arm, gSph(0.065 * s * (o.fist || 1), 6), o.glove ? rlMat(o.glove) : skin, [0, -0.38 * s, 0]);
    if (sx > 0 && o.right) o.right(arm, s); if (sx < 0 && o.left) o.left(arm, s);
  }
  if (o.extra) o.extra(body, s);
  return g;
}
const hatCap = col => (h, s) => { rlAdd(h, gCyl(0.15 * s, 0.155 * s, 0.09 * s, 8), rlMat(col), [0, 0.1 * s, 0]); rlAdd(h, gBox(0.2 * s, 0.025 * s, 0.12 * s), rlMat(col), [0, 0.07 * s, 0.13 * s]); };
const hatBrim = (col, w) => (h, s) => { rlAdd(h, gCyl((w || 0.3) * s, (w || 0.3) * s, 0.03 * s, 10), rlMat(col), [0, 0.08 * s, 0]); rlAdd(h, gCyl(0.13 * s, 0.15 * s, 0.14 * s, 8), rlMat(col), [0, 0.16 * s, 0]); };
// a crab (shore crabs, the hermit's legs, the Crab King): a flat shell, claws that pinch, legs that scuttle
function rlCrab(o) {
  const g = new THREE.Group(), s = o.s || 1, body = rlGrp(g, [0, 0, 0], 'body'), shell = rlMat(o.col), dark = rlMat(o.leg || o.col);
  rlAdd(body, gSph(0.4 * s, 9), shell, [0, 0.3 * s, 0], null, [1.15, 0.42, 0.85]);
  rlAdd(body, gSph(0.32 * s, 7), rlMat(o.belly || 0xe8c8a0), [0, 0.24 * s, 0.02], null, [1.0, 0.3, 0.72]);
  const legs = rlGrp(body, [0, 0, 0], 'legs');
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const l = rlGrp(legs, [sx * 0.36 * s, 0.24 * s, (-0.16 + i * 0.16) * s]); l.rotation.z = sx * -0.6; rlAdd(l, gBox(0.36 * s, 0.05 * s, 0.05 * s), dark, [sx * 0.16 * s, -0.05 * s, 0], [0, 0, sx * 0.8]); }
  for (const sx of [-1, 1]) {
    const cl = rlGrp(body, [sx * 0.3 * s, 0.32 * s, 0.32 * s], sx < 0 ? 'clawL' : 'clawR');
    rlAdd(cl, gBox(0.08 * s, 0.08 * s, 0.26 * s), dark, [0, 0, 0.1 * s], [0, sx * 0.4, 0]);
    rlAdd(cl, gSph(0.13 * s, 7), shell, [sx * 0.06 * s, 0.02 * s, 0.28 * s], null, [0.9, 0.7, 1.2]);
    rlAdd(cl, gBox(0.05 * s, 0.05 * s, 0.16 * s), dark, [sx * 0.1 * s, 0.06 * s, 0.4 * s]);
  }
  for (const sx of [-1, 1]) { rlAdd(body, gCyl(0.02 * s, 0.02 * s, 0.14 * s, 4), dark, [sx * 0.1 * s, 0.43 * s, 0.24 * s]); rlAdd(body, gSph(0.04 * s, 5), rlMat(0x101010), [sx * 0.1 * s, 0.51 * s, 0.24 * s]); }
  return g;
}
// a bird: a body, wings that flap, a beak, a tail
function rlBird(o) {
  const g = new THREE.Group(), s = o.s || 1, body = rlGrp(g, [0, 0, 0], 'body');
  rlAdd(body, gSph(0.22 * s, 8), rlMat(o.col), [0, 0, 0], null, [0.75, 0.7, 1.5]);
  const hd = rlAdd(body, gSph(0.12 * s, 7), rlMat(o.head || o.col), [0, 0.1 * s + (o.neck || 0) * s, 0.3 * s + (o.neck || 0) * 0.6 * s]);
  if (o.neck) rlAdd(body, gCyl(0.06 * s, 0.08 * s, o.neck * s * 1.1, 6), rlMat(o.col), [0, 0.06 * s + o.neck * 0.5 * s, 0.26 * s + o.neck * 0.3 * s], [0.6, 0, 0]);
  rlAdd(body, gCone(0.045 * s, 0.2 * s * (o.beak || 1), 5), rlMat(o.bk || 0xe8b030), [0, hd.position.y - 0.01, hd.position.z + 0.14 * s * (o.beak || 1)], [Math.PI / 2, 0, 0]);
  rlAdd(body, gCone(0.12 * s, 0.3 * s, 4), rlMat(o.tail || o.wing), [0, 0.02 * s, -0.4 * s], [-Math.PI / 2, 0, 0], [1, 1, 0.3], 'tail');
  for (const sx of [-1, 1]) {
    const w = rlGrp(body, [sx * 0.12 * s, 0.06 * s, 0], sx < 0 ? 'wingL' : 'wingR');
    rlAdd(w, gBox(0.55 * s * (o.span || 1), 0.03 * s, 0.26 * s), rlMat(o.wing), [sx * 0.28 * s * (o.span || 1), 0, 0]);
    if (o.tip) rlAdd(w, gBox(0.18 * s, 0.035 * s, 0.22 * s), rlMat(o.tip), [sx * 0.58 * s * (o.span || 1), 0, -0.02]);
  }
  return g;
}
function rlFlame(par, p, k, name) { const f = rlGrp(par, p, name || 'flame'); rlAdd(f, gCone(0.09 * k, 0.26 * k, 6), rlMat(0xffb040, { em: 0xff8020 }), [0, 0.1 * k, 0]); rlAdd(f, gCone(0.05 * k, 0.16 * k, 5), rlMat(0xfff0a0, { em: 0xffe080 }), [0, 0.08 * k, 0]); return f; }
function rlLantern(par, p, s, col, name) { const l = rlGrp(par, p, name); rlAdd(l, gBox(0.12 * s, 0.16 * s, 0.12 * s), rlMat(col || 0xffe090, { em: col || 0xffb040 }), [0, 0, 0]); rlAdd(l, gCone(0.1 * s, 0.07 * s, 4), rlMat(0x2a2420), [0, 0.11 * s, 0], [0, Math.PI / 4, 0]); rlAdd(l, gBox(0.02 * s, 0.1 * s, 0.02 * s), rlMat(0x2a2420), [0, 0.18 * s, 0]); return l; }
// every card's model, facing +z, one tile about a person's height; trim is the side's colour (blue yours, red theirs)
function rl3dBuild(c, trim) {
  const TR = trim, W = rlMat;
  switch (c) {
    case 'mudlarks': return rlPerson({ s: 0.66, skin: 0xd8a880, coat: 0x8a6a48, trou: 0xd8a880, boot: 0x5a4030, trim: TR, bighead: 1.15, sleeve: 0x7a5a3a,
      hat: (h, s) => rlAdd(h, gSph(0.185 * s, 7), W(0x4a3020), [0, 0.06 * s, -0.03 * s], null, [1, 0.75, 1]), right: (a, s) => rlAdd(a, gBox(0.03, 0.03, 0.18), W(0xb8b8b8), [0, -0.4 * s, 0.08]) });
    case 'deckhand': return rlPerson({ coat: 0xeae6dc, stripes: 0x24305a, trou: 0x2c3448, trim: 0x2a2220, hat: (h, s) => { rlAdd(h, gCyl(0.15 * s, 0.16 * s, 0.12 * s, 8), W(TR), [0, 0.1 * s, 0]); rlAdd(h, gSph(0.05 * s, 5), W(TR), [0, 0.19 * s, 0]); },
      right: (a, s) => rlAdd(a, gCyl(0.035, 0.05, 0.36, 6), W(0x8a6038), [0, -0.42 * s, 0.12], [1.3, 0, 0]) });
    case 'shorecrabs': { const g = rlCrab({ s: 0.62, col: 0xc85a2a, leg: 0xa04420, belly: 0xe8b890 }); rlAdd(g, gTor(0.32, 0.03, 16), W(TR), [0, 0.2, 0], [Math.PI / 2, 0, 0]); return g; }
    case 'powdermonkey': return rlPerson({ s: 0.7, coat: TR, trou: 0x6a5a48, skin: 0xd8a880, bighead: 1.1, hat: hatCap(0x3a3028),
      extra: (b, s) => { const k = rlGrp(b, [0, 1.0 * s, -0.24 * s]); rlAdd(k, gCyl(0.2 * s, 0.2 * s, 0.34 * s, 10), W(0x7a5030), [0, 0, 0], [0, 0, Math.PI / 2]); for (const x of [-0.12, 0.12]) rlAdd(k, gCyl(0.205 * s, 0.205 * s, 0.035 * s, 10), W(0x2a2626), [x * s, 0, 0], [0, 0, Math.PI / 2]); rlAdd(k, gCyl(0.012, 0.012, 0.16, 4), W(0x2a2626), [0, 0.24 * s, 0]); rlFlame(k, [0, 0.3 * s, 0], 0.7); },
      left: a => { a.rotation.x = -2.6; }, right: a => { a.rotation.x = -2.6; } });
    case 'wreckers': return rlPerson({ coat: 0x3a3430, trou: 0x2a2826, long: 1, trim: TR, skin: 0xc89878, hat: hatBrim(0x221e1c, 0.28),
      left: (a, s) => rlLantern(a, [0, -0.46 * s, 0.05], s, 0xffd070, 'lamp'), right: (a, s) => rlAdd(a, gBox(0.04, 0.04, 0.62), W(0x3a3a40), [0, -0.38 * s, 0.22], [0.5, 0, 0]) });
    case 'harpooner': return rlPerson({ coat: 0xd8b23a, sleeve: 0xd8b23a, trou: 0x6a5a30, trim: TR, boot: 0x1e1e1e,
      hat: (h, s) => { rlAdd(h, gCyl(0.16 * s, 0.16 * s, 0.1 * s, 8), W(0xd8b23a), [0, 0.1 * s, 0]); rlAdd(h, gBox(0.36 * s, 0.025 * s, 0.4 * s), W(0xc8a230), [0, 0.06 * s, -0.04 * s], [-0.25, 0, 0]); },
      right: (a, s) => { const h = rlGrp(a, [0, -0.38 * s, 0.05]); h.rotation.x = 1.0; rlAdd(h, gCyl(0.025, 0.025, 1.3, 5), W(0x8a6a40), [0, 0.3, 0]); rlAdd(h, gCone(0.05, 0.18, 5), W(0xb8b8c0), [0, 1.0, 0]); } });
    case 'drowned': case 'drownedcrew': {
      const k = c === 'drowned' ? 1.05 : 0.86;
      const g = rlPerson({ s: k, skin: 0x8aa88a, coat: 0x2e4250, trou: 0x26343c, trim: TR, boot: 0x1e2824,
        hat: (h, s) => { rlAdd(h, gSph(0.155 * s, 7), W(0x3a4a30), [0, 0.05 * s, -0.03 * s], null, [1, 0.7, 1]); for (let i = 0; i < 4; i++) rlAdd(h, gCone(0.03 * s, 0.26 * s, 4), W(0x4a6a30), [(-0.1 + i * 0.07) * s, -0.06 * s, -0.12 * s], [0.3, 0, (i - 1.5) * 0.2]); },
        extra: (b, s) => { for (let i = 0; i < 5; i++) rlAdd(b, gCone(0.03 * s, 0.3 * s, 4), W(i % 2 ? 0x3e6a2e : 0x5a7a34), [(-0.18 + i * 0.09) * s, 0.42 * s, 0.14 * s], [Math.PI, 0, 0]); } });
      const B = g.getObjectByName('body'); B.rotation.x = 0.18;
      for (const n of ['armL', 'armR']) g.getObjectByName(n).rotation.x = -1.2;
      return g;
    }
    case 'gulls': return rlBird({ s: 0.9, col: 0xf2f2ee, wing: 0x9aa4ae, tip: 0x222428, tail: 0xe8e8e4, bk: 0xf0c030 });
    case 'fogwraith': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), m = W(0xd8e6f0, { op: 0.5 }), m2 = W(0xb8c8d8, { op: 0.4 });
      rlAdd(b, gCone(0.38, 1.0, 9), m, [0, 0.6, 0]); rlAdd(b, gSph(0.2, 8), m, [0, 1.12, 0.02]);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; rlAdd(b, gCone(0.09, 0.4, 4), m2, [Math.cos(a) * 0.3, 0.08, Math.sin(a) * 0.3], [Math.PI, 0, 0]); }
      for (const sx of [-1, 1]) { rlAdd(b, gSph(0.04, 5), W(0x9ff0ff, { em: 0x60e0ff }), [sx * 0.07, 1.14, 0.17]); const a = rlGrp(b, [sx * 0.26, 0.86, 0], sx < 0 ? 'armL' : 'armR'); rlAdd(a, gCone(0.07, 0.6, 5), m2, [0, -0.25, 0.05], [Math.PI, 0, 0]); }
      rlAdd(b, gTor(0.3, 0.03, 14), W(TR, { op: 0.8 }), [0, 0.95, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'coastguard': return rlPerson({ coat: 0x24407a, sleeve: 0x24407a, trou: 0x1c2438, trim: 0xeae6dc,
      hat: (h, s) => { rlAdd(h, gCyl(0.16 * s, 0.15 * s, 0.1 * s, 8), W(0x1a2440), [0, 0.11 * s, 0]); rlAdd(h, gCyl(0.162 * s, 0.162 * s, 0.03 * s, 8), W(TR), [0, 0.08 * s, 0]); rlAdd(h, gBox(0.18 * s, 0.02 * s, 0.1 * s), W(0x101010), [0, 0.07 * s, 0.14 * s]); },
      extra: (b, s) => { rlAdd(b, gBox(0.05 * s, 0.5 * s, 0.29 * s), W(0xeae6dc), [0, 0.7 * s, 0], [0, 0, 0.7]); rlAdd(b, gBox(0.05 * s, 0.5 * s, 0.29 * s), W(0xeae6dc), [0, 0.7 * s, 0], [0, 0, -0.7]); },
      right: (a, s) => rlAdd(a, gBox(0.05, 0.06, 0.7), W(0x3a2e24), [-0.05, -0.36 * s, 0.22], [0.2, 0, 0]) });
    case 'cormorant': return rlBird({ s: 1.2, col: 0x1c1e22, wing: 0x24302e, tail: 0x18181a, head: 0x202428, bk: 0x6a5a30, neck: 0.22, beak: 1.3, span: 1.1 });
    case 'gannet': return rlBird({ s: 1.25, col: 0xf6f4ee, wing: 0xf0eee6, tip: 0x1a1a1c, head: 0xe8d090, bk: 0x9aa0a8, beak: 1.5, span: 1.35 });
    case 'diver': return rlPerson({ s: 1.18, wide: 1.25, deep: 1.25, coat: 0x8a7e66, sleeve: 0x8a7e66, trou: 0x8a7e66, boot: 0x3a3c40, glove: 0x5a5048, fist: 1.6, trim: TR,
      hat: (h, s) => { rlAdd(h, gSph(0.24 * s, 10), W(0xd09a3a, { em: 0x2a1a00 }), [0, 0.02 * s, 0]); rlAdd(h, gCyl(0.09 * s, 0.09 * s, 0.05 * s, 10), W(0x2a3a40), [0, 0.02 * s, 0.22 * s], [Math.PI / 2, 0, 0]); rlAdd(h, gTor(0.09 * s, 0.02 * s, 12), W(0xb08030), [0, 0.02 * s, 0.24 * s]); for (const sx of [-1, 1]) rlAdd(h, gCyl(0.06 * s, 0.06 * s, 0.04 * s, 8), W(0x2a3a40), [sx * 0.22 * s, 0.03 * s, 0], [0, 0, Math.PI / 2]); },
      extra: (b, s) => { rlAdd(b, gBox(0.56 * s, 0.14 * s, 0.4 * s), W(0xc0903a), [0, 0.92 * s, 0]); rlAdd(b, gTor(0.18 * s, 0.03 * s, 10), W(0x3a3a3a), [0, 0.95 * s, -0.24 * s], [0, 0, 0]); for (const sx of [-1, 1]) rlAdd(b, gBox(0.2 * s, 0.14 * s, 0.3 * s), W(0x3a3c40), [sx * 0.11 * s, 0.05 * s, 0.03 * s]); } });
    case 'bosun': return rlPerson({ s: 1.08, wide: 1.15, coat: 0x2a3050, sleeve: 0xe8e2d4, trou: 0x3a2a20, trim: 0xb8282a, skin: 0xd09a70,
      hat: (h, s) => { rlAdd(h, gSph(0.158 * s, 7), W(TR), [0, 0.05 * s, -0.01], null, [1, 0.65, 1]); rlAdd(h, gBox(0.2 * s, 0.12 * s, 0.1 * s), W(0x3a2618), [0, -0.12 * s, 0.1 * s]); },
      right: (a, s) => { const cut = rlGrp(a, [0, -0.38 * s, 0.05]); cut.rotation.x = 0.9; rlAdd(cut, gBox(0.03, 0.6, 0.08), W(0xd8dce0), [0, 0.34, 0.02], [0.1, 0, 0]); rlAdd(cut, gBox(0.14, 0.03, 0.08), W(0xc09040), [0, 0.04, 0]); } });
    case 'lamplighter': return rlPerson({ skirt: 0x4a3a50, coat: 0x6a7a5a, sleeve: 0x6a7a5a, trim: TR,
      hat: (h, s) => { rlAdd(h, gSph(0.17 * s, 8), W(0x5a4a40), [0, 0.04 * s, -0.04 * s], null, [1, 0.9, 1.05]); rlAdd(h, gTor(0.15 * s, 0.03 * s, 10), W(0x5a4a40), [0, 0.02 * s, 0.02 * s]); },
      extra: (b, s) => rlAdd(b, gBox(0.52 * s, 0.18 * s, 0.32 * s), W(0x8a8a6a), [0, 0.84 * s, 0], [0, 0, 0]),
      right: (a, s) => { const p = rlGrp(a, [0, -0.38 * s, 0.05]); p.rotation.x = 0.55; rlAdd(p, gCyl(0.022, 0.022, 1.7, 5), W(0x5a4228), [0, 0.6, 0]); rlAdd(p, gBox(0.08, 0.1, 0.08), W(0x2a2626), [0, 1.42, 0]); rlFlame(p, [0, 1.48, 0], 1.0); } });
    case 'hermit': {
      const g = rlCrab({ s: 1.05, col: 0xc84a3a, leg: 0xa03a2a, belly: 0xe8a888 }), sh = rlGrp(g.getObjectByName('body'), [0, 0.5, -0.16], 'shell');
      sh.rotation.x = -1.2;
      for (let i = 0; i < 5; i++) { const k = 1 - i * 0.17; rlAdd(sh, gTor(0.34 * k, 0.15 * k, 12), W(i % 2 ? 0xd8c8a8 : 0xb89a78), [0, i * 0.17, 0], [Math.PI / 2, 0, i * 0.6]); }
      rlAdd(sh, gCone(0.14, 0.4, 8), W(0xc8b494), [0, 0.92, 0]);
      rlAdd(g, gTor(0.62, 0.04, 18), W(TR), [0, 0.18, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'mooncusser': return rlPerson({ s: 1.12, coat: 0x1a1820, sleeve: 0x1a1820, trou: 0x1a1820, long: 1, skin: 0xb8b0a0, trim: TR,
      hat: (h, s) => { rlAdd(h, gCone(0.22 * s, 0.4 * s, 8), W(0x16141a), [0, 0.1 * s, -0.04 * s]); rlAdd(h, gSph(0.18 * s, 8), W(0x16141a), [0, 0.0, -0.06 * s], null, [1, 1, 0.9]); },
      extra: (b, s) => rlAdd(b, gCone(0.38 * s, 0.6 * s, 8), W(0x16141a), [0, 0.32 * s, 0]),
      right: (a, s) => { const p = rlGrp(a, [0, -0.38 * s, 0.05]); p.rotation.x = 0.4; rlAdd(p, gCyl(0.025, 0.025, 1.6, 5), W(0x2a2220), [0, 0.6, 0]); rlAdd(p, gBox(0.36, 0.03, 0.03), W(0x2a2220), [0, 1.38, 0.06], [0, Math.PI / 2, 0]); const l = rlLantern(p, [0, 1.15, 0.24], 1.6, 0xe0ffc0, 'lamp'); l.userData.swing = 1; } });
    case 'lightkeeper': return rlPerson({ coat: 0x1e2a44, sleeve: 0x1e2a44, trou: 0x1a2030, trim: TR, skin: 0xe0b090,
      hat: (h, s) => { rlAdd(h, gCyl(0.16 * s, 0.15 * s, 0.11 * s, 8), W(0x141a2a), [0, 0.11 * s, 0]); rlAdd(h, gBox(0.2 * s, 0.02 * s, 0.11 * s), W(0x101010), [0, 0.06 * s, 0.14 * s]); rlAdd(h, gBox(0.06 * s, 0.05 * s, 0.02 * s), W(0xe0b040, { em: 0x403000 }), [0, 0.12 * s, 0.16 * s]); rlAdd(h, gBox(0.24 * s, 0.12 * s, 0.1 * s), W(0xd8d4cc), [0, -0.1 * s, 0.09 * s]); },
      extra: (b, s) => { for (let i = 0; i < 3; i++) rlAdd(b, gSph(0.022 * s, 4), W(0xe0b040), [0.06 * s, (0.6 + i * 0.1) * s, 0.14 * s]); },
      right: (a, s) => { a.rotation.x = -0.6; rlAdd(a, gBox(0.06, 0.08, 0.22), W(0x2a2a2a), [0, -0.42 * s, 0.1]); rlAdd(a, gCyl(0.05, 0.04, 0.08, 8), W(0x3a3a3a), [0, -0.42 * s, 0.24], [Math.PI / 2, 0, 0]); } });
    case 'keelback': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), skin = W(0x2e4a46), belly = W(0x8a9a6a), ridge = W(0x1a2a28);
      for (let i = 0; i < 7; i++) {
        const k = 1 - i * 0.1, sg = rlGrp(b, [0, 0, 0.7 - i * 0.42], 'seg' + i);
        rlAdd(sg, gSph(0.36 * k, 8), skin, [0, 0.32 * k, 0], null, [1, 0.8, 1.3]);
        rlAdd(sg, gSph(0.3 * k, 6), belly, [0, 0.2 * k, 0], null, [0.95, 0.45, 1.2]);
        rlAdd(sg, gCone(0.12 * k, 0.42 * k, 4), ridge, [0, 0.62 * k, 0], [0, Math.PI / 4, 0], [0.4, 1, 1.2]);
        if (i === 0) { rlAdd(sg, gBox(0.36, 0.2, 0.5), skin, [0, 0.3, 0.38]); for (const sx of [-1, 1]) rlAdd(sg, gSph(0.06, 5), W(0xffe040, { em: 0xffc000 }), [sx * 0.17, 0.42, 0.44]); rlAdd(sg, gBox(0.34, 0.05, 0.3), W(0xf0e8d8), [0, 0.2, 0.52]); }
      }
      rlAdd(g, gTor(0.62, 0.04, 18), W(TR), [0, 0.06, 0.1], [Math.PI / 2, 0, 0], [1, 1.9, 1]);
      return g;
    }
    case 'kelp': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), r = rlRng(31), cols = [0x2e4a24, 0x3e5a2a, 0x4a5a26, 0x5a4a22];
      for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * 0.4; rlAdd(b, gDod(0.34 + r() * 0.2), W(cols[i % 4]), [Math.cos(a) * d, 0.5 + r() * 0.7, Math.sin(a) * d], [r() * 3, r() * 3, 0]); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, f = rlGrp(b, [Math.cos(a) * 0.55, 1.2 + r() * 0.3, Math.sin(a) * 0.55], 'frond' + i); f.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); rlAdd(f, gCone(0.06, 1.0 + r() * 0.4, 4), W(cols[(i + 1) % 4]), [0, -0.5, 0], [Math.PI, 0, 0]); }
      for (const sx of [-1, 1]) { rlAdd(b, gSph(0.07, 5), W(0xffa040, { em: 0xd06000 }), [sx * 0.16, 1.25, 0.48]); const a = rlGrp(b, [sx * 0.62, 1.1, 0.1], sx < 0 ? 'armL' : 'armR'); rlAdd(a, gCyl(0.08, 0.05, 0.9, 5), W(0x3a5a26), [0, -0.42, 0]); }
      rlAdd(g, gTor(0.8, 0.045, 18), W(TR), [0, 0.06, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'crabking': {
      const g = rlCrab({ s: 1.75, col: 0x8a2a2e, leg: 0x6a1e22, belly: 0xc8806a }), b = g.getObjectByName('body'), r = rlRng(9);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; rlAdd(b, gCone(0.07, i % 2 ? 0.26 : 0.4, 6), W(i % 2 ? 0xc8c0b0 : 0xe8e0d0), [Math.cos(a) * 0.24, 0.82, Math.sin(a) * 0.2], [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]); }
      rlAdd(b, gTor(0.24, 0.05, 12), W(0xd8c890), [0, 0.76, 0], [Math.PI / 2, 0, 0], [1, 0.85, 1]);
      for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 0.3 + r() * 0.35; rlAdd(b, gCone(0.06, 0.1, 5), W(0xd0c8b8), [Math.cos(a) * d, 0.6 + (0.65 - d) * 0.25, Math.sin(a) * d * 0.8]); }
      rlAdd(g, gTor(0.95, 0.05, 20), W(TR), [0, 0.12, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'battery': {
      const g = new THREE.Group(), st = W(0x8a8276);
      rlAdd(g, gCyl(0.85, 0.95, 0.5, 8), st, [0, 0.25, 0]);
      for (let i = 0; i < 8; i++) { if (i === 0) continue; const a = i / 8 * Math.PI * 2; rlAdd(g, gBox(0.42, 0.32, 0.26), W(0x9a9286), [Math.sin(a) * 0.82, 0.62, Math.cos(a) * 0.82], [0, a, 0]); }
      const gun = rlGrp(g, [0, 0.62, 0], 'gun');
      rlAdd(gun, gBox(0.5, 0.22, 0.6), W(0x5a3e26), [0, 0, -0.05]); rlAdd(gun, gCyl(0.12, 0.17, 1.1, 10), W(0x2a2a2e), [0, 0.16, 0.35], [Math.PI / 2, 0, 0]); rlAdd(gun, gTor(0.12, 0.03, 10), W(0x2a2a2e), [0, 0.16, 0.9]);
      rlAdd(g, gCyl(0.97, 0.97, 0.08, 16), W(TR), [0, 0.04, 0]);
      return g;
    }
    case 'swivel': {
      const g = new THREE.Group();
      rlAdd(g, gCyl(0.7, 0.8, 0.22, 8), W(0x6a5a48), [0, 0.11, 0]); rlAdd(g, gCyl(0.1, 0.13, 1.1, 6), W(0x5a4228), [0, 0.75, 0]);
      const gun = rlGrp(g, [0, 1.32, 0], 'gun');
      rlAdd(gun, gBox(0.28, 0.08, 0.06), W(0x2a2a2e), [0, -0.05, 0]); rlAdd(gun, gCyl(0.06, 0.08, 1.0, 8), W(0x3a3a40), [0, 0.04, 0.2], [Math.PI / 2, 0, 0]); rlAdd(gun, gBox(0.04, 0.04, 0.4), W(0x5a4228), [0, 0.02, -0.4]);
      rlAdd(g, gCyl(0.82, 0.82, 0.06, 16), W(TR), [0, 0.03, 0]);
      return g;
    }
    case 'bellbuoy': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body');
      rlAdd(b, gCyl(0.55, 0.75, 0.5, 10), W(0xb83028), [0, 0.3, 0]); rlAdd(b, gCyl(0.76, 0.76, 0.1, 10), W(0xe8e2d4), [0, 0.12, 0]);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; rlAdd(b, gBox(0.05, 1.1, 0.05), W(0x2a2624), [Math.cos(a) * 0.4, 1.05, Math.sin(a) * 0.4], [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18]); }
      rlAdd(b, gCyl(0.2, 0.2, 0.06, 8), W(0x2a2624), [0, 1.62, 0]);
      const bell = rlGrp(b, [0, 1.48, 0], 'bell'); rlAdd(bell, gCyl(0.14, 0.26, 0.36, 10), W(0xd0a040, { em: 0x2a1800 }), [0, -0.22, 0]); rlAdd(bell, gSph(0.05, 5), W(0x2a2624), [0, -0.44, 0]);
      rlAdd(g, gCyl(0.9, 0.9, 0.06, 16), W(TR), [0, 0.03, 0]);
      return g;
    }
    case 'wreckfire': {
      const g = new THREE.Group(), r = rlRng(4);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; rlAdd(g, gDod(0.16 + r() * 0.06), W(0x6a625a), [Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62]); }
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI; rlAdd(g, gCyl(0.06, 0.07, 0.9, 5), W(0x4a3020), [0, 0.12, 0], [Math.PI / 2, 0, a], null); }
      const f = rlGrp(g, [0, 0.12, 0], 'flame'); rlAdd(f, gCone(0.36, 0.9, 7), W(0xff8a2a, { em: 0xff5a10 }), [0, 0.45, 0]); rlAdd(f, gCone(0.22, 0.62, 6), W(0xffe080, { em: 0xffc040 }), [0, 0.36, 0]);
      rlAdd(g, gCyl(0.04, 0.05, 2.0, 5), W(0x3a2a20), [0.72, 1.0, -0.3]); rlLantern(g, [0.72, 1.9, -0.3], 2.0, 0xffd070, 'lamp');
      rlAdd(g, gCyl(0.92, 0.92, 0.06, 16), W(TR), [0, 0.03, 0]);
      return g;
    }
  }
  return rl3dBuild2(c, TR) || rlPerson({ coat: 0x6a6a6a, trim: TR });
}
// the second 32's models (v200), built as the first: facing +z, a person about a tile high, trim the side's colour.
// A model drawn at its natural size and then shrunk or grown sits in a group of its own (rlWrap), so the placement
// ghost (which scales the clone) and the dying fall (which scales the holder) leave its own scale alone.
function rlWrap(g, k) { const o = new THREE.Group(); g.scale.setScalar(k); o.add(g); return o; }
function rlGlowSpr(par, p, col, k, name) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('glow'), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.position.set(p[0], p[1], p[2]); s.scale.setScalar(k); if (name) s.name = name; par.add(s); return s; }
function rlNetMat() { return RL3M.net || (RL3M.net = new THREE.MeshBasicMaterial({ color: 0x8a8a60, wireframe: true })); }
function rl3dBuild2(c, TR) {
  const W = rlMat;
  switch (c) {
    case 'bilgerats': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), fur = W(0x5e5248), pink = W(0xd89a90);
      rlAdd(b, gSph(0.22, 8), fur, [0, 0.21, -0.02], null, [0.8, 0.72, 1.35]);
      const hd = rlGrp(b, [0, 0.25, 0.26], 'head'); rlAdd(hd, gCone(0.13, 0.32, 7), fur, [0, 0, 0.12], [Math.PI / 2, 0, 0]); rlAdd(hd, gSph(0.035, 5), pink, [0, 0, 0.28]);
      for (const sx of [-1, 1]) { rlAdd(hd, gCyl(0.075, 0.075, 0.02, 7), pink, [sx * 0.09, 0.1, -0.01], [Math.PI / 2, 0, sx * 0.3]); rlAdd(hd, gSph(0.025, 4), W(0x101010), [sx * 0.065, 0.05, 0.08]); }
      for (const [n, z] of [['legL', 0.14], ['legR', -0.14]]) { const l = rlGrp(b, [0, 0.13, z], n); for (const sx of [-1, 1]) rlAdd(l, gBox(0.05, 0.13, 0.06), pink, [sx * 0.11, -0.06, 0]); }
      const tl = rlGrp(b, [0, 0.2, -0.3], 'tail'); for (let i = 0; i < 4; i++) rlAdd(tl, gCyl(0.018, 0.026, 0.17, 4), pink, [0, 0.03 * i, -0.08 - i * 0.15], [Math.PI / 2 - 0.2 * i, 0, 0]);
      rlAdd(b, gTor(0.15, 0.03, 10), W(TR), [0, 0.23, 0.16]);
      return rlWrap(g, 0.8);
    }
    case 'wisp': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body');
      rlAdd(b, gIco(0.13, 1), W(0xf4ffe0, { basic: 1 }), [0, 0, 0], null, null, 'orb');
      rlAdd(b, gSph(0.24, 10), W(0xb8ff90, { add: 1, op: 0.32 }), [0, 0, 0], null, null, 'halo');
      rlGlowSpr(b, [0, 0, 0], 0x9cff70, 1.4, 'glow');
      for (let i = 0; i < 3; i++) rlAdd(b, gCone(0.07 - i * 0.017, 0.36, 5), W(0xd8ffb0, { add: 1, op: 0.45 }), [Math.sin(i * 2.1) * 0.05, -0.04 * i, -0.22 - i * 0.13], [-Math.PI / 2, 0, 0]);
      const o = rlGrp(b, [0, 0, 0], 'orbit'); rlAdd(o, gSph(0.05, 5), W(TR, { basic: 1 }), [0.3, 0, 0]); rlAdd(o, gSph(0.04, 5), W(TR, { basic: 1 }), [-0.26, 0.06, 0]);
      return g;
    }
    case 'shipscat': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), fur = W(0xd8883a), dk = W(0x8a4a1e), wh = W(0xf2ece0);
      rlAdd(b, gSph(0.2, 8), fur, [0, 0.36, -0.02], null, [0.8, 0.78, 1.5]);
      for (let i = 0; i < 3; i++) rlAdd(b, gBox(0.26, 0.04, 0.06), dk, [0, 0.505, -0.16 + i * 0.13]);
      rlAdd(b, gSph(0.12, 6), wh, [0, 0.3, 0.17], null, [0.9, 1, 0.8]);
      const hd = rlGrp(b, [0, 0.55, 0.3], 'head'); rlAdd(hd, gSph(0.15, 8), fur, [0, 0, 0], null, [1, 0.9, 0.95]); rlAdd(hd, gSph(0.07, 6), wh, [0, -0.04, 0.11], null, [1.25, 0.8, 0.8]);
      for (const sx of [-1, 1]) { rlAdd(hd, gCone(0.06, 0.14, 4), fur, [sx * 0.09, 0.15, -0.01], [0, 0, -sx * 0.25]); rlAdd(hd, gSph(0.032, 5), W(0x9ad040, { em: 0x405010 }), [sx * 0.065, 0.03, 0.13]); }
      for (const [n, z] of [['legL', 0.17], ['legR', -0.19]]) { const l = rlGrp(b, [0, 0.3, z], n); for (const sx of [-1, 1]) { rlAdd(l, gBox(0.07, 0.28, 0.08), fur, [sx * 0.09, -0.14, 0]); rlAdd(l, gBox(0.08, 0.05, 0.1), wh, [sx * 0.09, -0.28, 0.01]); } }
      const tl = rlGrp(b, [0, 0.42, -0.3], 'tail'); rlAdd(tl, gCyl(0.03, 0.045, 0.46, 5), fur, [0, 0.18, -0.08], [-0.4, 0, 0]); rlAdd(tl, gSph(0.045, 5), dk, [0, 0.4, -0.17]);
      rlAdd(b, gTor(0.11, 0.028, 10), W(TR), [0, 0.47, 0.26], [0.5, 0, 0]);
      return rlWrap(g, 1.0);
    }
    case 'puffins': {
      const g = rlBird({ s: 0.72, col: 0x1c1c22, wing: 0x1c1c22, tail: 0x1c1c22, head: 0xeeeee6, bk: 0xff7020, beak: 0.9 }), b = g.getObjectByName('body');
      rlAdd(b, gSph(0.16, 7), W(0xf2f0ea), [0, -0.05, 0.08], null, [0.8, 0.75, 1.3]);
      rlAdd(b, gSph(0.09, 6), W(0x1c1c22), [0, 0.15, 0.2], null, [1, 0.7, 1]);
      rlAdd(b, gBox(0.07, 0.1, 0.12), W(0xff6a1a), [0, 0.06, 0.34], [0.2, 0, 0]); rlAdd(b, gBox(0.072, 0.03, 0.05), W(0xffd040), [0, 0.1, 0.32]);
      for (const sx of [-1, 1]) rlAdd(b, gBox(0.06, 0.02, 0.1), W(0xff7a20), [sx * 0.06, -0.15, -0.12]);
      rlAdd(b, gTor(0.12, 0.022, 10), W(TR), [0, 0.0, 0.18]);
      return g;
    }
    case 'fishwives': return rlPerson({ skirt: 0x5a4a6a, coat: 0x6a5a7a, sleeve: 0xe8e0d0, trim: TR, skin: 0xe0a888,
      hat: (h, s) => { rlAdd(h, gSph(0.165 * s, 8), W(0xd8b048), [0, 0.04 * s, -0.02 * s], null, [1, 0.85, 1.05]); rlAdd(h, gCone(0.06 * s, 0.12 * s, 4), W(0xd8b048), [0, -0.02 * s, -0.17 * s], [-1.2, 0, 0]); },
      extra: (b, s) => rlAdd(b, gBox(0.36 * s, 0.6 * s, 0.04 * s), W(0xece6da), [0, 0.42 * s, 0.17 * s], [-0.12, 0, 0]),
      left: (a, s) => { a.rotation.x = -0.5; const k = rlGrp(a, [0, -0.42 * s, 0.1]); rlAdd(k, gCyl(0.16, 0.12, 0.16, 8), W(0xa0804a), [0, 0, 0]); for (let i = 0; i < 3; i++) rlAdd(k, gCone(0.035, 0.22, 4), W(0xc8d0d8), [(-0.06 + i * 0.06), 0.12, 0], [0, 0, (i - 1) * 0.3]); },
      right: (a, s) => rlAdd(a, gCone(0.045, 0.3, 5), W(0xc8d4dc), [0, -0.45 * s, 0.1], [1.4, 0, 0], [1, 1, 0.4]) });
    case 'netthrower': return rlPerson({ coat: 0x56644a, sleeve: 0x56644a, trou: 0x3a3028, trim: TR, skin: 0xd09a70,
      hat: (h, s) => { rlAdd(h, gSph(0.16 * s, 7), W(0xb08a40), [0, 0.06 * s, -0.01], null, [1, 0.7, 1]); rlAdd(h, gSph(0.05 * s, 5), W(0xb08a40), [0, 0.18 * s, 0]); rlAdd(h, gBox(0.22 * s, 0.12 * s, 0.1 * s), W(0x6a4a30), [0, -0.1 * s, 0.09 * s]); },
      extra: (b, s) => { const n = rlGrp(b, [-0.2 * s, 0.95 * s, -0.12 * s]); rlAdd(n, gDod(0.2 * s), W(0x5a5a3a), [0, 0, 0], [0.3, 0.4, 0], [1, 0.8, 1.2]); for (let i = 0; i < 5; i++) { const a = i * 1.3; rlAdd(n, gSph(0.045 * s, 5), W(0xe08a30), [Math.cos(a) * 0.19 * s, Math.sin(a * 1.7) * 0.1 * s, Math.sin(a) * 0.2 * s]); } },
      right: (a, s) => { const n = rlGrp(a, [0, -0.42 * s, 0.06]); rlAdd(n, gCone(0.22, 0.38, 8), rlNetMat(), [0, -0.12, 0.06], [0.3, 0, 0]); rlAdd(n, gTor(0.19, 0.018, 10), W(0x3a3a3a), [0, -0.29, 0.1], [Math.PI / 2 + 0.3, 0, 0]); } });
    case 'grenadier': return rlPerson({ coat: 0x34463a, sleeve: 0x34463a, trou: 0xd8d0c0, boot: 0x141414, trim: TR, skin: 0xd8a888,
      hat: (h, s) => { rlAdd(h, gCone(0.15 * s, 0.42 * s, 7), W(0x34463a), [0, 0.22 * s, -0.01]); rlAdd(h, gBox(0.18 * s, 0.24 * s, 0.03 * s), W(0xd0a040, { em: 0x302000 }), [0, 0.18 * s, 0.11 * s], [-0.25, 0, 0]); rlAdd(h, gSph(0.04 * s, 5), W(TR), [0, 0.45 * s, -0.01]); },
      extra: (b, s) => { rlAdd(b, gBox(0.05 * s, 0.5 * s, 0.29 * s), W(0xe8e2d4), [0, 0.7 * s, 0], [0, 0, 0.7]); rlAdd(b, gBox(0.22 * s, 0.14 * s, 0.1 * s), W(0x2a2220), [0.1 * s, 0.46 * s, -0.15 * s]); },
      right: (a, s) => { a.rotation.x = -0.4; rlAdd(a, gSph(0.1, 7), W(0x1a1a1e), [0, -0.44 * s, 0.04]); rlFlame(a, [0, -0.33 * s, 0.04], 0.5); } });
    case 'lobster': {
      const shell = 0x2e5060, hot = 0xd8582a;
      const g = rlPerson({ s: 1.05, wide: 1.15, deep: 1.15, coat: shell, sleeve: shell, trou: 0x26404c, boot: 0x1c2a32, trim: TR, skin: 0x2e5060,
        hat: (h, s) => { rlAdd(h, gSph(0.19 * s, 8), W(shell), [0, 0.02 * s, 0], null, [1, 0.95, 1.2]); rlAdd(h, gCone(0.04 * s, 0.14 * s, 5), W(hot), [0, 0.1 * s, 0.26 * s], [Math.PI / 2 - 0.3, 0, 0]); for (const sx of [-1, 1]) { rlAdd(h, gSph(0.035 * s, 5), W(0x101010), [sx * 0.08 * s, 0.1 * s, 0.17 * s]); const an = rlGrp(h, [sx * 0.06 * s, 0.1 * s, 0.2 * s]); an.rotation.set(-0.5, 0, sx * -0.5); rlAdd(an, gCyl(0.008, 0.014, 0.3 * s, 4), W(hot), [0, 0.15 * s, 0]); const a2 = rlGrp(an, [0, 0.3 * s, 0]); a2.rotation.x = -1.1; rlAdd(a2, gCyl(0.006, 0.008, 0.3 * s, 4), W(hot), [0, 0.15 * s, 0]); } rlAdd(h, gBox(0.2 * s, 0.05 * s, 0.05 * s), W(0x101418), [0, -0.02 * s, 0.2 * s]); },
        extra: (b, s) => { for (let i = 0; i < 4; i++) rlAdd(b, gBox((0.36 - i * 0.04) * s, 0.12 * s, 0.06 * s), W(i % 2 ? shell : 0x3a6070), [0, (0.88 - i * 0.13) * s, -0.17 * s], [0.2, 0, 0]); rlAdd(b, gBox(0.52 * s, 0.1 * s, 0.34 * s), W(0x3a6070), [0, 0.92 * s, 0]); },
        right: (a, s) => { const k = rlGrp(a, [0, -0.44 * s, 0.08]); rlAdd(k, gSph(0.13, 7), W(shell), [0, 0, 0.04], null, [0.9, 0.8, 1.4]); rlAdd(k, gBox(0.07, 0.06, 0.26), W(hot), [0.05, 0.03, 0.26], [0, -0.15, 0]); rlAdd(k, gBox(0.06, 0.05, 0.2), W(hot), [-0.05, -0.03, 0.22], [0, 0.2, 0]); },
        left: (a, s) => { a.rotation.x = -1.1; const sh = rlGrp(a, [0.02, -0.38 * s, 0.12], 'shield'); sh.rotation.x = 1.1; for (let i = 0; i < 5; i++) { const an = (i - 2) * 0.32; rlAdd(sh, gBox(0.13, 0.36, 0.035), W(i === 2 ? hot : 0x3a6878), [Math.sin(an) * 0.16, Math.cos(an) * 0.16 - 0.08, 0.04], [0, 0, -an]); } rlAdd(sh, gBox(0.1, 0.12, 0.05), W(0x2a4652), [0, -0.12, 0.04]); rlGlowSpr(sh, [-0.06, 0.08, 0.1], 0xe8f8ff, 0.55, 'glint'); } });
      return g;
    }
    case 'petrel': { const g = rlBird({ s: 0.82, col: 0x2a2624, wing: 0x221e1c, tip: 0x121010, head: 0x221e1c, bk: 0x101010, tail: 0x221e1c, span: 1.3 }), b = g.getObjectByName('body'); rlAdd(b, gBox(0.26, 0.08, 0.1), W(0xf4f2ea), [0, 0.04, -0.26]); rlAdd(b, gTor(0.13, 0.022, 10), W(TR), [0, 0, 0.16]); return g; }
    case 'pressgang': return rlPerson({ s: 1.08, wide: 1.22, deep: 1.1, coat: 0x4a3e34, sleeve: 0xd8d0c0, trou: 0x2c3448, trim: TR, skin: 0xd09a70,
      hat: (h, s) => { rlAdd(h, gBox(0.42 * s, 0.1 * s, 0.14 * s), W(0x1e1a18), [0, 0.13 * s, 0], [0, 0, 0]); rlAdd(h, gSph(0.15 * s, 7), W(0x1e1a18), [0, 0.07 * s, 0], null, [1, 0.6, 1]); rlAdd(h, gBox(0.22 * s, 0.05 * s, 0.05 * s), W(0x3a2618), [0, -0.1 * s, 0.13 * s]); },
      extra: (b, s) => { rlAdd(b, gSph(0.22 * s, 7), W(0xb8a070), [-0.12 * s, 0.98 * s, -0.22 * s], [0.4, 0, 0.3], [1, 1.2, 0.8]); rlAdd(b, gCyl(0.04 * s, 0.04 * s, 0.06 * s, 5), W(0x6a5030), [-0.06 * s, 1.18 * s, -0.16 * s]); },
      right: (a, s) => { const k = rlGrp(a, [0, -0.38 * s, 0.05]); k.rotation.x = 1.0; rlAdd(k, gCyl(0.06, 0.03, 0.62, 6), W(0x6a4a2a), [0, 0.3, 0]); rlAdd(k, gSph(0.08, 6), W(0x5a3a20), [0, 0.6, 0]); } });
    case 'siren': {
      const tailM = W(0x3a8a78), finM = W(0x6ac0a8);
      return rlPerson({ skirt: 0x3a8a78, coat: 0xd0e0d0, sleeve: 0xd0e0d0, skin: 0xd0e0d0, trim: TR,
        hat: (h, s) => { rlAdd(h, gSph(0.17 * s, 8), W(0xc8b050), [0, 0.04 * s, -0.04 * s], null, [1.05, 1, 1]); for (let i = 0; i < 5; i++) rlAdd(h, gCone(0.06 * s, 0.5 * s, 5), W(i % 2 ? 0xb8a040 : 0xd8c060), [(-0.12 + i * 0.06) * s, -0.2 * s, -0.12 * s], [Math.PI + 0.2, 0, (i - 2) * 0.12]); rlAdd(h, gSph(0.035 * s, 5), W(0xf8a0b0), [0.12 * s, 0.1 * s, 0.05 * s]); },
        extra: (b, s) => { for (const sx of [-1, 1]) rlAdd(b, gSph(0.065 * s, 6), W(0xf0b0b8), [sx * 0.09 * s, 0.78 * s, 0.13 * s], null, [1, 1, 0.6]); const t = rlGrp(b, [0, 0.12 * s, -0.12 * s], 'fluke'); rlAdd(t, gCone(0.16 * s, 0.5 * s, 7), tailM, [0, 0.02, -0.22 * s], [-Math.PI / 2 + 0.25, 0, 0]); for (const sx of [-1, 1]) rlAdd(t, gCone(0.1 * s, 0.32 * s, 4), finM, [sx * 0.12 * s, 0.14 * s, -0.5 * s], [-0.6, 0, sx * 0.9], [1, 1, 0.3]); rlAdd(b, gTor(0.13 * s, 0.025 * s, 10), W(TR), [0, 0.92 * s, 0], [Math.PI / 2, 0, 0]); },
        right: (a, s) => { a.rotation.x = -0.9; rlAdd(a, gCone(0.07, 0.22, 6), W(0xf0d0c0), [0, -0.46 * s, 0.06], [0.4, 0, 0]); } });
    }
    case 'surgeon': return rlPerson({ coat: 0x1e1e26, sleeve: 0x1e1e26, trou: 0x2a2a30, long: 1, trim: TR, skin: 0xe0b8a0,
      hat: (h, s) => { rlAdd(h, gCyl(0.25 * s, 0.25 * s, 0.025 * s, 10), W(0x141418), [0, 0.09 * s, 0]); rlAdd(h, gCyl(0.13 * s, 0.13 * s, 0.3 * s, 9), W(0x141418), [0, 0.24 * s, 0]); for (const sx of [-1, 1]) rlAdd(h, gTor(0.035 * s, 0.01 * s, 8), W(0xd0c080), [sx * 0.055 * s, 0.01 * s, 0.14 * s]); },
      extra: (b, s) => { rlAdd(b, gBox(0.34 * s, 0.6 * s, 0.03 * s), W(0xeae6dc), [0, 0.6 * s, 0.15 * s]); rlAdd(b, gBox(0.08 * s, 0.08 * s, 0.035 * s), W(0x40c060), [0, 0.76 * s, 0.17 * s]); },
      left: (a, s) => { const k = rlGrp(a, [0, -0.46 * s, 0]); rlAdd(k, gBox(0.28, 0.18, 0.14), W(0x2a1e18), [0, -0.08, 0]); rlAdd(k, gTor(0.06, 0.015, 8), W(0x8a6a40), [0, 0.03, 0]); },
      right: (a, s) => { a.rotation.x = -0.7; const p = rlGrp(a, [0, -0.46 * s, 0.05], 'phial'); rlAdd(p, gCyl(0.045, 0.06, 0.14, 7), W(0x80ff90, { em: 0x30a040 }), [0, 0.04, 0]); rlAdd(p, gCyl(0.02, 0.02, 0.06, 5), W(0x8a6a40), [0, 0.14, 0]); rlGlowSpr(p, [0, 0.05, 0], 0x80ff90, 0.6, 'pglow'); } });
    case 'rocketcrew': return rlPerson({ coat: 0x3a3a44, sleeve: 0x3a3a44, trou: 0x2a2a30, trim: 0xd8d0c0, skin: 0xd8a888,
      hat: (h, s) => { rlAdd(h, gCyl(0.16 * s, 0.15 * s, 0.1 * s, 8), W(0x2a2a30), [0, 0.11 * s, 0]); rlAdd(h, gCyl(0.162 * s, 0.162 * s, 0.035 * s, 8), W(TR), [0, 0.08 * s, 0]); rlAdd(h, gBox(0.18 * s, 0.02 * s, 0.1 * s), W(0x101010), [0, 0.07 * s, 0.14 * s]); },
      extra: (b, s) => { const t = rlGrp(b, [0.2 * s, 0.98 * s, 0.05 * s], 'tube'); t.rotation.x = -0.25; rlAdd(t, gCyl(0.07, 0.07, 0.9, 8), W(0x6a6a72), [0, 0, 0.1], [Math.PI / 2, 0, 0]); rlAdd(t, gCone(0.07, 0.18, 7), W(0xd83a2a), [0, 0, 0.62], [Math.PI / 2, 0, 0]); rlAdd(t, gTor(0.075, 0.018, 8), W(0x3a3a3a), [0, 0, 0.5]); for (const x of [-0.12, 0.0]) { rlAdd(b, gCyl(0.045 * s, 0.045 * s, 0.5 * s, 6), W(0xe8e2d4), [x * s - 0.02, 0.85 * s, -0.18 * s]); rlAdd(b, gCone(0.05 * s, 0.12 * s, 6), W(0xd83a2a), [x * s - 0.02, 1.16 * s, -0.18 * s]); } },
      right: a => { a.rotation.x = -1.3; }, left: a => { a.rotation.x = -0.8; } });
    case 'anchorman': return rlPerson({ s: 1.15, wide: 1.28, deep: 1.2, coat: 0x7a6248, sleeve: 0xd09a70, trou: 0x3a3430, trim: TR, skin: 0xd09a70, fist: 1.3,
      hat: (h, s) => { rlAdd(h, gSph(0.162 * s, 8), W(0x2a2a2e), [0, 0.04 * s, -0.02 * s], null, [1, 0.8, 1.05]); rlAdd(h, gSph(0.07 * s, 6), W(0x5a3a28), [0, 0.06 * s, -0.17 * s]); },
      extra: (b, s) => { const sp = rlGrp(b, [0, 0.8 * s, 0], 'spin'); for (let i = 0; i < 6; i++) rlAdd(sp, gTor(0.05, 0.016, 6), W(0x4a4a50), [0.3 + i * 0.12, 0, 0], [i % 2 ? Math.PI / 2 : 0, 0, 0]); const an = rlGrp(sp, [1.2, 0, 0]); an.rotation.z = Math.PI / 2; an.scale.setScalar(1.5); rlAdd(an, gTor(0.06, 0.02, 8), W(0x3a3c40), [0, 0.04, 0]); rlAdd(an, gCyl(0.035, 0.035, 0.5, 6), W(0x3a3c40), [0, -0.2, 0]); rlAdd(an, gBox(0.3, 0.04, 0.04), W(0x3a3c40), [0, 0.0, 0]); rlAdd(an, rlGeo('anchorArc', () => new THREE.TorusGeometry(0.2, 0.04, 5, 10, Math.PI)), W(0x3a3c40), [0, -0.26, 0], [0, 0, Math.PI]); for (const sx of [-1, 1]) rlAdd(an, gCone(0.07, 0.16, 4), W(0x3a3c40), [sx * 0.2, -0.22, 0], [0, 0, sx * 0.5]); },
      right: a => { a.rotation.x = -1.5; a.rotation.z = 0.5; } });
    case 'seaeagle': {
      const g = rlBird({ s: 1.6, col: 0x5a422e, wing: 0x4a3626, tip: 0x2a2018, head: 0xd8ccae, tail: 0xf4f2ea, bk: 0xe8c040, beak: 1.1, span: 1.55 }), b = g.getObjectByName('body');
      for (const sx of [-1, 1]) { rlAdd(b, gCyl(0.035, 0.03, 0.2, 5), W(0xe8c040), [sx * 0.08, -0.22, 0.05], [0.3, 0, 0]); rlAdd(b, gBox(0.08, 0.03, 0.1), W(0x2a2a2a), [sx * 0.08, -0.32, 0.09]); }
      rlAdd(b, gTor(0.24, 0.035, 12), W(TR), [0, 0, 0.16]);
      return g;
    }
    case 'wreckerchief': return rlPerson({ s: 1.2, wide: 1.2, coat: 0x3a2a26, sleeve: 0x3a2a26, trou: 0x2a2420, long: 1, trim: TR, skin: 0xc89878,
      hat: (h, s) => { rlAdd(h, gCyl(0.33 * s, 0.33 * s, 0.05 * s, 3), W(0x18141a), [0, 0.1 * s, 0], [0, Math.PI / 6, 0]); rlAdd(h, gCyl(0.14 * s, 0.16 * s, 0.14 * s, 8), W(0x18141a), [0, 0.17 * s, 0]); rlAdd(h, gBox(0.24 * s, 0.16 * s, 0.1 * s), W(0x8a8a88), [0, -0.12 * s, 0.1 * s]); },
      extra: (b, s) => { rlAdd(b, gCone(0.4 * s, 0.7 * s, 8), W(0x2a1e1a), [0, 0.55 * s, -0.1 * s], null, [1, 1, 0.7]); rlAdd(b, gBox(0.56 * s, 0.12 * s, 0.34 * s), W(0x6a5040), [0, 0.92 * s, 0]); },
      left: (a, s) => { a.rotation.x = -2.4; const p = rlGrp(a, [0, -0.38 * s, 0.03]); rlAdd(p, gCyl(0.02, 0.02, 0.5, 5), W(0x3a2a20), [0, -0.2, 0]); const l = rlLantern(p, [0, -0.5, 0], 1.6, 0xffd070, 'lamp'); l.rotation.x = Math.PI; },
      right: (a, s) => { const cut = rlGrp(a, [0, -0.38 * s, 0.05]); cut.rotation.x = 0.9; rlAdd(cut, gBox(0.035, 0.65, 0.09), W(0xd8dce0), [0, 0.36, 0.02], [0.1, 0, 0]); rlAdd(cut, gBox(0.16, 0.03, 0.08), W(0xc09040), [0, 0.04, 0]); } });
    case 'smugglers': return rlPerson({ s: 0.95, coat: 0x22262e, sleeve: 0x22262e, trou: 0x3a3028, trim: TR, skin: 0xc89878,
      hat: (h, s) => { rlAdd(h, gSph(0.16 * s, 7), W(0x4a2e2a), [0, 0.06 * s, -0.01], null, [1, 0.72, 1]); rlAdd(h, gBox(0.3 * s, 0.1 * s, 0.24 * s), W(0x6a3a2e), [0, -0.06 * s, 0.02 * s]); },
      extra: (b, s) => { const k = rlGrp(b, [0, 0.82 * s, -0.24 * s]); rlAdd(k, gCyl(0.15 * s, 0.15 * s, 0.26 * s, 9), W(0x8a6038), [0, 0, 0]); for (const y of [-0.08, 0.08]) rlAdd(k, gCyl(0.155 * s, 0.155 * s, 0.03 * s, 9), W(0x2a2626), [0, y * s, 0]); },
      right: (a, s) => rlAdd(a, gBox(0.025, 0.03, 0.22), W(0xc8ccd0), [0, -0.42 * s, 0.1]) });
    case 'crabmother': {
      const g = rlCrab({ s: 1.6, col: 0x9a6a44, leg: 0x6a4a30, belly: 0xe0c8a0 }), b = g.getObjectByName('body'), bc = W(0xe0602a), bl = W(0xa83a1a);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, d = i % 2 ? 0.2 : 0.34, bb = rlGrp(b, [Math.cos(a) * d, 0.68, Math.sin(a) * d * 0.8], 'baby' + i); bb.rotation.y = -a + Math.PI / 2; rlAdd(bb, gSph(0.13, 7), bc, [0, 0.04, 0], null, [1.2, 0.5, 0.9]); for (const sx of [-1, 1]) { rlAdd(bb, gSph(0.05, 5), bc, [sx * 0.11, 0.05, 0.12]); rlAdd(bb, gBox(0.18, 0.025, 0.025), bl, [sx * 0.12, 0.0, -0.02], [0, 0, sx * 0.4]); rlAdd(bb, gSph(0.022, 4), W(0x101010), [sx * 0.04, 0.1, 0.1]); } }
      rlAdd(g, gTor(0.85, 0.05, 20), W(TR), [0, 0.12, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'krakenarm': {
      const g = new THREE.Group(), b = rlGrp(g, [0, 0, 0], 'body'), sk = W(0x7a3a5e), su = W(0xe8c0b8), r = rlRng(12);
      rlAdd(b, gCyl(0.78, 0.86, 0.05, 14), W(0x1e2e38), [0, 0.03, 0]);
      rlAdd(b, gTor(0.66, 0.06, 16), W(0xd8eef0, { op: 0.75 }), [0, 0.06, 0], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + r(), k = 0.14 + r() * 0.1; rlAdd(b, gDod(1), W(i % 2 ? 0x5a544a : 0x4a443c), [Math.cos(a) * 0.82, 0.06, Math.sin(a) * 0.82], [r() * 3, r() * 3, 0], [k, k * 0.7, k]); }
      let par = b;
      for (let i = 0; i < 8; i++) {
        const k = 1 - i * 0.1, sg = rlGrp(par, [0, i ? 0.3 : 0.02, 0], 'k' + i);
        rlAdd(sg, gCyl(0.27 * k - 0.027, 0.27 * k, 0.32, 8), i > 5 ? W(0x9a4a72) : sk, [0, 0.15, 0]);
        rlAdd(sg, gSph(0.07 * k, 5), su, [0, 0.12, 0.2 * k], null, [1, 1, 0.5]); if (i < 6) rlAdd(sg, gSph(0.05 * k, 5), su, [0, 0.26, 0.19 * k], null, [1, 1, 0.5]);
        par = sg;
      }
      rlAdd(par, gCone(0.06, 0.3, 6), sk, [0, 0.42, 0]);
      rlAdd(g, gTor(0.95, 0.05, 20), W(TR), [0, 0.04, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'stormcaller': return rlPerson({ s: 0.95, skirt: 0x3a3a48, coat: 0x4a4a58, sleeve: 0x4a4a58, trim: TR, skin: 0xd8b8a0,
      hat: (h, s) => { rlAdd(h, gSph(0.19 * s, 8), W(0x5a5a6a), [0, 0.03 * s, -0.04 * s], null, [1, 1.05, 1.05]); rlAdd(h, gCone(0.1 * s, 0.2 * s, 5), W(0x5a5a6a), [0, 0.1 * s, -0.18 * s], [-1.9, 0, 0]); for (const sx of [-1, 1]) rlAdd(h, gCone(0.04 * s, 0.2 * s, 4), W(0xe8e8e8), [sx * 0.12 * s, -0.08 * s, 0.07 * s], [Math.PI, 0, 0]); },
      extra: (b, s) => rlAdd(b, gCone(0.36 * s, 0.4 * s, 8), W(0x5a5a6a), [0, 0.86 * s, 0]),
      right: (a, s) => { const p = rlGrp(a, [0, -0.38 * s, 0.05]); p.rotation.x = 0.5; rlAdd(p, gCyl(0.025, 0.03, 1.6, 5), W(0x4a3a2a), [0, 0.5, 0]); for (let i = 0; i < 4; i++) rlAdd(p, gTor(0.04, 0.015, 6), W(0xd8c890), [0, 0.9 + i * 0.1, 0], [Math.PI / 2, 0, 0]); const sp = rlGrp(p, [0, 1.36, 0], 'spark'); rlAdd(sp, gIco(0.08, 0), W(0xd8e8ff, { basic: 1 }), [0, 0, 0]); rlGlowSpr(sp, [0, 0, 0], 0x8ab0ff, 0.9); } });
    // buildings
    case 'tarpit': {
      const g = new THREE.Group(), tar = W(0x141216, { op: 0.9, dw: true }), R = (RL_CARD.tarpit ? RL_CARD.tarpit.rng : 2.5) / 1.55, r = rlRng(21);
      const disc = rlGeo('tarDisc', () => new THREE.CircleGeometry(1, 24));
      const p0 = rlAdd(g, disc, tar, [0, 0.025, 0], [-Math.PI / 2, 0, 0], R * 0.82, 'pool'); p0.renderOrder = 1;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + r(), d = R * (0.45 + r() * 0.25), q = rlAdd(g, disc, tar, [Math.cos(a) * d, 0.024, Math.sin(a) * d], [-Math.PI / 2, 0, 0], R * (0.3 + r() * 0.18)); q.renderOrder = 1; }
      for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = r() * R * 0.7; rlAdd(g, gSph(0.12, 6), W(0x4a4650), [Math.cos(a) * d, 0.03, Math.sin(a) * d], null, [1.4, 0.08, 0.6]); }
      const br = rlGrp(g, [-0.15, 0.3, -0.1]); br.rotation.set(0, 0.5, Math.PI / 2);
      rlAdd(br, gCyl(0.3, 0.3, 0.66, 10), W(0x6a4a2a), [0, 0, 0]); rlAdd(br, gCyl(0.33, 0.33, 0.68, 10), W(0x7a5832), [0, 0, 0], null, [1, 0.6, 1]); for (const y of [-0.24, 0.24]) rlAdd(br, gCyl(0.315, 0.315, 0.05, 10), W(0x2a2626), [0, y, 0]);
      rlAdd(br, gCyl(0.27, 0.27, 0.02, 10), W(0x0e0c0e), [0, -0.34, 0]);
      rlAdd(g, gCyl(0.12, 0.02, 0.3, 6), W(0x0e0c0e), [0.12, 0.1, -0.05], [0, 0, -1.2]);
      for (let i = 0; i < 3; i++) rlAdd(g, gSph(0.07, 6), W(0x2a2830), [0.4 + i * 0.25, 0.04, 0.15 - i * 0.3], null, [1, 0.6, 1], 'bub' + i);
      rlAdd(g, gTor(R, 0.035, 32), W(TR, { op: 0.7 }), [0, 0.04, 0], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'foghorn': {
      const g = new THREE.Group();
      rlAdd(g, gBox(1.1, 0.42, 1.1), W(0x8a8276), [0, 0.21, 0]); rlAdd(g, gBox(1.14, 0.06, 1.14), W(TR), [0, 0.04, 0]);
      rlAdd(g, gCyl(0.24, 0.26, 0.6, 10), W(0x5a5e66), [0, 0.72, -0.3]); rlAdd(g, gSph(0.24, 8), W(0x5a5e66), [0, 1.02, -0.3], null, [1, 0.5, 1]);
      rlAdd(g, gCyl(0.06, 0.06, 0.7, 6), W(0x3a3a40), [0, 0.75, 0.05]);
      const h = rlGrp(g, [0, 1.12, 0.05], 'horn');
      const bell = rlGeo('hornBell', () => new THREE.ConeGeometry(0.42, 1.0, 12, 1, true));
      rlAdd(h, bell, W(0xb83a2a, { ds: 1 }), [0, 0, 0.35], [-Math.PI / 2, 0, 0]); rlAdd(h, gTor(0.42, 0.04, 14), W(0xe8e2d4), [0, 0, 0.85]); rlAdd(h, gCyl(0.08, 0.08, 0.4, 6), W(0x3a3a40), [0, 0, -0.25], [Math.PI / 2, 0, 0]);
      rlAdd(h, gCyl(0.36, 0.36, 0.01, 12), W(0x1a1416), [0, 0, 0.8], [Math.PI / 2, 0, 0]);
      return g;
    }
    case 'mortar': {
      const g = new THREE.Group(), r = rlRng(8);
      rlAdd(g, gCyl(0.8, 0.86, 0.1, 12), W(0x6a645a), [0, 0.05, 0]);
      for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; rlAdd(g, gSph(0.2, 6), W(i % 2 ? 0xb8a878 : 0xa89868), [Math.cos(a) * 0.74, 0.16, Math.sin(a) * 0.74], [0, -a, 0], [1.3, 0.55, 0.8]); rlAdd(g, gSph(0.18, 6), W(0xc0b080), [Math.cos(a + 0.28) * 0.72, 0.34, Math.sin(a + 0.28) * 0.72], [0, -a, 0], [1.3, 0.55, 0.8]); }
      const gun = rlGrp(g, [0, 0.22, 0], 'gun');
      rlAdd(gun, gBox(0.62, 0.22, 0.6), W(0x5a3e26), [0, 0.06, 0]);
      const bar = rlGrp(gun, [0, 0.28, 0], 'barrel'); bar.rotation.x = 0.6;
      rlAdd(bar, gCyl(0.24, 0.3, 0.6, 10), W(0x2a2a2e), [0, 0.2, 0]); rlAdd(bar, gTor(0.24, 0.05, 10), W(0x3a3a3e), [0, 0.5, 0], [Math.PI / 2, 0, 0]); rlAdd(bar, gCyl(0.2, 0.2, 0.02, 10), W(0x0a0a0a), [0, 0.505, 0]);
      for (const sx of [-1, 1]) rlAdd(gun, gCyl(0.06, 0.06, 0.08, 6), W(0x2a2a2e), [sx * 0.3, 0.28, 0], [0, 0, Math.PI / 2]);
      rlAdd(g, gCyl(0.88, 0.88, 0.06, 16), W(TR), [0, 0.03, 0]);
      return g;
    }
    case 'burnlens': {
      const g = new THREE.Group(), brass = W(0xc8983a, { em: 0x2a1a00 });
      rlAdd(g, gCyl(0.6, 0.7, 0.3, 8), W(0x8a8276), [0, 0.15, 0]); rlAdd(g, gCyl(0.72, 0.72, 0.06, 16), W(TR), [0, 0.03, 0]);
      rlAdd(g, gCyl(0.08, 0.11, 1.2, 6), W(0x3a3a40), [0, 0.88, 0]);
      const gun = rlGrp(g, [0, 1.5, 0], 'gun');
      rlAdd(gun, gBox(0.08, 0.5, 0.08), brass, [-0.42, 0.12, 0]); rlAdd(gun, gBox(0.08, 0.5, 0.08), brass, [0.42, 0.12, 0]); rlAdd(gun, gBox(0.9, 0.08, 0.1), brass, [0, -0.12, 0]);
      const ln = rlGrp(gun, [0, 0.3, 0], 'lens'); ln.rotation.x = 0.15;
      rlAdd(ln, gSph(0.4, 14), W(0xc8ecff, { op: 0.6, em: 0x304860 }), [0, 0, 0], null, [1, 1, 0.22]); rlAdd(ln, gTor(0.4, 0.05, 16), brass, [0, 0, 0]);
      for (const k of [0.27, 0.15]) rlAdd(ln, gTor(k, 0.015, 14), W(0xe8f8ff, { op: 0.7 }), [0, 0, 0.07]);
      rlGlowSpr(ln, [0, 0, 0.12], 0xfff0c0, 0.7, 'lglow');
      return g;
    }
    case 'martello': {
      const g = new THREE.Group(), st = W(0xb8ae9a), st2 = W(0x9a9080);
      rlAdd(g, gCyl(0.92, 1.06, 1.25, 14), st, [0, 0.62, 0]);
      rlAdd(g, gCyl(1.0, 0.95, 0.22, 14), st2, [0, 1.36, 0]);
      rlAdd(g, gCyl(0.98, 0.98, 0.08, 14), W(TR), [0, 0.9, 0]);
      rlAdd(g, gBox(0.26, 0.38, 0.05), W(0x2a2220), [0, 0.95, 0.96]); for (let i = 0; i < 5; i++) rlAdd(g, gBox(0.3, 0.03, 0.04), W(0x5a4228), [0, 0.12 + i * 0.16, 1.06]);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.8; rlAdd(g, gBox(0.1, 0.16, 0.05), W(0x2a2220), [Math.sin(a) * 0.98, 0.55, Math.cos(a) * 0.98], [0, a, 0]); }
      const gun = rlGrp(g, [0, 1.5, 0], 'gun');
      rlAdd(gun, gCyl(0.42, 0.42, 0.06, 12), W(0x5a4228), [0, 0, 0]); rlAdd(gun, gBox(0.42, 0.18, 0.5), W(0x5a3e26), [0, 0.12, -0.05]); rlAdd(gun, gCyl(0.1, 0.14, 0.95, 10), W(0x2a2a2e), [0, 0.26, 0.3], [Math.PI / 2, 0, 0]); rlAdd(gun, gTor(0.1, 0.025, 10), W(0x2a2a2e), [0, 0.26, 0.78]);
      rlAdd(g, gCyl(1.1, 1.1, 0.06, 16), W(TR), [0, 0.03, 0]);
      return g;
    }
    case 'oilstore': {
      const g = new THREE.Group();
      rlAdd(g, gBox(1.1, 0.8, 0.8), W(0xe0d8c8), [-0.15, 0.4, -0.15]); rlAdd(g, gCone(0.88, 0.5, 4), W(0x4a4448), [-0.15, 1.05, -0.15], [0, Math.PI / 4, 0], [1, 1, 0.75]);
      rlAdd(g, gBox(0.3, 0.5, 0.05), W(0x5a3a22), [-0.15, 0.25, 0.26]); rlLantern(g, [0.12, 0.66, 0.3], 1.2, 0xffd070, 'lamp');
      rlAdd(g, gCyl(0.3, 0.3, 0.7, 12), W(0xb87a40, { em: 0x201000 }), [0.6, 0.35, 0.05]); rlAdd(g, gSph(0.3, 10), W(0xb87a40, { em: 0x201000 }), [0.6, 0.7, 0.05], null, [1, 0.35, 1]); rlAdd(g, gCyl(0.31, 0.31, 0.05, 12), W(0x6a4a2a), [0.6, 0.2, 0.05]); rlAdd(g, gCyl(0.31, 0.31, 0.05, 12), W(0x6a4a2a), [0.6, 0.55, 0.05]);
      for (let i = 0; i < 3; i++) { const b = rlGrp(g, [-0.55 + i * 0.36, 0.2, 0.48]); rlAdd(b, gCyl(0.17, 0.17, 0.4, 9), W(0x7a5a32), [0, 0, 0]); for (const y of [-0.13, 0.13]) rlAdd(b, gCyl(0.175, 0.175, 0.03, 9), W(0x2a2626), [0, y, 0]); rlAdd(b, gCyl(0.14, 0.14, 0.01, 9), W(0xe8b040, { em: 0x6a4000 }), [0, 0.2, 0]); }
      rlAdd(g, gCyl(0.95, 0.95, 0.06, 16), W(TR), [0, 0.03, 0]);
      return g;
    }
  }
  return null;
}
// a card's model (built once for each side colour, then cloned)
function rl3dProto(c, mine) { const k = c + (mine ? 'm' : 't'); if (!RL3.protos[k]) { RL3.protos[k] = rl3dBuild(c, mine ? RL_MINE : RL_THEIRS); } return RL3.protos[k]; }
function rl3dParts(m) { const P = {}; m.traverse(o => { if (o.name) P[o.name] = o; }); return P; }
function rl3dUnitNew(u) {
  const C = RL_CARD[u.c] || {}, mine = u.side === RL.me, g = new THREE.Group(), m = rl3dProto(u.c, mine).clone(true);
  if (u.c === 'fogwraith') m.traverse(o => { if (o.material && o.material.transparent) o.material = o.material.clone(); });
  g.add(m); RL3.scene.add(g);
  const sz = C.size || 0.4, sh = rlAdd(RL3.scene, new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: rlTex('shadow'), transparent: true, depthWrite: false }), null, [-Math.PI / 2, 0, 0], sz * 1.5);
  const ring = C.type === 'building' || ['hermit', 'kelp', 'crabking', 'keelback', 'shorecrabs', 'fogwraith', 'crabmother', 'krakenarm'].includes(u.c) ? null : rlAdd(g, new THREE.RingGeometry(sz * 0.8, sz * 0.98, 20), new THREE.MeshBasicMaterial({ color: mine ? RL_MINE : RL_THEIRS, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  const H = { g, m, sh, ring, P: rl3dParts(m), ph: Math.random() * 6, bar: null, sz, air: !!C.air, hpLast: u.hp, flash: 0, rise: u.dep > 0 ? 0 : 1, C, kick: 0 };
  if (C.ab === 'rally') { H.aura = rlAdd(RL3.scene, rlGeo('auraRing', () => new THREE.RingGeometry(0.95, 1, 64)), new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide }), null, [-Math.PI / 2, 0, 0], 4); H.aura.renderOrder = 3; }
  return H;
}

// ---------- the effects ----------
function rl3dPart(add, p, o) {
  const pool = RL3.parts; let q = null;
  for (let i = 0; i < pool.length; i++) { const k = (RL3.pi = ((RL3.pi || 0) + 1) % pool.length); if (pool[k].add === add && pool[k].life <= 0) { q = pool[k]; break; } }
  if (!q) return;
  q.life = q.max = o.life || 0.6; q.v = o.v || [0, 0, 0]; q.g = o.g || 0; q.s0 = o.s0 || 0.4; q.s1 = o.s1 == null ? q.s0 : o.s1; q.op = o.op == null ? 1 : o.op; q.drag = o.drag || 0; q.delay = o.delay || 0;
  q.m.position.copy(p); q.m.material.color.setHex(o.col == null ? 0xffffff : o.col); q.m.visible = q.delay <= 0; q.m.scale.setScalar(q.s0); q.m.material.opacity = q.op;
}
function rl3dRing(p, r, col, life, op, inv, delay) { const q = RL3.rings.find(q => q.life <= 0); if (!q) return; q.life = q.max = life || 0.6; q.r = r; q.op = op == null ? 0.8 : op; q.inv = !!inv; q.delay = delay || 0; q.m.position.copy(p); q.m.material.color.setHex(col); q.m.visible = !q.delay; q.m.scale.setScalar(inv ? r : 0.1); }
function rl3dBolt(x, y, delay) {
  const q = RL3.bolts.find(q => q.life <= 0); if (!q) return;
  const pos = q.l.geometry.attributes.position, top = rv(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3, 16), bot = rv(x, y, RL_G0 + 0.4);
  for (let i = 0; i < 12; i++) { const f = i / 11, j = i === 0 || i === 11 ? 0 : 0.7 * (1 - f * 0.5); pos.setXYZ(i, top.x + (bot.x - top.x) * f + (Math.random() - 0.5) * j, top.y + (bot.y - top.y) * f, top.z + (bot.z - top.z) * f + (Math.random() - 0.5) * j); }
  pos.needsUpdate = true; q.life = q.max = 0.35; q.delay = delay || 0; q.at = [x, y]; q.l.visible = false;
}
// the events since last frame, each once
function rl3dFx() {
  let hi = RL3.seen;
  for (const f of RL.FX) {
    if (f.id <= RL3.seen) continue; hi = Math.max(hi, f.id);
    const C = RL_CARD[f.c], mineCol = f.side === RL.me ? RL_MINE : RL_THEIRS, P = h => rv(f.x, f.y, RL_G0 + (h || 0));
    const smoke = (n, col, s, life, up) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 0.4 + Math.random() * 0.9; rl3dPart(false, P(0.3 + Math.random() * 0.4), { v: [Math.cos(a) * sp, (up || 0.6) + Math.random() * 0.6, Math.sin(a) * sp], s0: s * 0.5, s1: s * (1.2 + Math.random()), life: life * (0.7 + Math.random() * 0.6), col, op: 0.7, drag: 1.5 }); } };
    const sparks = (n, col, sp, h) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.2; rl3dPart(true, P(h || 0.6), { v: [Math.cos(a) * sp * (0.4 + Math.random()), sp * (0.5 + e), Math.sin(a) * sp * (0.4 + Math.random())], g: 9, s0: 0.22, s1: 0.05, life: 0.4 + Math.random() * 0.3, col }); } };
    if (f.k === 'deploy') { rl3dRing(P(0.05), f.r + 0.5, mineCol, 0.55); smoke(5, 0xc8c0a8, 0.6, 0.7, 0.3); }
    else if (f.k === 'spawn') smoke(4, 0xc8c0a8, 0.5, 0.6, 0.3);
    else if (f.k === 'hit') { const h = (RL.U.find(u => Math.abs(u.x - f.x) < 0.05 && Math.abs(u.y - f.y) < 0.05 && u.air)) ? 2.6 : 0.8; rl3dPart(true, P(h), { s0: 0.5 + f.r * 0.35, s1: 0.1, life: 0.18, col: 0xfff0c0 }); if (f.r > 0) sparks(3 + f.r * 2, 0xffd080, 2.5, h); }
    else if (f.k === 'die') { const drown = /drown/.test(f.c), crab = /crab|hermit/.test(f.c); smoke(drown ? 6 : 8, drown ? 0x8ab0a0 : crab ? 0xd8a080 : 0xd0c8b8, 0.7, 0.8, f.r ? 0.2 : 0.6); if (f.r) for (let i = 0; i < 8; i++) rl3dPart(false, P(2.2), { v: [(Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2], g: 4, s0: 0.18, s1: 0.12, life: 0.9, col: 0xf0f0f0, op: 0.9 }); }
    else if (f.k === 'revive') { for (let i = 0; i < 10; i++) rl3dPart(true, P(0.2 + i * 0.12), { v: [0, 1.2, 0], s0: 0.5, s1: 0.1, life: 0.9, col: 0x60e090, delay: i * 0.04 }); rl3dRing(P(0.05), 1.0, 0x60e090, 0.8); }
    else if (f.k === 'flash') {
      if (f.r > 0) { rl3dPart(true, P(1.5), { s0: f.r * 2.2, s1: f.r * 4.5, life: 0.5, col: 0xffffff }); rl3dPart(true, P(0.4), { s0: f.r * 3, s1: f.r * 2, life: 0.8, col: 0xffe8c0, op: 0.8 }); rl3dRing(P(0.05), f.r, 0xffffff, 0.5, 0.9); sparks(16, 0xfff4d0, 4, 1.2); RL3.flash = Math.max(RL3.flash || 0, 0.35); }
      else smoke(5, 0xa89878, 0.5, 0.5, 0.2);
    }
    else if (f.k === 'boom') { const r = Math.max(0.6, f.r || 1); rl3dPart(true, P(0.6), { s0: r * 1.6, s1: r * 3.4, life: 0.35, col: 0xffc070 }); rl3dPart(true, P(0.3), { s0: r * 2.2, s1: r * 1.2, life: 0.6, col: 0xff7a30, op: 0.8 }); rl3dRing(P(0.05), r * 1.05, 0xffd8a0, 0.5, 0.8); smoke(Math.round(5 + r * 3), 0x4a4440, r * 0.9, 1.2, 1); sparks(Math.round(6 + r * 4), 0xffb060, 3.5, 0.6); }
    else if (f.k === 'bolt') { rl3dBolt(f.x, f.y, (f.r || 0) * 0.12); }
    else if (f.k === 'ring') { rl3dRing(P(0.08), f.r || 5, 0xe8d8a0, 1.1, 0.5); }
    else if (f.k === 'splash') { for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28; rl3dPart(false, P(0.4), { v: [Math.cos(a) * 1.4, 2 + Math.random() * 2, Math.sin(a) * 1.4], g: 9, s0: 0.25, s1: 0.15, life: 0.6, col: 0xd8f0f0, op: 0.9 }); } }
    else if (f.k === 'tower') { const T = RL3.towers[f.r]; if (T) { T.fall = 0.0001; } smoke(18, 0xd8d0c0, 1.6, 2.2, 1.2); sparks(14, 0xffd080, 5, 2); RL3.shake = 0.5; }
    // the second 32's events (v200)
    else if (f.k === 'heal') { if (f.r > 0) { rl3dRing(P(0.06), f.r, 0x90f080, 0.9, 0.55); rl3dKick(f.c, f.side, f.x, f.y); } for (let i = 0; i < (f.r > 0 ? 7 : 5); i++) { const a = Math.random() * 6.28, d = Math.random() * (f.r > 0 ? 0.6 : 0.4); rl3dPart(true, rv(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, RL_G0 + 0.4 + Math.random() * 0.8), { v: [0, 1.0 + Math.random() * 0.5, 0], s0: 0.3, s1: 0.05, life: 0.8, col: f.r > 0 ? 0x90f080 : 0x80f0d0, delay: i * 0.05 }); } }
    else if (f.k === 'leap') { const H = rl3dFind(f.c, f.side, f.tx, f.ty, 1.5); if (H) H.leap = { t: 0, dur: 0.32, fx: f.x, fy: f.y }; for (let i = 0; i < 4; i++) rl3dPart(false, P(0.15), { v: [(Math.random() - 0.5) * 1.5, 0.4, (Math.random() - 0.5) * 1.5], s0: 0.2, s1: 0.5, life: 0.45, col: 0xc8b898, op: 0.6, drag: 2 }); for (let i = 1; i < 6; i++) { const k = i / 6; rl3dPart(true, rv(f.x + (f.tx - f.x) * k, f.y + (f.ty - f.y) * k, RL_G0 + 0.5 + Math.sin(k * Math.PI) * 2.0), { s0: 0.25, s1: 0.05, life: 0.35, col: 0xffd8a0, delay: k * 0.28 }); } }
    else if (f.k === 'chain') { const pts = Array.isArray(f.pts) ? f.pts : []; const at = q => { const air = RL.U.find(u => u.air && Math.abs(u.x - q[0]) < 0.4 && Math.abs(u.y - q[1]) < 0.4); return rv(q[0], q[1], RL_G0 + (air ? 2.6 : 0.8)); };
      for (let i = 0; i < pts.length; i++) { const p = at(pts[i]); rl3dPart(true, p, { s0: 1.2, s1: 0.2, life: 0.3, col: 0xb8d0ff, delay: i * 0.08 }); for (let j = 0; j < 4; j++) rl3dPart(true, p, { v: [(Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4], g: 6, s0: 0.15, s1: 0.03, life: 0.35, col: 0xe0ecff, delay: i * 0.08 }); if (i) rl3dArc(at(pts[i - 1]), p, (i - 1) * 0.08); } }
    else if (f.k === 'pull') { const r = f.r || 3; rl3dRing(P(0.06), r, 0x9ad8e0, 0.6, 0.7, true); rl3dRing(P(0.06), r * 0.7, 0xd8f4f4, 0.5, 0.6, true); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, d = r * (0.8 + Math.random() * 0.25); rl3dPart(false, rv(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, RL_G0 + 0.3), { v: [-Math.cos(a) * d * 2.2, 0.8, Math.sin(a) * d * 2.2], s0: 0.3, s1: 0.15, life: 0.45, col: 0xd8f0f0, op: 0.85 }); } }
    else if (f.k === 'blast') { const r = f.r || 4; rl3dKick(f.c, f.side, f.x, f.y); for (let i = 0; i < 3; i++) rl3dRing(P(0.1 + i * 0.25), r * (0.75 + i * 0.12), 0xe8eef4, 0.7, 0.55 - i * 0.12, false, i * 0.12); smoke(4, 0xdce4ea, 0.6, 0.6, 0.4); }
    else if (f.k === 'oil') { rl3dKick(f.c, f.side, f.x, f.y); const top = P(1.6); rl3dPart(true, top, { v: [0, 1.6, 0], s0: 0.7, s1: 0.2, life: 0.9, col: 0xffc040 }); for (let i = 0; i < 4; i++) rl3dPart(true, P(1.0), { v: [(Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6], s0: 0.25, s1: 0.05, life: 0.7, col: 0xffe080, delay: i * 0.06 }); rl3dWord(P(2.4), '+1', f.side === RL.me ? '#ffd060' : '#ffa898'); }
    else if (f.k === 'shield') { for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; rl3dPart(true, P(1.0), { v: [Math.cos(a) * 2.2, 1.5 + Math.random() * 1.5, Math.sin(a) * 2.2], g: 9, s0: 0.22, s1: 0.06, life: 0.55, col: i % 3 ? 0x8ac8d8 : 0xff8a50 }); } rl3dPart(true, P(1.0), { s0: 1.4, s1: 0.3, life: 0.25, col: 0xe8f8ff }); rl3dRing(P(0.06), 0.9, 0x8ac8d8, 0.45, 0.8); }
    else if (f.k === 'burst') { const r = f.r || 1.5, h = 1.7; rl3dPart(true, P(h), { s0: r * 1.4, s1: r * 3, life: 0.4, col: 0xc8ff90 }); rl3dPart(true, P(h), { s0: r, s1: 0.2, life: 0.6, col: 0xffffe0 }); rl3dRing(P(0.06), r, 0xb8ff80, 0.55, 0.8); for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, e = Math.random() * 2; rl3dPart(true, P(h), { v: [Math.cos(a) * 3, e - 0.5, Math.sin(a) * 3], g: 3, s0: 0.25, s1: 0.04, life: 0.6, col: 0xd8ffb0, drag: 1.5 }); } }
    else if (f.k === 'summon') { rl3dHulk(f.x, f.y, f.side); rl3dRing(P(0.06), (f.r || 2.5) + 0.3, mineCol, 0.8, 0.6); }
    else if (f.k === 'spin') { const r = f.r || 1.6; rl3dRing(P(0.5), r, 0xd8d8e0, 0.35, 0.6); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; rl3dPart(false, rv(f.x + Math.cos(a) * r * 0.8, f.y + Math.sin(a) * r * 0.8, RL_G0 + 0.2), { v: [-Math.sin(a) * 2, 0.3, -Math.cos(a) * 2], s0: 0.2, s1: 0.45, life: 0.4, col: 0xc8b898, op: 0.55, drag: 2 }); } }
    else if (f.k === 'spell' && C && ['mend', 'haste', 'dot', 'whirl', 'pull'].includes(C.ab)) { const col = { mend: 0xd8e070, haste: 0xe8f4ff, dot: 0x8ab0d0, whirl: 0x5ab0c0, pull: 0x9ad8e0 }[C.ab]; rl3dRing(P(0.06), (C.r || 3), col, 0.6, 0.7); }
    else if (f.k === 'go') {}
  }
  RL3.seen = hi;
}

// ---------- each frame ----------
function rl3dReset(clear) {
  if (!RL3.ok) return;
  for (const H of RL3.units.values()) rl3dUnitDrop(H); RL3.units.clear();
  for (const H of RL3.dying) rl3dUnitDrop(H); RL3.dying = [];
  for (const s of RL3.shots.values()) { RL3.scene.remove(s.g); if (s.sh) RL3.scene.remove(s.sh); if (s.ring) RL3.scene.remove(s.ring); } RL3.shots.clear();
  for (const z of RL3.zones.values()) RL3.scene.remove(z.g); RL3.zones.clear();
  for (const q of RL3.parts) { q.life = 0; q.m.visible = false; } for (const q of RL3.rings) { q.life = 0; q.m.visible = false; } for (const q of RL3.bolts) { q.life = 0; q.l.visible = false; }
  for (const q of RL3.arcs) { q.life = 0; q.l.visible = false; } for (const q of RL3.words) { q.life = 0; q.m.visible = false; } for (const o of RL3.props) RL3.scene.remove(o.g, o.bits, o.sh); RL3.props = [];
  for (const T of RL3.towers) { RL3.scene.remove(T.g, T.shadow); if (T.rubble) RL3.scene.remove(T.rubble); } RL3.towers = [];
  RL3.seen = RL.nid - 1; RL3.fitKey = ''; RL3.zoneKey = ''; RL3.flash = 0; RL3.shake = 0;
  if (clear) return;
  rl3dTowersBuild();
}
function rl3dUnitDrop(H) { RL3.scene.remove(H.g, H.sh); rl3dBarDrop(H.bar); if (H.aura) RL3.scene.remove(H.aura); if (H.beam) RL3.scene.remove(H.beam); }
// where the placement ghost is (from the HUD): { c, x, y, ok } or null
function rl3dGhost(o) {
  if (!RL3.ok) return;
  const G = RL3.ghost; if (!o) { G.visible = false; return; }
  const C = RL_CARD[o.c]; if (!C) { G.visible = false; return; }
  G.visible = true; G.position.copy(rv(o.x, o.y, RL_G0));
  const r = C.type === 'spell' ? C.r : (C.cnt || 1) > 1 ? 1.1 : (C.size || 0.5) + 0.2, col = !o.ok ? 0xff5040 : C.type === 'spell' ? 0xffe0a0 : RL_MINE;
  G.userData.ring.scale.setScalar(r); G.userData.disc.scale.setScalar(r); G.userData.ring.material.color.setHex(col); G.userData.disc.material.color.setHex(col);
  if (G.userData.c !== o.c) {
    if (G.userData.model) G.remove(G.userData.model); G.userData.model = null; G.userData.c = o.c;
    if (C.type !== 'spell') { const m = rl3dProto(o.c, true).clone(true); m.traverse(q => { if (q.isSprite) q.visible = false; else if (q.material) q.material = RL3.ghostMat; }); m.scale.setScalar(1.55); if (C.air) m.position.y = 2.2; G.add(m); G.userData.model = m; }
  }
  if (G.userData.model) { G.userData.model.rotation.y = RL.me ? 0 : Math.PI; G.userData.model.visible = true; }
  RL3.ghostMat.color.setHex(o.ok ? 0xbfe0ff : 0xff8070);
}
// the deploy zone: light where this card may go, red where not (repainted when a lane opens)
function rl3dZone(on) {
  if (!RL3.ok) return;
  RL3.zone.visible = !!on; if (!on) return;
  const key = RL.T.map(t => t.hp > 0 ? 1 : 0).join('') + RL.me; if (key === RL3.zoneKey) return; RL3.zoneKey = key;
  const c = RL3.zoneCv.getContext('2d'), n = 8; c.clearRect(0, 0, 18 * n, 32 * n);
  for (let j = 0; j < 32 * 2; j++) for (let i = 0; i < 18 * 2; i++) {
    const x = (i + 0.5) / 2, y = (j + 0.5) / 2, ok = rlCanPlace(RL.me, 'deckhand', x, y) || (RL.T.some(t => t.hp > 0 && Math.hypot(x - t.x, y - t.y) < t.r + 0.35) && (RL.me ? y > RLC.R1 : y < RLC.R0));
    const water = y > RLC.R0 && y < RLC.R1;
    c.fillStyle = ok ? 'rgba(190,225,255,0.16)' : water ? 'rgba(255,70,50,0.12)' : 'rgba(255,60,40,0.3)';
    c.fillRect(i * n / 2, (32 * 2 - 1 - j) * n / 2, n / 2, n / 2);
  }
  // the edge of where you may go, drawn bright
  c.strokeStyle = 'rgba(210,235,255,0.75)'; c.lineWidth = 2;
  for (let j = 0; j < 64; j++) for (let i = 0; i < 36; i++) {
    const x = (i + 0.5) / 2, y = (j + 0.5) / 2, ok = rlCanPlace(RL.me, 'deckhand', x, y) || (RL.me ? y > RLC.R1 : y < RLC.R0) && RL.T.some(t => t.hp > 0 && Math.hypot(x - t.x, y - t.y) < t.r + 0.35);
    if (!ok) continue; const up = (j + 1.5) / 2, okUp = up < 32 && (rlCanPlace(RL.me, 'deckhand', x, up) || (RL.me ? up > RLC.R1 : up < RLC.R0) && RL.T.some(t => t.hp > 0 && Math.hypot(x - t.x, up - t.y) < t.r + 0.35));
    const dn = (j - 0.5) / 2, okDn = dn > 0 && (rlCanPlace(RL.me, 'deckhand', x, dn) || (RL.me ? dn > RLC.R1 : dn < RLC.R0) && RL.T.some(t => t.hp > 0 && Math.hypot(x - t.x, dn - t.y) < t.r + 0.35));
    const py = (32 * 2 - 1 - j) * n / 2;
    if (!okUp) { c.beginPath(); c.moveTo(i * n / 2, py); c.lineTo((i + 1) * n / 2, py); c.stroke(); }
    if (!okDn) { c.beginPath(); c.moveTo(i * n / 2, py + n / 2); c.lineTo((i + 1) * n / 2, py + n / 2); c.stroke(); }
  }
  RL3.zoneTex.needsUpdate = true;
}
function rl3dDraw(dt) {
  if (!RL3.ok || !RL.on) return;
  RL3.t += dt; const t = RL3.t, S = RL3.scene;
  rl3dFit();
  RL3.seaU.t.value = t; RL3.seaU.cp.value.copy(RL3.cam.position);
  rl3dFx();
  const meCol = RL_MINE, thCol = RL_THEIRS;
  // the units: new ones built, gone ones left to fall, the rest placed and moving
  const live = new Set();
  for (const u of RL.U) {
    live.add(u.id);
    let H = RL3.units.get(u.id); if (!H) { H = rl3dUnitNew(u); RL3.units.set(u.id, H); }
    const [x, y] = rlPos(u), C = H.C, fly = H.air ? 2.2 + Math.sin(t * 2 + H.ph) * 0.12 : 0;
    if (u.dep > 0) H.rise = Math.min(1, H.rise + dt * 0.9); else H.rise = Math.min(1, H.rise + dt * 3);
    const rise = H.rise, k = (0.35 + 0.65 * rise) * 1.55;
    H.g.position.copy(rv(x, y, RL_G0 + fly * (H.air ? rise : 1) - (1 - rise) * (H.air ? 0 : 0.35)));
    H.m.rotation.y = Math.PI - (u.face || 0); H.g.scale.setScalar(k);
    H.sh.position.copy(rv(x, y, RL_G0 + 0.015)); H.sh.scale.setScalar(H.sz * (H.air ? 1.1 : 1.5)); H.sh.material.opacity = H.air ? 0.5 : 1;
    // walk, strike, idle
    const P = H.P, walk = u.st === 'walk', hit = u.st === 'hit', spd = (C.spd || 1) * (u.slow || u.fog ? 0.6 : 1) * (u.chg ? 2 : 1);
    if (walk) H.ph += dt * spd * 7; else H.ph += dt * 2;
    const sw = walk ? Math.sin(H.ph) : 0, hc = hit ? ((RL.clk + H.ph * 0.1) % (C.hit || 1)) / (C.hit || 1) : 0, pulse = hit ? Math.max(0, Math.sin(Math.min(1, hc * 2.2) * Math.PI)) : 0;
    if (P.body) { P.body.position.y = walk ? Math.abs(sw) * 0.06 : Math.sin(t * 2 + H.ph) * 0.012; P.body.rotation.z = walk ? sw * 0.05 : 0; if (!u.c.startsWith('drown')) P.body.rotation.x = hit ? pulse * 0.25 : u.chg ? 0.3 : 0; }
    if (P.legL) { P.legL.rotation.x = sw * 0.7; P.legR.rotation.x = -sw * 0.7; }
    if (P.armL && P.armL.userData.r0 == null) { P.armL.userData.r0 = P.armL.rotation.x; P.armR.userData.r0 = P.armR.rotation.x; }
    if (P.armR) { const a0 = P.armR.userData.r0 || 0; P.armR.rotation.x = a0 + (hit ? -pulse * 1.6 : -sw * 0.5); P.armL.rotation.x = (P.armL.userData.r0 || 0) + (walk ? sw * 0.5 : 0); }
    if (P.wingL) { const fl = Math.sin(t * (u.c === 'gulls' ? 14 : 9) + H.ph) * (hit && u.c === 'gannet' ? 0.2 : 0.7); P.wingL.rotation.z = fl; P.wingR.rotation.z = -fl; if (u.c === 'gannet' && P.body) P.body.rotation.x = hit ? pulse * 0.9 : 0; }
    if (P.clawL) { const o = hit ? pulse * 0.6 : Math.sin(t * 3 + H.ph) * 0.1; P.clawL.rotation.y = -o; P.clawR.rotation.y = o; P.clawL.rotation.x = P.clawR.rotation.x = -o * 0.5; }
    if (P.legs) P.legs.rotation.y = walk ? Math.sin(H.ph * 2) * 0.12 : 0;
    if (P.skirt) P.skirt.rotation.z = sw * 0.06;
    if (P.seg0) for (let i = 0; i < 7; i++) { const sg = P['seg' + i]; if (sg) { sg.position.x = Math.sin(H.ph * 0.7 - i * 0.9) * 0.12 * i * 0.4; sg.position.y = hit && i === 0 ? pulse * 0.2 : 0; } }
    for (let i = 0; i < 16; i++) { const f = P['frond' + i]; if (!f) break; f.rotation.y = Math.sin(t * 1.6 + i) * 0.2; }
    if (P.flame) { const fk = 0.85 + Math.sin(t * 23 + H.ph) * 0.1 + Math.sin(t * 37) * 0.06; P.flame.scale.set(fk, fk * (1 + Math.sin(t * 17) * 0.12), fk); }
    if (P.lamp && P.lamp.userData.swing) P.lamp.rotation.x = Math.sin(t * 2.4 + H.ph) * 0.3;
    if (P.gun && u.tg) { const T = RL.T.find(q => q.id === u.tg) || RL.U.find(q => q.id === u.tg); if (T) { const ga = Math.atan2(T.x - x, T.y - y); P.gun.rotation.y = (u.face || 0) - ga; } }
    if (P.bell) P.bell.rotation.z = Math.sin(t * 5) * 0.25 * Math.max(0, Math.sin(t * 0.8));
    if (u.c === 'bellbuoy' && P.body) P.body.rotation.z = Math.sin(t * 1.3 + H.ph) * 0.05;
    if (u.c === 'fogwraith') { const op = u.cloak > 0 ? 0.16 + Math.sin(t * 6) * 0.05 : 0.5; H.m.traverse(o => { if (o.material && o.material.transparent && o.material.opacity !== undefined && o.material.blending !== THREE.AdditiveBlending) o.material.opacity = op; }); H.g.position.y += Math.sin(t * 2 + H.ph) * 0.08 + 0.1; }
    if (u.stun > 0) H.m.rotation.y += Math.sin(t * 14) * 0.15;
    rl3dAnim2(u, H, x, y, t, dt, walk, hit, pulse);
    // its health, once it's hurt
    if (u.hp < H.hpLast - 0.5) H.flash = 0.12; H.hpLast = u.hp;
    const showBar = u.hp < u.max - 0.5 || u.bld;
    if (showBar && !H.bar) H.bar = rl3dBar(Math.max(0.6, H.sz * 1.6), 0.1);
    if (H.bar) { const top = (H.air ? 3.4 : (u.bld ? 1.9 : 1.7) * Math.max(0.8, H.sz * 1.6)) + RL_G0; rl3dBarSet(H.bar, rv(x, y, top), u.hp / u.max, u.side === RL.me ? meCol : thCol, showBar); }
  }
  for (const [id, H] of RL3.units) if (!live.has(id)) { RL3.units.delete(id); rl3dBarSet(H.bar || { bg: { visible: 0 }, fg: { visible: 0 } }, null, 0, 0, false); H.die = 0.5; if (H.aura) H.aura.visible = false; if (H.beam) H.beam.visible = false; RL3.dying.push(H); }
  RL3.dying = RL3.dying.filter(H => { H.die -= dt; const f = Math.max(0, H.die / 0.5); H.g.scale.setScalar(Math.max(0.01, f) * 1.55); H.g.position.y -= dt * (H.air ? 3 : 0.6); H.m.rotation.z += dt * 3; H.sh.material.opacity = f; if (H.die <= 0) { rl3dUnitDrop(H); return false; } return true; });
  // the towers: their lamps, the beams, their health, and the fall
  RL.T.forEach((tw, i) => {
    const T = RL3.towers[i]; if (!T) return;
    const mine = tw.side === RL.me, awake = tw.awake && tw.hp > 0, shot = tw.shotAt != null && RL.clk - tw.shotAt < 0.18;
    T.beam.visible = awake; T.beam.rotation.y = t * (tw.k === 'great' ? 0.7 : 1.0) + i;
    T.bm.opacity = 0.06 + (shot ? 0.08 : 0);
    T.glow.visible = tw.hp > 0; T.glow.material.opacity = awake ? 0.55 + (shot ? 0.45 : 0) + Math.sin(t * 3 + i) * 0.05 : 0.18;
    T.glow.scale.setScalar((tw.k === 'great' ? 3.2 : 2.4) * (shot ? 1.35 : 1));
    if (T.lamp && T.lamp.material && T.lamp.material.emissive) { if (!T.lamp.userData.mine) { T.lamp.material = T.lamp.material.clone(); T.lamp.userData.mine = 1; } T.lamp.material.emissive.setHex(awake ? (shot ? 0xffffff : 0xffc050) : 0x3a2a10); }
    if (T.m.userData && typeof T.m.userData.tick === 'function') { try { T.m.userData.tick(t); } catch (e) {} }
    if (tw.hp <= 0 && !T.fall && !T.rubble) T.fall = 1.3;   // (a late snapshot, or a tower already down)
    if (T.fall > 0 && !T.rubble) {
      T.fall += dt; const f = Math.min(1, T.fall / 1.3), e = f * f;
      T.g.rotation.z = e * 1.2 * (i % 2 ? 1 : -1); T.g.position.y = RL_G0 - e * 2.2; T.glow.visible = T.beam.visible = false;
      if (f >= 1) { T.g.visible = false; T.rubble = rl3dRubble(tw); }
    }
    if (T.rubble && Math.random() < dt * 3) rl3dPart(false, rv(tw.x + (Math.random() - 0.5), tw.y + (Math.random() - 0.5), RL_G0 + 0.8), { v: [0.2, 0.8, 0], s0: 0.5, s1: 1.6, life: 1.8, col: 0x5a5450, op: 0.45 });
  });
  // the shots in flight
  const sl = new Set();
  for (const p of RL.P) {
    sl.add(p.id);
    let s = RL3.shots.get(p.id);
    if (!s) s = rl3dShotNew(p);
    const f = Math.min(1, p.t / p.dur), T = p.tg ? (RL.U.find(u => u.id === p.tg) || RL.T.find(q => q.id === p.tg)) : null;
    const ground = p.k === 'grenade' || p.k === 'mortar', th = ground ? 0.3 : T && T.air ? 2.6 : T && T.k ? 2.2 : 0.7, h0 = p.h || (p.k === 'lob' || p.k === 'keg' ? 3 : p.k === 'mortar' ? 1.0 : 0.9);
    const arc = { lob: 7, keg: 8, oil: 1.6, lantern: 2, ball: 0.5, stone: 0.4, flare: 0.6, grenade: 3.2, mortar: 9, net: 1.6, herring: 0.5, song: 0.2 }[p.k] || 0;
    const x = p.sx + (p.tx - p.sx) * f, y = p.sy + (p.ty - p.sy) * f, h = h0 + (th - h0) * f + arc * 4 * f * (1 - f);
    const pos = rv(x, y, RL_G0 + h);
    if (s.last) { const d = pos.clone().sub(s.last); if (d.lengthSq() > 1e-6) s.g.lookAt(pos.clone().add(d)); }
    s.last = pos.clone(); s.g.position.copy(pos);
    if (s.sh) { s.sh.position.copy(rv(x, y, RL_G0 + 0.02)); s.sh.scale.setScalar(0.4 + (1 - Math.min(1, h / 8)) * 0.5); }
    if (s.ring) { s.ring.material.opacity = 0.4 + Math.sin(t * 12) * 0.2; }
    if (s.spin) { s.spin.rotation.z += dt * (p.k === 'herring' ? 18 : 4); if (s.grow) s.spin.scale.setScalar(0.5 + f * 1.2); }
    if (s.pulse) s.g.scale.setScalar(1 + Math.sin(t * 14) * 0.2);
    if (p.k === 'rocket' && Math.random() < 0.8) rl3dPart(false, pos, { v: [0, 0.5, 0], s0: 0.2, s1: 0.7, life: 0.7, col: 0xd8d0c8, op: 0.6 });
    else if (p.k === 'gale' && Math.random() < 0.6) rl3dPart(false, pos, { v: [0, 0.2, 0], s0: 0.25, s1: 0.5, life: 0.3, col: 0xf0f8ff, op: 0.5 });
    else if ((p.k === 'bolt2' || p.k === 'song') && Math.random() < 0.6) rl3dPart(true, pos, { s0: 0.3, s1: 0.05, life: 0.25, col: p.k === 'song' ? 0x90ffe0 : 0xb8d0ff });
    else if ((p.k === 'grenade' || p.k === 'mortar') && Math.random() < 0.5) rl3dPart(true, pos, { v: [0, 0.4, 0], s0: 0.18, s1: 0.04, life: 0.3, col: 0xffc060 });
    if (s.glow && (p.k === 'oil' || p.k === 'lantern' || p.k === 'flare') && Math.random() < 0.5) rl3dPart(true, pos, { s0: 0.3, s1: 0.05, life: 0.25, col: p.k === 'lantern' ? 0xd0ffa0 : p.k === 'flare' ? 0xff6050 : 0xffa040 });
  }
  for (const [id, s] of RL3.shots) if (!sl.has(id)) { S.remove(s.g); if (s.sh) S.remove(s.sh); if (s.ring) S.remove(s.ring); RL3.shots.delete(id); }
  // the lasting spells
  const zl = new Set();
  for (const z of RL.Z) {
    zl.add(z.id); let Z = RL3.zones.get(z.id); if (!Z) Z = rl3dZoneNew(z);
    const f = z.t / z.dur, fade = Math.min(1, z.t * 3, Math.max(0, (z.dur + (z.k === 'wave' ? 0.4 : 0) - z.t) * 2));
    if (z.k === 'haar') { Z.g.position.copy(rv(z.x, z.y, RL_G0)); Z.puffs.forEach((q, i) => { const a = t * 0.25 + i * 1.3; q.position.set(Math.cos(a) * z.r * 0.55 * (0.4 + (i % 3) * 0.3), 0.6 + (i % 2) * 0.5, Math.sin(a) * z.r * 0.55 * (0.4 + (i % 3) * 0.3)); q.material.opacity = 0.42 * fade; }); }
    else if (Z.k2) rl3dZone2(z, Z, t, dt, fade);
    else { const y = z.y0 != null ? z.y0 + z.dir * 6 * Math.min(z.t, z.dur) : z.y; Z.g.position.copy(rv(z.x, y, 0)); Z.g.rotation.y = z.dir * (RL.me ? 1 : 1) > 0 ? 0 : Math.PI; Z.mat.opacity = 0.7 * fade; Z.foam.material.opacity = 0.9 * fade; Z.g.scale.y = 0.6 + 0.4 * Math.sin(Math.min(1, f) * Math.PI); if (Math.random() < 0.6) rl3dPart(false, rv(z.x + (Math.random() - 0.5) * z.w, y, RL_G0 + 1), { v: [0, 1.5, z.dir * -2], g: 5, s0: 0.3, s1: 0.5, life: 0.5, col: 0xe8f8f8, op: 0.8 * fade }); }
  }
  for (const [id, Z] of RL3.zones) if (!zl.has(id)) { S.remove(Z.g); RL3.zones.delete(id); }
  // the effects' pools
  for (const q of RL3.parts) {
    if (q.life <= 0) continue;
    if (q.delay > 0) { q.delay -= dt; if (q.delay <= 0) q.m.visible = true; continue; }
    q.life -= dt; if (q.life <= 0) { q.m.visible = false; continue; }
    const f = 1 - q.life / q.max; q.v[1] -= q.g * dt; const dr = Math.max(0, 1 - q.drag * dt); q.v[0] *= dr; q.v[2] *= dr;
    q.m.position.x += q.v[0] * dt; q.m.position.y += q.v[1] * dt; q.m.position.z += q.v[2] * dt;
    q.m.scale.setScalar(q.s0 + (q.s1 - q.s0) * f); q.m.material.opacity = q.op * (1 - f * f);
  }
  for (const q of RL3.rings) { if (q.life <= 0) continue; if (q.delay > 0) { q.delay -= dt; if (q.delay <= 0) q.m.visible = true; continue; } q.life -= dt; if (q.life <= 0) { q.m.visible = false; continue; } const f = 1 - q.life / q.max; q.m.scale.setScalar(Math.max(0.01, q.r * (q.inv ? 1 - f : 0.3 + 0.7 * Math.sqrt(f)))); q.m.material.opacity = q.op * (q.inv ? Math.min(1, (1 - f) * 2.5) : 1 - f); }
  for (const q of RL3.arcs) { if (q.life <= 0) continue; if (q.delay > 0) { q.delay -= dt; if (q.delay <= 0) q.l.visible = true; continue; } q.life -= dt; const o = Math.max(0, q.life / q.max) * (0.6 + Math.random() * 0.4); q.l.userData.mat[0].opacity = o * 0.5; q.l.userData.mat[1].opacity = o; if (q.life <= 0) q.l.visible = false; }
  for (const q of RL3.words) { if (q.life <= 0) continue; q.life -= dt; if (q.life <= 0) { q.m.visible = false; continue; } const f = 1 - q.life / q.max; q.m.position.y += dt * 1.1; q.m.material.opacity = f < 0.7 ? 1 : (1 - f) / 0.3; }
  RL3.props = RL3.props.filter(o => rl3dProp(o, dt));
  for (const q of RL3.bolts) { if (q.life <= 0) continue; if (q.delay > 0) { q.delay -= dt; if (q.delay <= 0) { q.l.visible = true; const p = rv(q.at[0], q.at[1], RL_G0 + 0.5); rl3dPart(true, p, { s0: 3, s1: 5, life: 0.3, col: 0xc8dcff }); rl3dRing(p, 1.6, 0xc8dcff, 0.4); RL3.flash = Math.max(RL3.flash || 0, 0.25); } continue; } q.life -= dt; q.l.material.opacity = Math.max(0, q.life / q.max) * (0.6 + Math.random() * 0.4); if (q.life <= 0) q.l.visible = false; }
  // a shake when a tower falls
  if (RL3.shake > 0) { RL3.shake -= dt; const k = RL3.shake * 0.25; RL3.cam.position.x += (Math.random() - 0.5) * k; RL3.cam.position.z += (Math.random() - 0.5) * k; }
  if (typeof rlHudFlash === 'function' && RL3.flash > 0) { rlHudFlash(RL3.flash); RL3.flash = 0; }
  rl3dScale(dt);
  RL3.r.render(S, RL3.cam);
  if (RL3.shake > 0 || RL3.shook) { RL3.shook = RL3.shake > 0; RL3.fitKey = ''; }
}
function rl3dShotNew(p) {
  const g = new THREE.Group(), S = RL3.scene, s = { g };
  const glow = (col, sc) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('glow'), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(sc); g.add(sp); s.glow = sp; };
  if (p.k === 'bolt') { glow(0xffe8a0, 1.0); rlAdd(g, gSph(0.12, 6), rlMat(0xffffff, { basic: 1 })); rlAdd(g, gCyl(0.05, 0.0, 0.9, 5), rlMat(0xffe0a0, { add: 1, op: 0.8 }), [0, 0, -0.45], [Math.PI / 2, 0, 0]); }
  else if (p.k === 'harpoon') { rlAdd(g, gCyl(0.025, 0.025, 1.0, 4), rlMat(0x8a6a40), [0, 0, -0.2], [Math.PI / 2, 0, 0]); rlAdd(g, gCone(0.06, 0.2, 4), rlMat(0xc0c0c8), [0, 0, 0.35], [Math.PI / 2, 0, 0]); }
  else if (p.k === 'shot') { rlAdd(g, gSph(0.06, 5), rlMat(0x2a2a2a)); glow(0xffd080, 0.3); }
  else if (p.k === 'stone') rlAdd(g, gDod(0.1), rlMat(0x8a8a80));
  else if (p.k === 'oil') { rlAdd(g, gSph(0.12, 6), rlMat(0xff9030, { em: 0xff6010 })); glow(0xffa040, 1.0); }
  else if (p.k === 'lantern') { rlAdd(g, gSph(0.12, 6), rlMat(0xe0ffc0, { em: 0xa0e060 })); glow(0xd8ffb0, 1.2); }
  else if (p.k === 'flare') { rlAdd(g, gSph(0.09, 6), rlMat(0xff6050, { em: 0xff3020 })); glow(0xff7060, 1.0); }
  else if (p.k === 'ball') rlAdd(g, gSph(0.13, 7), rlMat(0x26262a));
  else if (p.k === 'lob' || p.k === 'keg') {
    if (p.k === 'keg') { rlAdd(g, gCyl(0.3, 0.3, 0.5, 10), rlMat(0x7a5030), null, [0, 0, Math.PI / 2]); rlFlame(g, [0, 0.3, 0], 0.8); }
    else rlAdd(g, gSph(0.3, 10), rlMat(0x202024));
    s.sh = rlAdd(S, new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: rlTex('shadow'), transparent: true, depthWrite: false }), null, [-Math.PI / 2, 0, 0]);
    // (where it'll come down: a ring in the caster's colour)
    const C = RL_CARD[p.c]; s.ring = rlAdd(S, new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: p.side === RL.me ? 0x9cc8ff : 0xff9a8a, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), null, [-Math.PI / 2, 0, 0], (C && C.r) || 2.5); s.ring.position.copy(rv(p.tx, p.ty, RL_G0 + 0.04)); s.ring.renderOrder = 3;
  }
  else if (p.k === 'herring') { const f = rlGrp(g, [0, 0, 0], 'spin'); rlAdd(f, gCone(0.07, 0.36, 5), rlMat(0xc8d8e0, { em: 0x202830 }), [0, 0, 0.04], [Math.PI / 2, 0, 0], [1, 0.45, 1]); rlAdd(f, gCone(0.07, 0.12, 4), rlMat(0x8a9aa8), [0, 0, -0.18], [-Math.PI / 2, 0, 0], [1, 0.3, 1]); s.spin = f; }
  else if (p.k === 'net') { const n = rlGrp(g, [0, 0, 0], 'spin'); rlAdd(n, gCone(0.34, 0.2, 8), rlNetMat(), [0, 0, 0], [-Math.PI / 2, 0, 0]); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; rlAdd(n, gSph(0.04, 4), rlMat(0xe08a30), [Math.cos(a) * 0.34, Math.sin(a) * 0.34, -0.1]); } s.spin = n; s.grow = 1; }
  else if (p.k === 'grenade' || p.k === 'mortar') {
    const big = p.k === 'mortar'; rlAdd(g, gSph(big ? 0.24 : 0.12, 8), rlMat(0x1a1a1e)); glow(0xffb050, big ? 0.6 : 0.45);
    s.sh = rlAdd(S, new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: rlTex('shadow'), transparent: true, depthWrite: false }), null, [-Math.PI / 2, 0, 0]);
    s.ring = rlAdd(S, new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: p.side === RL.me ? 0x9cc8ff : 0xff9a8a, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), null, [-Math.PI / 2, 0, 0], p.sp || (big ? 1.8 : 1.5)); s.ring.position.copy(rv(p.tx, p.ty, RL_G0 + 0.04)); s.ring.renderOrder = 3;
  }
  else if (p.k === 'rocket') { g.scale.setScalar(1.4); rlAdd(g, gCyl(0.06, 0.06, 0.44, 7), rlMat(0xe8e2d4), [0, 0, -0.05], [Math.PI / 2, 0, 0]); rlAdd(g, gCone(0.065, 0.16, 7), rlMat(0xd83a2a), [0, 0, 0.25], [Math.PI / 2, 0, 0]); rlAdd(g, gBox(0.2, 0.02, 0.1), rlMat(0xd83a2a), [0, 0, -0.24]); glow(0xffa040, 0.7); s.glow.position.z = -0.32; }
  else if (p.k === 'song') { glow(0x90ffe0, 1.0); rlAdd(g, gTor(0.2, 0.03, 12), rlMat(0xb8fff0, { add: 1, op: 0.8 }), [0, 0, 0], null, null, 'spin'); rlAdd(g, gTor(0.32, 0.02, 14), rlMat(0x80e0ff, { add: 1, op: 0.5 }), [0, 0, -0.25]); s.spin = g.getObjectByName('spin'); s.pulse = 1; }
  else if (p.k === 'bolt2') { glow(0xa8c4ff, 1.2); rlAdd(g, gSph(0.1, 6), rlMat(0xffffff, { basic: 1 })); rlAdd(g, gCyl(0.06, 0.0, 1.3, 5), rlMat(0xb8d0ff, { add: 1, op: 0.9 }), [0, 0, -0.65], [Math.PI / 2, 0, 0]); }
  else if (p.k === 'gale') { glow(0xe8f4ff, 0.7); for (let i = 0; i < 3; i++) rlAdd(g, gCyl(0.02, 0.0, 0.7, 4), rlMat(0xf0f8ff, { add: 1, op: 0.7 }), [(i - 1) * 0.12, (i % 2) * 0.08, -0.3], [Math.PI / 2, 0, 0]); }
  else rlAdd(g, gSph(0.08, 5), rlMat(0x333333));
  // (the shooter's gun or tube kicks back as it goes)
  if (p.c && p.sx != null) { const H = rl3dKick(p.c, p.side, p.sx, p.sy, 1.6); if (H && (p.k === 'rocket' || p.k === 'mortar' || p.k === 'ball')) for (let i = 0; i < 4; i++) rl3dPart(false, rv(p.sx, p.sy, RL_G0 + (p.k === 'mortar' ? 1.0 : 1.4)), { v: [(Math.random() - 0.5) * 1.2, 0.9, (Math.random() - 0.5) * 1.2], s0: 0.3, s1: 0.9, life: 0.7, col: 0xd8d0c8, op: 0.6 }); }
  S.add(g); RL3.shots.set(p.id, s); return s;
}
function rl3dZoneNew(z) {
  const g = new THREE.Group(), Z = { g };
  if (z.k === 'haar') { Z.puffs = []; for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('smoke'), color: 0xe8eef4, transparent: true, depthWrite: false, opacity: 0, fog: false })); sp.scale.setScalar(z.r * 1.3); g.add(sp); Z.puffs.push(sp); } const ring = rlAdd(g, new THREE.RingGeometry(z.r * 0.95, z.r, 48), new THREE.MeshBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), [0, 0.05, 0], [-Math.PI / 2, 0, 0]); ring.renderOrder = 3; }
  else if (z.k !== 'wave') rl3dZoneNew2(z, g, Z);
  else {
    const w = z.w || 3, geo = new THREE.CylinderGeometry(0.7, 0.7, w, 10, 1, false, 0, Math.PI); geo.rotateZ(Math.PI / 2); geo.rotateX(-Math.PI / 2);
    Z.mat = new THREE.MeshLambertMaterial({ color: 0x3a8a8a, transparent: true, opacity: 0.7, emissive: 0x0a2a2a });
    const m = new THREE.Mesh(geo, Z.mat); m.position.y = RL_G0 + 0.1; m.scale.set(1, 1.3, 0.8); g.add(m);
    Z.foam = rlAdd(g, gBox(w, 0.12, 0.3), new THREE.MeshLambertMaterial({ color: 0xf0f8f8, transparent: true, opacity: 0.9 }), [0, RL_G0 + 1.0, 0.15]);
  }
  RL3.scene.add(g); RL3.zones.set(z.id, Z); return Z;
}

// the second 32's lasting spells: Lamp Oil's mending ground, Fair Wind's streaks, Brine Rain's cloud, the Whirlpool
// (and a plain ring for any kind not known here)
function rl3dZoneNew2(z, g, Z) {
  const r = z.r || 3, col = { mend: 0xd8e070, haste: 0xe8f4ff, dot: 0x8ab0d0, whirl: 0x6ac0c8 }[z.k] || 0xe8e0c0;
  Z.k2 = z.k; Z.edge = rlAdd(g, new THREE.RingGeometry(r * 0.96, r, 56), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), [0, 0.05, 0], [-Math.PI / 2, 0, 0]); Z.edge.renderOrder = 3;
  if (z.k === 'mend' || z.k === 'haste' || z.k === 'dot') { Z.disc = rlAdd(g, new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, blending: z.k === 'dot' ? THREE.NormalBlending : THREE.AdditiveBlending }), [0, 0.04, 0], [-Math.PI / 2, 0, 0]); Z.disc.renderOrder = 2; }
  if (z.k === 'haste') { Z.streaks = []; for (let i = 0; i < 10; i++) { const m = rlAdd(g, gBox(0.06, 0.04, 1.3), new THREE.MeshBasicMaterial({ color: 0xf4faff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.userData.o = [Math.random() * 2 - 1, Math.random(), 0.3 + Math.random() * 1.2]; Z.streaks.push(m); } }
  if (z.k === 'dot') { Z.puffs = []; for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rlTex('smoke'), color: i % 2 ? 0x5a6470 : 0x707a86, transparent: true, depthWrite: false, opacity: 0, fog: false })); sp.scale.set(r * 1.1, r * 0.6, 1); g.add(sp); Z.puffs.push(sp); } Z.drops = []; const dm = new THREE.MeshBasicMaterial({ color: 0xc8e0f4, transparent: true, opacity: 0, depthWrite: false, fog: false }); Z.dm = dm; for (let i = 0; i < (RL3.lite ? 22 : 34); i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * r * 0.95, m = rlAdd(g, gBox(0.035, 0.55, 0.035), dm, [Math.cos(a) * d, 0, Math.sin(a) * d]); m.userData.o = Math.random(); Z.drops.push(m); } }
  if (z.k === 'whirl') {
    Z.disc = rlAdd(g, new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: rl3dSpiralTex(), transparent: true, opacity: 0, depthWrite: false }), [0, 0.06, 0], [-Math.PI / 2, 0, 0]); Z.disc.renderOrder = 2;
    Z.funnel = rlAdd(g, rlGeo('whirlFunnel', () => new THREE.ConeGeometry(1, 1, 18, 1, true)), new THREE.MeshBasicMaterial({ color: 0x10303a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), [0, -0.1, 0], [Math.PI, 0, 0], [r * 0.35, 0.8, r * 0.35]);
  }
}
function rl3dZone2(z, Z, t, dt, fade) {
  const r = z.r || 3; Z.g.position.copy(rv(z.x, z.y, RL_G0)); Z.edge.material.opacity = 0.55 * fade;
  const rnd = () => { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * r; return [z.x + Math.cos(a) * d, z.y + Math.sin(a) * d]; };
  if (z.k === 'mend') { Z.disc.material.opacity = (0.12 + Math.sin(t * 3) * 0.04) * fade; if (Math.random() < dt * 22 * fade) { const [px, py] = rnd(); rl3dPart(true, rv(px, py, RL_G0 + 0.1), { v: [0, 0.9 + Math.random() * 0.6, 0], s0: 0.3, s1: 0.05, life: 1.0, col: Math.random() < 0.5 ? 0xc8f060 : 0xffd860 }); } }
  else if (z.k === 'haste') {
    Z.disc.material.opacity = 0.06 * fade; const dir = z.side ? 1 : -1;
    for (const m of Z.streaks) { const o = m.userData.o, f = (o[1] + t * o[2] * 0.9) % 1, zz = (f * 2 - 1) * r * dir, xx = o[0] * Math.sqrt(Math.max(0, r * r - zz * zz)) * 0.9; m.position.set(xx, 0.35 + o[2] * 0.6, zz); m.material.opacity = 0.65 * fade * Math.sin(f * Math.PI); }
    if (Math.random() < dt * 8 * fade) { const [px, py] = rnd(); rl3dPart(false, rv(px, py, RL_G0 + 0.15), { v: [0, 0.2, dir * 3], s0: 0.2, s1: 0.4, life: 0.5, col: 0xd8d0b8, op: 0.35 }); }
  }
  else if (z.k === 'dot') {
    Z.disc.material.opacity = 0.16 * fade; Z.puffs.forEach((q, i) => { const a = t * 0.2 + i * 0.9; q.position.set(Math.cos(a) * r * 0.45 * ((i % 3) * 0.35 + 0.3), 3.3 + (i % 2) * 0.4, Math.sin(a) * r * 0.45 * ((i % 3) * 0.35 + 0.3)); q.material.opacity = 0.85 * fade; });
    Z.dm.opacity = 0.7 * fade; for (const m of Z.drops) { const f = (m.userData.o + t * 2.2) % 1; m.position.y = 3.2 * (1 - f); }
    if (Math.random() < dt * 14 * fade) { const [px, py] = rnd(); rl3dPart(false, rv(px, py, RL_G0 + 0.1), { v: [0, 0.6, 0], s0: 0.12, s1: 0.35, life: 0.3, col: 0xd8ecf8, op: 0.7 }); }
  }
  else if (z.k === 'whirl') {
    Z.disc.material.opacity = 0.85 * fade; Z.disc.rotation.z = -t * 3.2; Z.funnel.material.opacity = 0.7 * fade; Z.funnel.rotation.y = t * 4;
    if (Math.random() < dt * 26 * fade) { const a = Math.random() * 6.283, d = r * (0.5 + Math.random() * 0.5), sp = 2.4; rl3dPart(false, rv(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, RL_G0 + 0.15), { v: [(-Math.sin(a) * sp - Math.cos(a)) , 0.25, -(Math.cos(a) * sp - Math.sin(a))], s0: 0.22, s1: 0.1, life: 0.6, col: 0xe8f8f8, op: 0.8 }); }
  }
}
// ---------- the second 32 (v200): their motions, the states that show on any unit, and their effects ----------
// a unit's holder by what's there (a card, a side, a spot), for the effects that move a model or kick a gun
function rl3dFind(c, side, x, y, rr) {
  let best = null, bd = (rr || 1.2) * (rr || 1.2);
  for (const u of RL.U) { if ((c && u.c !== c) || (side != null && u.side !== side)) continue; const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y); if (d < bd) { bd = d; best = u; } }
  return best ? RL3.units.get(best.id) : null;
}
function rl3dKick(c, side, x, y, rr) { const H = rl3dFind(c, side, x, y, rr); if (H) H.kick = 1; return H; }
const rlV3 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
function rl3dAnim2(u, H, x, y, t, dt, walk, hit, pulse) {
  const P = H.P, c = u.c, C = H.C;
  if (H.kick > 0) H.kick = Math.max(0, H.kick - dt * 3);
  // a pounce: the cat already stands where it lands; the model flies the arc from where it was
  if (H.leap) {
    const L = H.leap; L.t += dt; const f = Math.min(1, L.t / L.dur), hx = L.fx + (x - L.fx) * f, hy = L.fy + (y - L.fy) * f;
    H.g.position.copy(rv(hx, hy, RL_G0 + Math.sin(f * Math.PI) * 1.3)); if (P.body) P.body.rotation.x = -0.5 + f;
    if (f >= 1) { H.leap = null; for (let i = 0; i < 5; i++) { const a = Math.random() * 6.28; rl3dPart(false, rv(x, y, RL_G0 + 0.2), { v: [Math.cos(a) * 1.2, 0.5, Math.sin(a) * 1.2], s0: 0.25, s1: 0.6, life: 0.5, col: 0xc8b898, op: 0.6, drag: 2 }); } }
  }
  switch (c) {
    case 'bilgerats': if (P.tail) P.tail.rotation.y = Math.sin(t * 9 + H.ph) * 0.45; break;
    case 'shipscat': if (P.tail) P.tail.rotation.z = Math.sin(t * 2.2 + H.ph) * 0.35; break;
    case 'wisp': {
      const k = 1 + Math.sin(t * 9 + H.ph) * 0.15; if (P.orb) P.orb.scale.setScalar(k); if (P.halo) P.halo.scale.setScalar(1.1 + Math.sin(t * 5 + H.ph) * 0.2);
      if (P.orbit) P.orbit.rotation.set(0.5, t * 5, 0); if (P.glow) P.glow.scale.setScalar(1.3 + Math.sin(t * 7 + H.ph) * 0.2);
      H.g.position.y += Math.sin(t * 3 + H.ph) * 0.18 - 0.5;
      if (Math.random() < dt * 9) rl3dPart(true, rlV3.copy(H.g.position).add({ x: (Math.random() - 0.5) * 0.3, y: Math.random() * 0.2, z: (Math.random() - 0.5) * 0.3 }), { v: [0, 0.3, 0], s0: 0.35, s1: 0.05, life: 0.6, col: 0xb0ff80 });
      break;
    }
    case 'puffins': if (P.wingL) { const fl = Math.sin(t * 26 + H.ph) * 0.6; P.wingL.rotation.z = fl; P.wingR.rotation.z = -fl; } break;
    case 'petrel': H.g.position.x += Math.sin(t * 2.7 + H.ph) * 0.22; H.g.position.y += Math.sin(t * 4.1 + H.ph) * 0.12; if (P.body) P.body.rotation.z = Math.cos(t * 2.7 + H.ph) * 0.4; break;
    case 'seaeagle': if (P.wingL) { const fl = hit ? 0.2 + pulse * 0.6 : Math.sin(t * 4.5 + H.ph) * 0.45 + 0.1; P.wingL.rotation.z = fl; P.wingR.rotation.z = -fl; } if (P.body) P.body.rotation.x = hit ? pulse * 0.7 : 0; break;
    case 'anchorman': if (P.spin) {
      const S = P.spin; H.spz = H.spz == null ? -0.55 : H.spz; H.spz += ((hit ? -0.05 : -0.55) - H.spz) * Math.min(1, dt * 6);
      S.rotation.z = H.spz; if (hit) S.rotation.y = (S.rotation.y + dt * 11) % (Math.PI * 2); else S.rotation.y += (2.4 - S.rotation.y) * Math.min(1, dt * 3);
      break; }
    case 'krakenarm': {
      const cyc = hit ? ((RL.clk + H.ph * 0.1) % (C.hit || 1.8)) / (C.hit || 1.8) : 0, slap = hit ? (cyc < 0.6 ? -0.18 * (cyc / 0.6) : cyc < 0.72 ? -0.18 + 0.62 * ((cyc - 0.6) / 0.12) : 0.44 * (1 - (cyc - 0.72) / 0.28)) : 0;
      if (hit && cyc >= 0.7 && (H.slapAt || -1) < RL.clk - 0.5) { H.slapAt = RL.clk; const f = rlV3.set(Math.sin(u.face || 0), 0, Math.cos(u.face || 0)); for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28; rl3dPart(false, rv(x + f.x * 1.6, y + f.z * 1.6, RL_G0 + 0.3), { v: [Math.cos(a) * 2, 2 + Math.random() * 2, Math.sin(a) * 2], g: 9, s0: 0.3, s1: 0.2, life: 0.6, col: 0xd8f0f0, op: 0.85 }); } }
      for (let i = 0; i < 8; i++) { const s = P['k' + i]; if (!s) break; s.rotation.x = Math.sin(t * 1.4 + H.ph - i * 0.55) * 0.1 + [-0.06, -0.04, 0, 0.08, 0.2, 0.34, 0.5, 0.62][i] + slap * (0.4 + i * 0.12); s.rotation.z = Math.sin(t * 1.1 + H.ph - i * 0.6) * 0.09; }
      if (P.body && walk) P.body.position.y = 0;
      if (Math.random() < dt * 4) rl3dPart(false, rv(x + (Math.random() - 0.5) * 1.4, y + (Math.random() - 0.5) * 1.4, RL_G0 + 0.15), { v: [0, 0.4, 0], s0: 0.2, s1: 0.45, life: 0.6, col: 0xe0f4f4, op: 0.55 });
      break;
    }
    case 'crabmother': for (let i = 0; i < 6; i++) { const b = P['baby' + i]; if (b) { b.position.y = 0.66 + Math.abs(Math.sin(t * 7 + i * 1.7)) * 0.04; b.rotation.z = Math.sin(t * 5 + i) * 0.2; } } break;
    case 'siren': if (P.fluke) P.fluke.rotation.y = Math.sin(t * 2.5 + H.ph) * 0.35; break;
    case 'surgeon': if (P.pglow) P.pglow.scale.setScalar(0.5 + Math.sin(t * 4 + H.ph) * 0.15); break;
    case 'stormcaller': if (P.spark) P.spark.scale.setScalar((hit ? 1.3 : 0.8) + Math.random() * 0.5); break;
    case 'lobster': if (P.shield) { const on = u.sh == null ? true : u.sh > 0; P.shield.visible = on; if (P.glint) P.glint.scale.setScalar(on ? 0.15 + Math.pow(Math.max(0, Math.sin(t * 2.2 + H.ph)), 10) * 0.8 : 0.001); } break;
    case 'tarpit': for (let i = 0; i < 3; i++) { const b = P['bub' + i]; if (b) { const f = (t * 0.6 + i * 0.37 + H.ph) % 1; b.scale.setScalar(f < 0.9 ? 0.4 + f : 0.01); } } break;
    case 'foghorn': if (P.horn) { const k = 1 + H.kick * 0.3; P.horn.scale.set(k, k, 1 + H.kick * 0.15); P.horn.rotation.x = Math.sin(t * 40) * 0.04 * H.kick; } break;
    case 'mortar': if (P.barrel) P.barrel.position.y = 0.28 - H.kick * 0.12; break;
    case 'martello': case 'rocketcrew': break;
    case 'oilstore': if (P.lamp) P.lamp.scale.setScalar(1 + H.kick * 0.5); break;
    case 'burnlens': rl3dBeam(u, H, x, y, t, dt); break;
  }
  if (P.gun && H.kick > 0 && c !== 'mortar') P.gun.position.z = -H.kick * 0.08;
  // the Wrecker Chief's rally: a faint gold ring on the ground, four tiles round him
  if (H.aura) { H.aura.position.copy(rv(x, y, RL_G0 + 0.04)); H.aura.material.opacity = 0.16 + Math.sin(t * 2.5 + H.ph) * 0.06; H.aura.scale.setScalar(4 * (0.97 + Math.sin(t * 2.5 + H.ph) * 0.03)); }
  // the states any unit can be in, each a wisp of something now and then: hasted (a streak of wind), rallied (a gold
  // spark), tarred or slowed (a drip), being mended (a green twinkle)
  const top = H.air ? 2.6 : Math.max(1.0, H.sz * 2.2);
  if (u.hs && Math.random() < dt * 12) { const fa = u.face || 0; rl3dPart(true, rv(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, RL_G0 + 0.3 + Math.random() * top * 0.6), { v: [-Math.sin(fa) * 3, 0, Math.cos(fa) * 3], s0: 0.3, s1: 0.05, life: 0.4, col: 0xe8f4ff, op: 0.9 }); }
  if (u.ral && Math.random() < dt * 7) rl3dPart(true, rv(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, RL_G0 + top * (0.6 + Math.random() * 0.5)), { v: [0, 0.9, 0], s0: 0.32, s1: 0.05, life: 0.6, col: 0xffc840 });
  if ((u.tar || u.slow > 0) && !H.air && Math.random() < dt * 6) rl3dPart(false, rv(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, RL_G0 + 0.15), { v: [0, 0.15, 0], s0: 0.35, s1: 0.6, life: 0.7, col: u.tar ? 0x18161a : 0x9ab8d8, op: 0.75 });
  if (u.mend && Math.random() < dt * 8) rl3dPart(true, rv(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, RL_G0 + 0.3 + Math.random() * top * 0.6), { v: [0, 0.9, 0], s0: 0.3, s1: 0.05, life: 0.6, col: 0x90f080 });
}
// the Burning Lens: a beam from the glass to what it holds, hotter (wider, whiter) as the ramp climbs (u.rp 0..2)
function rl3dBeam(u, H, x, y, t, dt) {
  const T = u.st === 'hit' && u.tg ? (RL.U.find(q => q.id === u.tg) || RL.T.find(q => q.id === u.tg)) : null;
  if (!H.beam) {
    const geo = rlGeo('beamCyl', () => { const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; });
    H.beam = new THREE.Group(); H.beam.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })), new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfffff0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    H.beam.children[1].scale.set(0.35, 0.35, 1); H.beam.visible = false; RL3.scene.add(H.beam);
  }
  if (!T) { H.beam.visible = false; return; }
  const P = H.P, from = P.lens ? P.lens.getWorldPosition(new THREE.Vector3()) : rv(x, y, RL_G0 + 2.8), [tx, ty] = T.k ? [T.x, T.y] : rlPos(T), to = rv(tx, ty, RL_G0 + (T.air ? 2.4 : T.k ? 2.2 : 0.6));
  const rp = u.rp || 0, w = [0.05, 0.1, 0.18][rp] || 0.05, len = from.distanceTo(to);
  H.beam.visible = true; H.beam.position.copy(from); H.beam.lookAt(to); H.beam.scale.set(w * (1 + Math.sin(t * 30) * 0.15), w * (1 + Math.sin(t * 30) * 0.15), len);
  H.beam.children[0].material.color.setHex([0xffb050, 0xffd080, 0xfff0d0][rp] || 0xffb050);
  if (Math.random() < dt * (6 + rp * 8)) { rl3dPart(true, to, { v: [(Math.random() - 0.5), 1 + Math.random(), (Math.random() - 0.5)], s0: 0.3 + rp * 0.2, s1: 0.05, life: 0.4, col: 0xffa040 }); if (Math.random() < 0.4) rl3dPart(false, to, { v: [0, 1.2, 0], s0: 0.2, s1: 0.6, life: 0.7, col: 0x4a4440, op: 0.5 }); }
  if (P.lglow) P.lglow.scale.setScalar(0.7 + rp * 0.35 + Math.sin(t * 20) * 0.08);
}
// a lightning stroke between two points along the ground (the Stormcaller's chain), from a pool of lines
function rl3dArc(a, b, delay) {
  const q = RL3.arcs.find(q => q.life <= 0); if (!q) return;
  const pts = [];
  for (let i = 0; i < 10; i++) { const f = i / 9, j = i === 0 || i === 9 ? 0 : 0.45; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * f + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 0.5 + (Math.random() - 0.5) * j, a.z + (b.z - a.z) * f + (Math.random() - 0.5) * j)); }
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) { const m = q.l.children[i * 2 + j], w = j ? 0.035 : 0.11; m.position.copy(pts[i]); m.lookAt(pts[i + 1]); m.scale.set(w, w, pts[i].distanceTo(pts[i + 1]) + 0.02); }
  q.life = q.max = 0.4; q.delay = delay || 0; q.l.visible = !(delay > 0);
}
// a small word that rises and fades ("+1" over an Oil Store)
function rl3dWord(p, txt, col) {
  RL3.wtex = RL3.wtex || {}; const k = txt + col;
  if (!RL3.wtex[k]) { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.font = 'bold 44px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 7; x.strokeStyle = 'rgba(20,14,8,0.85)'; x.strokeText(txt, 64, 34); x.fillStyle = col; x.fillText(txt, 64, 34); RL3.wtex[k] = new THREE.CanvasTexture(c); }
  let q = RL3.words.find(q => q.life <= 0);
  if (!q) { if (RL3.words.length >= 6) return; q = { m: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false })), life: 0 }; q.m.renderOrder = 10; RL3.scene.add(q.m); RL3.words.push(q); }
  q.m.material.map = RL3.wtex[k]; q.m.material.needsUpdate = true; q.m.position.copy(p); q.m.scale.set(1.6, 0.8, 1); q.m.visible = true; q.life = q.max = 1.2;
}
// the Shipwreck: a hulk that drops out of the sky, breaks, and settles; timbers fly
function rl3dHulk(x, y, side) {
  const g = new THREE.Group(), wood = rlMat(0x5a3a22), dk = rlMat(0x3a2616), r = rlRng((x * 31 + y * 17) | 0);
  rlAdd(g, gSph(1, 10), wood, [0, 0.4, 0], null, [1.0, 0.7, 2.4]); rlAdd(g, gBox(1.7, 0.1, 3.8), dk, [0, 0.85, 0]);
  for (let i = 0; i < 6; i++) rlAdd(g, gBox(0.1, 0.5, 0.12), dk, [i % 2 ? 0.95 : -0.95, 1.0, -1.5 + i * 0.6], [0, 0, i % 2 ? -0.3 : 0.3]);
  const mast = rlGrp(g, [0.1, 0.9, 0.4]); mast.rotation.set(0.5, 0, 1.25); rlAdd(mast, gCyl(0.08, 0.1, 3.2, 6), dk, [0, 1.6, 0]); rlAdd(mast, gBox(1.6, 0.06, 0.06), dk, [0, 2.4, 0]); rlAdd(mast, gBox(1.2, 1.0, 0.02), rlMat(0xd8ccb0, { ds: 1 }), [0.2, 1.8, 0.05], [0, 0, 0.2]);
  g.rotation.set(0.25, r() * 6.28, 0.5); g.scale.setScalar(0.8); g.position.copy(rv(x, y, RL_G0 + 9)); RL3.scene.add(g);
  const bits = new THREE.Group(); bits.position.copy(rv(x, y, RL_G0)); bits.visible = false; RL3.scene.add(bits);
  for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 1.4 + r() * 1.2; rlAdd(bits, gBox(0.16, 0.06, 0.7 + r() * 0.5), i % 3 ? wood : dk, [Math.cos(a) * d, 0.04, Math.sin(a) * d], [0, r() * 3, r() * 0.3]); }
  rlAdd(bits, gCyl(0.25, 0.25, 0.45, 8), rlMat(0x6a4a2a), [1.6, 0.25, -0.6], [0, 0, Math.PI / 2]);
  const sh = rlAdd(RL3.scene, new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: rlTex('shadow'), transparent: true, depthWrite: false }), null, [-Math.PI / 2, 0, 0], 0.5); sh.position.copy(rv(x, y, RL_G0 + 0.02));
  RL3.props.push({ g, bits, sh, t: 0, x, y, side, k: 'hulk', hit: false });
}
function rl3dSpiralTex() {
  if (RL3.txSpiral) return RL3.txSpiral;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(6,20,30,0.95)'); g.addColorStop(0.5, 'rgba(30,80,96,0.75)'); g.addColorStop(1, 'rgba(60,120,130,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(230,248,248,0.75)'; x.lineCap = 'round';
  for (let k = 0; k < 4; k++) { x.beginPath(); for (let i = 0; i <= 60; i++) { const f = i / 60, a = k * Math.PI / 2 + f * 5.5, rr = 6 + f * 56; const px = 64 + Math.cos(a) * rr, py = 64 + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.lineWidth = 3; x.globalAlpha = 0.8; x.stroke(); }
  x.globalAlpha = 1; return (RL3.txSpiral = new THREE.CanvasTexture(c));
}
// a passing thing (the Shipwreck's hulk): false when it's done
function rl3dProp(o, dt) {
  o.t += dt;
  if (o.k === 'hulk') {
    const fall = 0.32;
    if (o.t < fall) { const f = o.t / fall; o.g.position.y = RL_G0 + 9 * (1 - f * f) + 0.2; o.sh.scale.setScalar(0.6 + f * 2); }
    else {
      if (!o.hit) { o.hit = true; o.bits.visible = true; o.sh.scale.setScalar(2.6); const P = h => rv(o.x, o.y, RL_G0 + h); RL3.shake = Math.max(RL3.shake || 0, 0.3);
        rl3dRing(P(0.06), 2.6, 0xd8c8a8, 0.6, 0.8); for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, sp = 2 + Math.random() * 3; rl3dPart(false, P(0.6), { v: [Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp], g: 9, s0: 0.3, s1: 0.2, life: 0.9, col: i % 3 ? 0x6a4a2a : 0xd8ccb0, op: 0.95 }); }
        for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28; rl3dPart(false, P(0.4), { v: [Math.cos(a) * 1.4, 0.6 + Math.random(), Math.sin(a) * 1.4], s0: 0.8, s1: 2.2, life: 1.3, col: 0xb8b0a0, op: 0.6, drag: 1.5 }); } }
      const k = o.t - fall, sink = Math.max(0, k - 1.4); o.g.position.y = RL_G0 - 0.12 - sink * 0.9; o.bits.position.y = RL_G0 - sink * 0.15; o.sh.material.opacity = Math.max(0, 1 - sink); o.g.rotation.z += dt * 0.04;
      if (k > 2.6) { RL3.scene.remove(o.g, o.bits, o.sh); return false; }
    }
  }
  return true;
}

// ---------- the card faces' pictures, when there's no art for them (src/rlhud.js) ----------
// a troop or a building: its own model, lit as on the rocks, rendered once on a small canvas of its own and kept;
// a spell: a plain picture of what it does, painted
function rl3dPortrait(id) {
  RL3.ptc = RL3.ptc || {}; if (RL3.ptc[id]) return RL3.ptc[id];
  const C = RL_CARD[id]; if (!C) return null;
  const out = document.createElement('canvas'); out.width = 150; out.height = 176; const x = out.getContext('2d');
  if (C.type === 'spell') { rl3dSpellIcon(x, id, 150, 176); return (RL3.ptc[id] = out); }
  if (typeof THREE === 'undefined') return null;
  let P = RL3.pt;
  if (!P) {
    try {
      const c = document.createElement('canvas'); c.width = 300; c.height = 352;
      const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xc8ccf0, 0x4a3438, 1.0)); const d = new THREE.DirectionalLight(0xffc89a, 1.2); d.position.set(-2, 3, 3); s.add(d); const b = new THREE.DirectionalLight(0x90a0ff, 0.5); b.position.set(3, 1, -2); s.add(b);
      P = RL3.pt = { c, r, s, cam: new THREE.PerspectiveCamera(28, 300 / 352, 0.1, 100) };
    } catch (e) { return null; }
  }
  const m = rl3dProto(id, true).clone(true); m.rotation.y = -0.55; P.s.add(m);
  m.traverse(o => { if (o.name === 'armR' && C.dmg) o.rotation.x -= 0.3; });
  const box = new THREE.Box3().setFromObject(m), ctr = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), R = Math.max(sz.x, sz.y * 1.05, sz.z) * 0.5 + 0.05;
  const d = R / Math.tan(P.cam.fov * Math.PI / 360) * 1.25;
  P.cam.position.set(ctr.x + d * 0.18, ctr.y + d * 0.42, ctr.z + d * 0.9); P.cam.lookAt(ctr.x, ctr.y - sz.y * 0.04, ctr.z);
  P.r.setClearColor(0x000000, 0); P.r.render(P.s, P.cam); P.s.remove(m);
  x.drawImage(P.c, 0, 0, 150, 176);
  return (RL3.ptc[id] = out);
}
function rl3dSpellIcon(c, id, W, H) {
  const cx = W / 2, cy = H * 0.42; c.lineCap = c.lineJoin = 'round';
  const glow = (r, col) => { const g = c.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  if (id === 'flare') { glow(70, 'rgba(255,250,220,0.95)'); c.strokeStyle = '#fff8e0'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); c.lineTo(cx + Math.cos(a) * (i % 2 ? 34 : 52), cy + Math.sin(a) * (i % 2 ? 34 : 52)); c.stroke(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 13, 0, 7); c.fill(); }
  else if (id === 'cannonshot' || id === 'powderkeg') {
    c.strokeStyle = 'rgba(255,230,180,0.5)'; c.setLineDash([5, 6]); c.lineWidth = 2; c.beginPath(); c.moveTo(18, H * 0.78); c.quadraticCurveTo(cx - 10, 4, cx + 22, cy - 6); c.stroke(); c.setLineDash([]);
    glow(60, 'rgba(255,140,40,0.35)');
    if (id === 'cannonshot') { const g = c.createRadialGradient(cx + 14, cy - 12, 2, cx + 22, cy, 26); g.addColorStop(0, '#8a8a90'); g.addColorStop(1, '#141418'); c.fillStyle = g; c.beginPath(); c.arc(cx + 22, cy, 24, 0, 7); c.fill(); }
    else { c.save(); c.translate(cx + 16, cy + 4); c.rotate(-0.3); c.fillStyle = '#7a5030'; c.fillRect(-26, -32, 52, 64); c.fillStyle = '#2a2420'; for (const y of [-24, 18]) c.fillRect(-28, y, 56, 6); c.strokeStyle = '#2a2420'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -32); c.quadraticCurveTo(10, -46, 4, -54); c.stroke(); c.restore(); glow(16, 'rgba(255,220,120,1)'); c.fillStyle = '#ffe080'; c.beginPath(); c.arc(cx + 8, cy - 58, 6, 0, 7); c.fill(); }
  }
  else if (id === 'roguewave') { for (let k = 0; k < 3; k++) { c.fillStyle = ['#1e5a5e', '#2e7a76', '#5aa89a'][k]; c.beginPath(); c.moveTo(0, H * 0.75 - k * 6); c.bezierCurveTo(W * 0.3, H * 0.7 - k * 10, W * 0.45, H * 0.15 + k * 18, W * 0.75, H * 0.2 + k * 16); c.bezierCurveTo(W * 0.95, H * 0.25 + k * 14, W * 0.85, H * 0.45, W * 0.68, H * 0.4 + k * 6); c.bezierCurveTo(W * 0.8, H * 0.6, W, H * 0.6, W, H * 0.7); c.lineTo(W, H); c.lineTo(0, H); c.fill(); } c.strokeStyle = '#eaf6f2'; c.lineWidth = 4; c.beginPath(); c.moveTo(W * 0.4, H * 0.32); c.bezierCurveTo(W * 0.5, H * 0.18, W * 0.75, H * 0.14, W * 0.84, H * 0.3); c.stroke(); }
  else if (id === 'haar') { for (let k = 0; k < 7; k++) { const g = c.createRadialGradient(20 + k * 20, cy - 20 + (k % 3) * 22, 0, 20 + k * 20, cy - 20 + (k % 3) * 22, 40); g.addColorStop(0, 'rgba(230,236,244,0.75)'); g.addColorStop(1, 'rgba(230,236,244,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); } }
  else if (id === 'stormbolts') { glow(70, 'rgba(160,190,255,0.6)'); c.fillStyle = '#eef4ff'; c.strokeStyle = '#a8c0ff'; c.lineWidth = 2; for (const [ox, k] of [[-30, 0.6], [0, 1], [30, 0.6]]) { c.beginPath(); c.moveTo(cx + ox + 8 * k, 10); c.lineTo(cx + ox - 12 * k, cy + 4 * k); c.lineTo(cx + ox + 2 * k, cy); c.lineTo(cx + ox - 8 * k, cy + 60 * k); c.lineTo(cx + ox + 16 * k, cy - 10 * k); c.lineTo(cx + ox + 2 * k, cy - 6 * k); c.closePath(); c.fill(); c.stroke(); } }
}
