// The 3D renderer (WebGL, three.js). It draws the world itself in real 3D: the sea as a moving,
// lit surface, the cliffs and headland, the piers and cottages, the lighthouse and its beam as a
// real cone with a spotlight in it, and the skerries, wrecks and drifting timber as solid shapes.
//
// It sits between two 2D canvases: the sky (and the far landscape) is painted behind it, and the
// creatures, ships, the deck and every effect are painted over it by the classic renderer. The
// 3D camera is set up to project exactly as the 2D one does, so the two line up.
//
// If WebGL is missing or fails, or the player picks "Classic 2D" in Settings, nothing here runs
// and the classic renderer draws everything, as before.

const bgCv = document.getElementById('bg'), glCv = document.getElementById('gl');
const bgx = bgCv ? bgCv.getContext('2d') : null;
const GL3D = { ok: false, tried: false, failed: false, r: null, scene: null, camera: null, coastKey: '', objs: new Map(), frame: 0, shown: null, wins: [], surf: [] };

// a stable pseudo-random number from a few numbers (never touches the seeded world RNG)
function glDispose(o) { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); }
function glHash(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
function glCol(s) {
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) { const p = m[1].split(',').map(Number); return [new THREE.Color(p[0] / 255, p[1] / 255, p[2] / 255), p.length > 3 ? p[3] : 1]; }
  return [new THREE.Color(s), 1];
}
const glRGB = s => { const p = s.split(',').map(Number); return new THREE.Color(p[0] / 255, p[1] / 255, p[2] / 255); };
// a colour laid over another at some alpha, as the 2D painter would
function glOver(base, top) { const [b] = glCol(base), [t, a] = glCol(top); return b.clone().lerp(t, a); }

function gl3dWanted() { return SETTINGS.renderer !== '2d'; }
function gl3dInit() {
  if (GL3D.tried) return GL3D.ok;
  GL3D.tried = true;
  if (typeof THREE === 'undefined' || !glCv || !bgx) { GL3D.failed = true; return false; }
  try {
    const r = new THREE.WebGLRenderer({ canvas: glCv, alpha: true, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.sortObjects = true;
    GL3D.r = r;
  } catch (e) { GL3D.failed = true; return false; }
  glCv.addEventListener('webglcontextlost', e => { e.preventDefault(); GL3D.ok = false; GL3D.failed = true; gl3dShow(false); });
  const scene = GL3D.scene = new THREE.Scene();
  GL3D.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 30000);
  GL3D.camera.rotation.order = 'YXZ';
  // light: the night itself (so colours read as the 2D painter mixed them), the moon, the beam and your lantern
  GL3D.amb = new THREE.AmbientLight(0xffffff, 0.9); scene.add(GL3D.amb);
  GL3D.moon = new THREE.DirectionalLight(0xc8d4ff, 0.35); scene.add(GL3D.moon); scene.add(GL3D.moon.target);
  GL3D.spot = new THREE.SpotLight(0xffe2a8, 2.2, SK.BEAM_RANGE * 1.3, SK.HALF_BEAM, 0.25, 1);
  GL3D.spot.position.set(0, 54, 0); scene.add(GL3D.spot); scene.add(GL3D.spot.target);
  GL3D.lantern = new THREE.PointLight(0xffb060, 1, SK.LANTERN, 1); scene.add(GL3D.lantern);
  buildSea(); buildBeam();
  GL3D.ok = true;
  gl3dResize();
  return true;
}
function gl3dResize() {
  if (!bgCv) return;
  bgCv.width = Math.round(W * dpr); bgCv.height = Math.round(H * dpr);
  if (GL3D.r) { GL3D.r.setPixelRatio(dpr); GL3D.r.setSize(W, H, false); }
}
// is the 3D renderer drawing this frame? (the Backrooms and the Open Sky stay with the classic one)
function gl3dActive() {
  const want = gl3dWanted() && g && !g.backrooms && !g.sky;
  return want && (GL3D.ok || (!GL3D.tried && gl3dInit()));
}
function gl3dShow(on) {
  if (GL3D.shown === on) return;
  GL3D.shown = on;
  if (bgCv) bgCv.style.visibility = on ? 'visible' : 'hidden';
  if (glCv) glCv.style.visibility = on ? 'visible' : 'hidden';
}
function gl3dRefresh() { gl3dShow(gl3dActive()); }

// ---------- the sea ----------
const SEA_VS = `
uniform float uT; uniform vec3 uCamPos;
varying vec3 vW; varying float vF; varying float vAmp;
float wh(vec2 p, float t) {
  return 0.18 * sin(p.x * 0.21 + t * 1.3) + 0.14 * sin(p.x * 0.05 + p.y * 0.17 - t * 1.1)
       + 0.09 * sin((p.x + p.y) * 0.37 + t * 2.1) + 0.05 * sin((p.x - p.y) * 0.61 - t * 2.7);
}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float d = length(w.xz - uCamPos.xz);
  vAmp = 1.0 - smoothstep(60.0, 420.0, d);
  w.y += wh(w.xz, uT) * vAmp;
  vW = w.xyz;
  vec4 mv = viewMatrix * w;
  vF = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const SEA_FS = `
uniform vec3 uSea0, uSea1, uSea2, uSea3, uBeamCol, uWaveCol, uMoonDir, uGlit, uCamPos;
uniform float uCamH, uFocal, uBelow, uBeam, uHalf, uShade, uRange, uBeamOn, uT, uLR, uLamp, uCoast;
uniform vec2 uShip;
varying vec3 vW; varying float vF; varying float vAmp;
vec2 dwh(vec2 p, float t) {
  vec2 g = 0.18 * 0.21 * cos(p.x * 0.21 + t * 1.3) * vec2(1.0, 0.0);
  g += 0.14 * cos(p.x * 0.05 + p.y * 0.17 - t * 1.1) * vec2(0.05, 0.17);
  g += 0.09 * cos((p.x + p.y) * 0.37 + t * 2.1) * vec2(0.37, 0.37);
  g += 0.05 * cos((p.x - p.y) * 0.61 - t * 2.7) * vec2(0.61, -0.61);
  return g;
}
vec2 ripple(vec2 p, float t) {
  return 0.022 * cos(dot(p, vec2(1.3, 0.9)) + t * 3.1) * vec2(1.3, 0.9) + 0.016 * cos(dot(p, vec2(-0.8, 1.7)) + t * 3.7) * vec2(-0.8, 1.7)
       + 0.01 * cos(dot(p, vec2(2.3, -1.1)) - t * 4.3) * vec2(2.3, -1.1) + 0.008 * cos(dot(p, vec2(-3.1, -2.2)) + t * 5.3) * vec2(-3.1, -2.2);
}
void main() {
  float gx = vW.x, gy = -vW.z;
  if (gy < uCoast) discard;                       // the land starts here; the sky canvas paints the ground behind
  // the same gradient the 2D sea has, from the horizon down to your feet
  float t = clamp(uCamH * uFocal / (max(vF, 0.01) * uBelow), 0.0, 1.0);
  vec3 col = t < 0.04 ? mix(uSea0, uSea1, t / 0.04) : t < 0.5 ? mix(uSea1, uSea2, (t - 0.04) / 0.46) : mix(uSea2, uSea3, (t - 0.5) / 0.5);
  float near = 1.0 - smoothstep(30.0, 900.0, vF);
  vec2 sl = dwh(vW.xz, uT) * vAmp + ripple(vW.xz, uT) * near;
  vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
  vec3 V = normalize(uCamPos - vW);
  // the beam: a hard-edged wedge of light across the water, with glints where the swell catches it
  float b = atan(gx, gy), r = length(vec2(gx, gy));
  float db = abs(mod(b - uBeam + 3.14159265, 6.2831853) - 3.14159265);
  float inb = uBeamOn * step(abs(b), uShade) * (1.0 - smoothstep(uHalf * 0.9, uHalf, db)) * step(r, uRange);
  float lit = inb * max(0.0, 1.0 - r / (uRange * 1.3));
  col += uBeamCol * 0.16 * inb;
  vec3 L = normalize(vec3(0.0, 54.0, 0.0) - vW);
  float sp = pow(max(dot(reflect(-L, N), V), 0.0), 48.0);
  col += vec3(1.0, 0.88, 0.62) * sp * lit * 1.4;
  // crests catching what light there is
  float crest = smoothstep(0.12, 0.38, vW.y);
  col += uWaveCol * crest * (0.025 + 0.2 * lit) * vAmp;
  // the moon's path
  float ms = pow(max(dot(reflect(-uMoonDir, N), V), 0.0), 220.0);
  col += uGlit * ms * 0.28;
  // your own lantern's pool on the water
  float ld = length(vec2(gx, gy) - uShip);
  col += vec3(1.0, 0.72, 0.38) * 0.09 * uLamp * pow(max(0.0, 1.0 - ld / uLR), 2.0);
  gl_FragColor = vec4(col, 1.0);
}`;
function buildSea() {
  // a polar grid centred on the camera: fine close by, coarse out to the horizon
  const SEG = 160, RINGS = 120, k = Math.log(3751) / RINGS, pos = [], idx = [];
  pos.push(0, 0, 0);
  for (let i = 1; i <= RINGS; i++) {
    const r = 4 * (Math.exp(i * k) - 1);
    for (let j = 0; j < SEG; j++) { const a = j / SEG * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  }
  const at = (i, j) => 1 + (i - 1) * SEG + (j % SEG);
  for (let j = 0; j < SEG; j++) idx.push(0, at(1, j + 1), at(1, j));
  for (let i = 1; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
    const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1);
    idx.push(a, b, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const u = {};
  for (const n of ['uSea0', 'uSea1', 'uSea2', 'uSea3', 'uBeamCol', 'uWaveCol', 'uMoonDir', 'uGlit', 'uCamPos']) u[n] = { value: new THREE.Vector3() };
  for (const n of ['uCamH', 'uFocal', 'uBelow', 'uBeam', 'uHalf', 'uShade', 'uRange', 'uBeamOn', 'uT', 'uLR', 'uLamp', 'uCoast']) u[n] = { value: 0 };
  u.uShip = { value: new THREE.Vector2() };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SEA_VS, fragmentShader: SEA_FS, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = -10;
  GL3D.sea = m; GL3D.scene.add(m);
}

// ---------- the beam: a long cone of light from the lantern room ----------
function buildBeam() {
  const geo = new THREE.ConeGeometry(1, 1, 40, 1, true);
  geo.translate(0, -0.5, 0); geo.rotateX(Math.PI / 2);   // apex at the lamp, opening along -z (straight ahead)
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 } },
    vertexShader: 'varying float vD; void main() { vD = -position.z; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK; varying float vD;
      void main() {
        float s = vD / 0.55;
        float a = s < 0.12 ? mix(0.16, 0.07, s / 0.12) : s < 0.5 ? mix(0.07, 0.025, (s - 0.12) / 0.38) : mix(0.025, 0.0, clamp((s - 0.5) / 0.5, 0.0, 1.0));
        vec3 c = mix(vec3(1.0, 0.88, 0.62), vec3(0.78, 0.8, 0.86), clamp(s * 1.6, 0.0, 1.0));
        gl_FragColor = vec4(c * a * 0.55 * uK, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  const far = SK.BEAM_RANGE, rad = far * Math.tan(SK.HALF_BEAM);
  m.scale.set(rad, rad * 0.4, far); m.position.set(0, 54, 0); m.renderOrder = 10; m.frustumCulled = false;
  GL3D.beam = m; GL3D.scene.add(m);
}

// ---------- the coast: rebuilt when the sea changes ----------
function lamb(c, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color: c, side: THREE.DoubleSide }, extra || {})); }
function quadsGeo(quads) {
  // quads: [[p0,p1,p2,p3], colour] with points in game coordinates
  const pos = [], col = [];
  for (const [q, c] of quads) {
    const P = q.map(p => [p[0], p[2], -p[1]]);
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...P[i]); col.push(c.r, c.g, c.b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
function boxAt(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, z + h / 2, -y); return m;
}
function roofAt(w, d, rise, x, y, z, mat) {
  // a pitched roof: a triangular prism along y
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rise); s.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat); m.position.set(x, z, -y - d / 2); return m;
}
function buildCoast() {
  const B = curBiome(), key = B.name + (B.sky3d ? ':sky' : '');
  if (GL3D.coastKey === key) return;
  GL3D.coastKey = key;
  if (GL3D.coast) { GL3D.scene.remove(GL3D.coast); GL3D.coast.traverse(glDispose); }
  const grp = GL3D.coast = new THREE.Group(); GL3D.wins = []; GL3D.surf = [];
  const ch = B.cliffH, td = B.topDepth, HB = SK.HARBOUR;
  const cliffC = B.cliff.map(c => glCol(c)[0]), band = cliffC.map(c => glOver('#' + c.getHexString(), B.cliffTop));
  const back = glOver(B.ground, B.cliffTop.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.5) + ')'));
  const quads = [];
  for (let i = 0; i < cliffs.length - 1; i++) {
    const a = cliffs[i], b = cliffs[i + 1], az = a.z * ch, bz = b.z * ch, k = i % 2;
    quads.push([[[a.x, a.y, -1], [a.x, a.y, az - td], [b.x, b.y, bz - td], [b.x, b.y, -1]], cliffC[k]]);
    quads.push([[[a.x, a.y, az - td], [a.x, a.y, az], [b.x, b.y, bz], [b.x, b.y, bz - td]], band[k]]);
    // the top of the cliff, running back inland
    quads.push([[[a.x, a.y, az], [b.x, b.y, bz], [b.x, b.y - 140, bz * 0.85], [a.x, a.y - 140, az * 0.85]], back]);
  }
  // the headland under the light: face, top and both flanks
  const h0 = glCol(B.head[0])[0], h1 = glCol(B.head[1])[0];
  quads.push([[[-45, 6, -1], [45, 6, -1], [40, 4, 22], [-40, 4, 22]], h0]);
  quads.push([[[-40, 4, 22], [40, 4, 22], [55, -60, 22], [-60, -60, 22]], h1]);
  quads.push([[[-45, 6, -1], [-40, 4, 22], [-60, -60, 22], [-62, -60, -1]], h0]);
  quads.push([[[45, 6, -1], [40, 4, 22], [55, -60, 22], [57, -60, -1]], h0]);
  grp.add(new THREE.Mesh(quadsGeo(quads), lamb(0xffffff, { vertexColors: true })));
  // surf at the foot of the headland
  const surfM = new THREE.MeshBasicMaterial({ color: glRGB(B.surf), transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
  const sg = quadsGeo([[[[-48, 8, 0.25], [48, 8, 0.25], [45, 6, 1.4], [-45, 6, 1.4]], new THREE.Color(1, 1, 1)]]);
  const surf = new THREE.Mesh(sg, surfM); grp.add(surf); GL3D.surf.push(surfM);
  if (!B.sky3d) {
    // stone piers with a lighter top course
    const side = lamb('#16130f'), top = lamb('#24201a');
    for (const sx of [-1, 1]) {
      const x0 = HB.x + sx * 20, x1 = HB.x + sx * 26, xm = (x0 + x1) / 2;
      const p = boxAt(6, 3.4, 48, xm, 22, -1, [side, side, top, side, side, side]);
      grp.add(p);
    }
    // cottages along the waterfront: walls, roofs and a lit window each
    const wall = lamb(B.wall), roof = lamb(B.roof);
    for (const t of town) {
      const w = 7 + (t.ph % 3), d = 5, hgt = t.z * 0.45 + 4;
      grp.add(boxAt(w, hgt + 1, d, t.x, t.y + d / 2, -1, wall));
      grp.add(roofAt(w + 1.2, d + 0.6, w * 0.45, t.x, t.y + d / 2, hgt, roof));
      const wm = new THREE.MeshBasicMaterial({ color: B.win, transparent: true, side: THREE.DoubleSide });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), wm);
      win.position.set(t.x + (t.ph % 2 - 0.5) * w * 0.4, hgt * 0.45, -(t.y + d + 0.06));
      grp.add(win); GL3D.wins.push({ m: wm, t, x: win.position.x, y: t.y + d + 0.06, z: hgt * 0.45 });
    }
  }
  // the keeper's cottage beside the tower, one window lit
  grp.add(boxAt(9, 4.5, 6, 12, -6, 22, lamb('#1b1d1c')));
  grp.add(roofAt(10.5, 6.6, 3.5, 12, -6, 26.5, lamb('#121413')));
  const kw = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.4), new THREE.MeshBasicMaterial({ color: 0xffc878, side: THREE.DoubleSide }));
  kw.position.set(10.2, 24.2, 2.95); grp.add(kw);
  // Skerry Light: a white tower with two red bands, a gallery, the glass lantern room and its cap
  const tower = new THREE.Group();
  const white = lamb('#8a877c'), red = lamb('#8a3226'), dark = lamb('#1c1b18');
  const R = z => 5.46 + (3 - 5.46) * (z - 22) / 30;   // the tower's radius at height z
  const seg = (z0, z1, mat, grow) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(R(z1) + grow, R(z0) + grow, z1 - z0, 28), mat); m.position.y = (z0 + z1) / 2; tower.add(m); };
  seg(22, 52, white, 0);
  for (const [f0, f1] of [[0.18, 0.34], [0.55, 0.71]]) seg(22 + 30 * f0, 22 + 30 * f1, red, 0.04);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd88a });
  for (const f of [0.45, 0.82]) { const z = 22 + 30 * f, w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), glow); w.position.set(0, z, R(z) + 0.05); tower.add(w); }
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 0.6, 28), dark); gal.position.y = 52.3; tower.add(gal);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(5, 0.08, 4, 32), dark); rail.rotation.x = Math.PI / 2; rail.position.y = 53.6; tower.add(rail);
  GL3D.glass = new THREE.MeshBasicMaterial({ color: 0xffe6aa });
  const room = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, 4.4, 16, 1, true), GL3D.glass); room.position.y = 54.8; tower.add(room);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 0.18), dark); bar.position.set(Math.cos(a) * 2.9, 54.8, Math.sin(a) * 2.9); tower.add(bar); }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3.45, 3.2, 20), lamb('#1a1714')); cap.position.y = 58.6; tower.add(cap);
  grp.add(tower);
  GL3D.scene.add(grp);
}

// ---------- the skerries, wrecks and timber ----------
function rockMesh(r, B) {
  const RK = B.rock, geo = new THREE.IcosahedronGeometry(1, RK.blocky ? 1 : 2);
  const P = geo.attributes.position, hgt = r.r * 0.85 * RK.h, col = [];
  const g0 = glCol(RK.g[0])[0], g1 = glCol(RK.g[1])[0], g2 = glCol(RK.g[2])[0], bandC = glOver(RK.g[2], RK.band);
  const sq = 0.7 + 0.3 * glHash(r.ph, 3);
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const n = Math.sin(x * 3.1 + r.ph) * Math.sin(z * 2.7 + r.ph * 2) * 0.5 + Math.sin(y * 4.3 + x * 2 + r.ph * 3) * 0.3 + Math.sin((x + z) * 6 + r.ph) * 0.12;
    const u = Math.max(0, Math.min(r.prof.length - 1, (x + 1) / 2 * (r.prof.length - 1)));
    const i0 = Math.floor(u), f = u - i0, pr = r.prof[i0] + (r.prof[Math.min(r.prof.length - 1, i0 + 1)] - r.prof[i0]) * f;
    const rad = 1 + 0.2 * n;
    let X = x * rad * r.r * 1.1, Z = z * rad * r.r * 1.1 * sq, Y = y > 0 ? y * hgt * (0.45 + 0.7 * pr) * (1 + 0.15 * n) : y * r.r * 0.3;
    if (RK.blocky) { const st = Math.max(1, hgt / 6); Y = Math.round(Y / st) * st; }
    P.setXYZ(i, X, Y, Z);
    const t = Math.max(0, Math.min(1, Y / (hgt || 1)));
    const c = t < 0.14 ? bandC : t < 0.5 ? g2.clone().lerp(g1, (t - 0.14) / 0.36) : g1.clone().lerp(g0, (t - 0.5) / 0.5);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, flatShading: true });
  if (RK.kind === 'nether' || RK.kind === 'basalt') { mat.emissive = new THREE.Color(RK.kind === 'nether' ? 0x3a0c04 : 0x1a0703); }
  const root = new THREE.Group(), body = new THREE.Mesh(geo, mat);
  root.add(body);
  const foamM = new THREE.MeshBasicMaterial({ color: glRGB(RK.foam), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.3, 28), foamM);
  foam.rotation.x = -Math.PI / 2; foam.position.y = 0.3; foam.scale.set(r.r * 1.1, r.r * 1.1 * sq, 1); root.add(foam);
  root.rotation.y = r.ph;
  return { root, mats: [mat], foam, foamM, base: r.r * 1.1 };
}
function wreckMesh(o) {
  const mat = new THREE.MeshLambertMaterial({ color: '#3e3128', transparent: true, side: THREE.DoubleSide }), dark = new THREE.MeshLambertMaterial({ color: '#261c15', transparent: true });
  const root = new THREE.Group(), L = o.r * 2, hh = L * 0.13;
  // a broken hull lying over on its side, half under
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.18, L * 0.12, L, 10, 1, true, 0, Math.PI), mat);
  hull.rotation.x = Math.PI / 2; hull.rotation.y = 0.5; hull.position.y = hh * 0.2;
  root.add(hull);
  for (let i = 1; i <= o.ribs; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.3, L * 0.02), hh * (1.2 + (i % 2) * 0.6), Math.max(0.3, L * 0.02)), dark);
    rib.position.set(L * 0.12, hh * 0.5, -L / 2 + L * i / (o.ribs + 1)); rib.rotation.z = 0.25; root.add(rib);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.012, L * 0.018, L * 0.45, 6), dark);
  mast.position.set(0, hh + L * 0.2, -L * 0.04); mast.rotation.z = -o.lean * 0.5; mast.rotation.x = 0.15; root.add(mast);
  const foamM = new THREE.MeshBasicMaterial({ color: 0xe1ebf8, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.1, 24), foamM);
  foam.rotation.x = -Math.PI / 2; foam.position.y = 0.3; foam.scale.set(L * 0.3, L * 0.62, 1); root.add(foam);
  root.rotation.y = -o.ang;
  return { root, mats: [mat, dark], foam, foamM, base: 0 };
}
function timberMesh(o) {
  const mat = new THREE.MeshLambertMaterial({ color: '#4a3a2b', transparent: true });
  const geo = new THREE.CylinderGeometry(0.38, 0.38, o.len, 6); geo.rotateX(Math.PI / 2);
  const root = new THREE.Group(), log = new THREE.Mesh(geo, mat); log.position.y = 0.15; root.add(log);
  root.rotation.y = -o.ang;
  return { root, mats: [mat], base: 0 };
}
function syncThings(list, make, B) {
  const F = GL3D.frame;
  for (const o of list) {
    let m = GL3D.objs.get(o);
    if (!m || m.biome !== B.name) {
      if (m) dropThing(o, m);
      m = make(o, B); m.biome = B.name; GL3D.objs.set(o, m); GL3D.scene.add(m.root);
    }
    m.seen = F;
    let vis = o.gone ? 0 : Math.max(visibility(o.x, o.y), afterglow(o));
    m.root.visible = vis > 0.02;
    if (!m.root.visible) continue;
    m.root.position.set(o.x, 0, -o.y);
    for (const mat of m.mats) { mat.opacity = vis; mat.transparent = vis < 0.999; mat.depthWrite = vis > 0.5; }
    if (m.foam) {
      const sw = Math.sin(g.t * 1.7 + (o.ph || 0));
      m.foamM.opacity = 0.2 * vis;
      if (m.base) m.foam.scale.x = m.base * (1 + sw * 0.05);
    }
  }
}
function dropThing(o, m) {
  GL3D.scene.remove(m.root);
  m.root.traverse(glDispose);
  GL3D.objs.delete(o);
}

// ---------- each frame ----------
function gl3dRender(roll, sx, sy, beamOn) {
  const B = curBiome(), cam3 = GL3D.camera, u = GL3D.sea.material.uniforms;
  GL3D.frame++;
  buildCoast();
  // the camera, set up to project exactly as the 2D one does (the horizon at hy, the same focal length)
  cam3.fov = 2 * Math.atan((H / 2) / focal) * 180 / Math.PI;
  cam3.aspect = W / H;
  cam3.near = 0.5; cam3.far = 30000;
  cam3.setViewOffset(W, H, -sx, H / 2 - hy - sy, W, H);
  cam3.updateProjectionMatrix();
  cam3.position.set(camX, camH, -camY);
  cam3.rotation.set(0, -yaw, roll, 'YXZ');
  // the sea
  GL3D.sea.position.set(Math.round(camX / 4) * 4, 0, -Math.round(camY / 4) * 4);
  B.sea.forEach((c, i) => { const q = glCol(c)[0]; u['uSea' + i].value.set(q.r, q.g, q.b); });
  const bc = glRGB(B.beam), wc = glRGB(B.waves), gc = glRGB(B.glitter);
  u.uBeamCol.value.set(bc.r, bc.g, bc.b); u.uWaveCol.value.set(wc.r, wc.g, wc.b); u.uGlit.value.set(gc.r, gc.g, gc.b);
  const me = MOON.e, mb = MOON.b;
  u.uMoonDir.value.set(Math.sin(mb) * Math.cos(me), Math.sin(me), -Math.cos(mb) * Math.cos(me)).normalize();
  u.uCamPos.value.set(camX, camH, -camY);
  u.uCamH.value = camH; u.uFocal.value = focal; u.uBelow.value = Math.max(1, H - hy);
  u.uBeam.value = g.beam; u.uHalf.value = SK.HALF_BEAM; u.uShade.value = SK.SHADE; u.uRange.value = SK.BEAM_RANGE; u.uBeamOn.value = beamOn ? 1 : 0;
  u.uT.value = reduceMotion ? 0 : g.t; u.uShip.value.set(ship.x, ship.y);
  const LR = SK.LANTERN * (g.mods ? g.mods.lantern : 1) * ((BOAT_BY_ID[ship.boat] || {}).lamp || 1);
  u.uLR.value = LR; u.uLamp.value = 1; u.uCoast.value = 0;
  // the lights
  GL3D.moon.position.set(Math.sin(mb) * 1000, 400, -Math.cos(mb) * 1000); GL3D.moon.target.position.set(0, 0, 0);
  const far = SK.BEAM_RANGE;
  GL3D.spot.visible = beamOn;
  GL3D.spot.target.position.set(Math.sin(g.beam) * far, 0, -Math.cos(g.beam) * far);
  GL3D.spot.color.set(glOver('#ffe2a8', `rgba(${B.beam},0.35)`));
  GL3D.lantern.position.set(ship.x, 4, -ship.y); GL3D.lantern.distance = LR * 1.2;
  GL3D.lantern.intensity = 0.8 + (reduceMotion ? 0 : 0.12 * Math.sin(g.t * 9) * Math.sin(g.t * 2.3));
  GL3D.beam.visible = beamOn; GL3D.beam.rotation.y = -g.beam;
  // the lantern room shines brighter as the beam swings round to face you
  const facing = 1 - Math.min(1, Math.abs(angDiff(g.beam, bearingOf(camX, camY))) / 0.5);
  const shown = Math.abs(bearingOf(camX, camY)) < SK.SHADE ? facing : 0;
  GL3D.glass.color.setRGB(1, 0.86 + 0.1 * shown, 0.6 + 0.3 * shown);
  for (const w of GL3D.wins) w.m.opacity = 0.55 + 0.25 * Math.sin(g.t * 0.7 + w.t.ph);
  for (const s of GL3D.surf) s.opacity = 0.12 + 0.06 * Math.sin(g.t * 1.4);
  // the things on the water
  syncThings(g.rocks, rockMesh, B);
  syncThings(g.wrecks, wreckMesh, B);
  syncThings(g.timber, timberMesh, B);
  for (const [o, m] of GL3D.objs) if (m.seen !== GL3D.frame) dropThing(o, m);
  GL3D.r.render(GL3D.scene, cam3);
  return shown;
}

// the sky, the ground behind the cliffs and the far landscape, painted on the canvas behind the 3D one
function gl3dBackdrop(roll, sx, sy) {
  const B = curBiome(), main = ctx;
  ctx = bgx;
  try {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(cx, hy); ctx.rotate(roll); ctx.translate(-cx, -hy); ctx.translate(sx, sy);
    drawSky();
    fillPoly([[-15000, 0, 1.5], [15000, 0, 1.5], [15000, -15000, 1.5], [-15000, -15000, 1.5]], B.ground);
    if (B.land !== 'lavafalls') drawLandFar(B);
    ctx.restore();
  } finally { ctx = main; }
}
// glows that sit on top of the 3D world: the lantern room, the cottage windows
function gl3dGlows(shown) {
  const t = cam(0, 0, 54);
  if (t.f > SK.NEAR) { const q = proj(t); lamp(q.x, q.y, '#ffd88a', Math.max(2.5, 2 * Math.sqrt(q.s)) * (1 + shown * 6)); }
  const B = curBiome();
  for (const w of GL3D.wins) {
    const c = cam(w.x, w.y, w.z); if (c.f < SK.NEAR + 2) continue;
    const q = proj(c), ws = Math.max(1.4, q.s * 1.3);
    if (ws > 3) { ctx.globalAlpha = 0.25 * w.m.opacity; lamp(q.x, q.y, B.win, ws * 0.9); ctx.globalAlpha = 1; }
  }
}
