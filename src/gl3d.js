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
  const want = gl3dWanted() && !!g;
  return want && (GL3D.ok || (!GL3D.tried && gl3dInit()));
}
function gl3dShow(on) {
  const k = on + ':' + !!(g && g.backrooms);
  if (GL3D.shownKey === k) return;
  GL3D.shown = on; GL3D.shownKey = k;
  if (bgCv) bgCv.style.visibility = on && !(g && g.backrooms) ? 'visible' : 'hidden';
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
    // light is added to the colour only; the alpha is left alone, so over the (transparent) sky the
    // beam brightens the painted sky behind instead of punching a dark hole in it
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
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
  buildLand(B, grp);
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
  // the rock's outline points (above the water), for hiding painted things that are behind it
  const seen = new Set(), pts = [];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = x.toFixed(2) + ',' + y.toFixed(2) + ',' + z.toFixed(2);
    if (y < -0.05 || seen.has(k)) continue;
    seen.add(k); pts.push(x, Math.max(0, y), z);
  }
  return { root, mats: [mat], foam, foamM, base: r.r * 1.1, pts };
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
  const pts = [];
  for (const x of [-L * 0.2, L * 0.2]) for (const y of [0, hh * 1.6]) for (const z of [-L / 2, L / 2]) pts.push(x, y, z);
  return { root, mats: [mat, dark], foam, foamM, base: 0, pts };
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
    let vis = o.gone ? 0 : Math.max(visibility(o.x, o.y), afterglow(o), g.minVis || 0);
    m.root.visible = vis > 0.02;
    if (!m.root.visible) continue;
    m.root.position.set(o.x, 0, -o.y); m.vis = vis;
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
  syncIsland(B);
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
  GL3D.lantern.position.set(ship.x, (g.sky ? ship.z || 0 : 0) + 4, -ship.y); GL3D.lantern.distance = LR * 1.2;
  GL3D.lantern.intensity = 0.8 + (reduceMotion ? 0 : 0.12 * Math.sin(g.t * 9) * Math.sin(g.t * 2.3));
  GL3D.beam.visible = beamOn; GL3D.beam.rotation.y = -g.beam;
  // the lantern room shines brighter as the beam swings round to face you
  const facing = 1 - Math.min(1, Math.abs(angDiff(g.beam, bearingOf(camX, camY))) / 0.5);
  const shown = Math.abs(bearingOf(camX, camY)) < SK.SHADE ? facing : 0;
  GL3D.glass.color.setRGB(1, 0.86 + 0.1 * shown, 0.6 + 0.3 * shown);
  for (const w of GL3D.wins) w.m.opacity = 0.55 + 0.25 * Math.sin(g.t * 0.7 + w.t.ph);
  for (const s of GL3D.surf) s.opacity = 0.12 + 0.06 * Math.sin(g.t * 1.4);
  // the things on the water
  if (g.sky) syncClouds(); else { if (GL3D.clouds) GL3D.clouds.visible = false; syncThings(g.rocks, rockMesh, B); }
  syncThings(g.wrecks, wreckMesh, B);
  syncThings(g.timber, timberMesh, B);
  findOccluders();
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

// ---------- painted things behind 3D rocks ----------
// Creatures, ships and crewmates are still painted on the canvas over the 3D view. So that a rock
// hides whatever is behind it, each solid rock and wreck's outline is worked out on screen, and
// anything painted further away than it is clipped out of that outline.
GL3D.occ = [];
function hull(p) {
  p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function findOccluders() {
  const out = GL3D.occ = [];
  // in the sky, a thick enough cloud hides what's behind it: an ellipse a little inside its edge
  if (g.sky) for (const o of g.rocks) {
    if (!(o.glVis >= 0.6)) continue;
    const c = cam(o.x, o.y, o.z || 0); if (c.f < SK.NEAR + 2) continue;
    const q = proj(c), R = o.r * 1.3 * q.s * 0.55, Rz = o.rz * 1.1 * q.s * 0.5;
    if (q.x + R < -50 || q.x - R > W + 50 || Math.min(R, Rz) > Math.max(W, H)) continue;
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([q.x + Math.cos(a) * R, q.y - Rz * 0.3 + Math.sin(a) * Rz]); }
    out.push({ f: c.f, pts, x0: q.x - R, x1: q.x + R, y0: q.y - Rz, y1: q.y + Rz });
  }
  for (const [o, m] of GL3D.objs) {
    if (!m.pts || !m.root.visible || !(m.vis >= 0.5)) continue;
    const c0 = cam(o.x, o.y, 0); if (c0.f < SK.NEAR + 2) continue;
    const th = m.root.rotation.y, cs = Math.cos(th), sn = Math.sin(th), P = m.pts, sc = [];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ok = true;
    for (let i = 0; i < P.length; i += 3) {
      const lx = P[i], ly = P[i + 1], lz = P[i + 2];
      const wx = o.x + lx * cs + lz * sn, wz = -o.y - lx * sn + lz * cs;
      const c = cam(wx, -wz, ly); if (c.f < SK.NEAR) { ok = false; break; }
      const q = proj(c); sc.push([q.x, q.y]);
      if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
    }
    if (!ok || x1 < -50 || x0 > W + 50 || x1 - x0 < 2) continue;
    // a little inside the true outline, so foam and edges don't cut things off early
    const h = hull(sc), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    out.push({ f: c0.f - (o.r || 0) * 0.3, pts: h.map(q => [mx + (q[0] - mx) * 0.96, my + (q[1] - my) * 0.97]), x0, x1, y0, y1 });
  }
  out.sort((a, b) => a.f - b.f);
}
// clip the canvas so that a thing at depth f is hidden wherever a nearer rock stands; false if nothing is in front
function gl3dClip(f) {
  const occ = GL3D.occ; if (!occ.length || occ[0].f >= f) return false;
  // one cut per rock (clips stack), so rocks that overlap on screen still both hide what's behind them
  for (const o of occ) {
    if (o.f >= f) break;
    const p = o.pts;
    ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3);
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath(); ctx.clip('evenodd');
  }
  return true;
}

// ---------- the landscape behind the coast, in 3D ----------
// Each sea's landmarks (mountains, volcanoes, spires, lavafalls, stairs and doors, temples, the
// chapel, palms, dead trees, cypresses, street lamps) built as one solid mesh plus one glowing one.
// Their lights (torches, craters, lamps, lit doors) are glows painted over the top.
function LandBuilder() { this.q = []; this.e = []; }
LandBuilder.prototype = {
  quad(a, b, c, d, col, glow) { (glow ? this.e : this.q).push([[a, b, c, d], col]); },
  tri(a, b, c, col, glow) { this.quad(a, b, c, c, col, glow); },
  box(x0, x1, y0, y1, z0, z1, col, top) {
    const t = top || col;
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], col);   // seaward face
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
    this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], col);
    this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], col);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], t);
  },
  // a flat outline [[x, z], ...] (convex) given a depth along y
  slab(pts, y, d, col, side) {
    const n = pts.length, f = pts.map(p => [p[0], y + d / 2, p[1]]), b = pts.map(p => [p[0], y - d / 2, p[1]]);
    for (let i = 1; i < n - 1; i++) { this.tri(f[0], f[i], f[i + 1], col); this.tri(b[0], b[i], b[i + 1], side || col); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(f[i], f[j], b[j], b[i], side || col); }
  },
  // a cone or frustum standing at (x, y, z0), in bands [[t0, t1, colour]] up its height; lean tips it in x
  cone(x, y, z0, r0, r1, h, segs, bands, lean, sq) {
    lean = lean || 0; sq = sq || 1;
    const ring = t => { const r = r0 + (r1 - r0) * t, out = []; for (let i = 0; i < segs; i++) { const a = i / segs * Math.PI * 2 + 0.3; out.push([x + Math.cos(a) * r + lean * h * t, y + Math.sin(a) * r * sq, z0 + h * t]); } return out; };
    for (const [t0, t1, col] of bands) {
      const A = ring(t0), C = ring(t1);
      for (let i = 0; i < segs; i++) { const j = (i + 1) % segs; if (t1 === 1 && r1 === 0) this.tri(A[i], A[j], C[i], col); else this.quad(A[i], A[j], C[j], C[i], col); }
    }
  },
  meshes(grp) {
    if (this.q.length) grp.add(new THREE.Mesh(quadsGeo(this.q), lamb(0xffffff, { vertexColors: true, flatShading: true })));
    if (this.e.length) { const m = new THREE.Mesh(quadsGeo(this.e), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); grp.add(m); GL3D.landGlowMesh = m; }
  },
};
const C3 = s => glCol(s)[0];
// an rgba colour laid over the sky, for things that fade into the haze
const overSky = (B, s) => glOver(B.sky[2], s);
function buildLand(B, grp) {
  const L = new LandBuilder(), glows = GL3D.glows = [];
  GL3D.landGlowMesh = null; GL3D.lavaRivers = null;
  const onCliff = x => { const cl = cliffAt(x); return [cl.y - 1, cl.z * B.cliffH]; };
  if (B.land === 'peaks') {
    for (const p of LAND.peaks) {
      const body = C3(p.far ? '#13232c' : '#0e1b22'), snow = glOver(p.far ? '#13232c' : '#0e1b22', p.far ? 'rgba(205,228,240,0.55)' : 'rgba(225,240,250,0.75)');
      L.cone(p.x, p.y, 0, p.w, 0, p.h, 6, [[0, 0.64, body], [0.64, 1, snow]], 0, 0.45);
    }
  } else if (B.land === 'volcano') {
    const rivers = [];
    for (const v of LAND.volcano) {
      const tw = v.w * v.top;
      L.cone(v.x, v.y, 0, v.w, tw, v.h, 16, [[0, 1, C3('#150a09')]], 0, 0.6);
      L.cone(v.x, v.y, v.h - 2, tw * 0.9, tw * 0.5, 3, 16, [[0, 1, new THREE.Color(1, 0.42, 0.16)]], 0, 0.6);
      glows.push({ x: v.x, y: v.y, z: v.h, col: '#ff6a28', r: tw * 0.5, add: 1, crater: v });
      // rivers of lava down the seaward flank
      for (let i = 0; i < 4; i++) {
        const sx = (i - 1.5) * tw * 0.6, pts = [];
        for (let s2 = 0; s2 <= 8; s2++) {
          const f = s2 / 8, x = v.x + sx + (sx * 3 + Math.sin(i * 3 + f * 5) * v.w * 0.05) * f, z = v.h * (1 - f * 0.92);
          const r = tw + (v.w - tw) * f * 0.92;   // the flank's distance from the axis at this height
          const dx = x - v.x, yy = v.y + Math.sqrt(Math.max(0, r * r - dx * dx)) * 0.6 + 1.5;
          pts.push([x, yy, z]);
        }
        const wdt = Math.max(3, v.w * 0.008);
        for (let k = 0; k < pts.length - 1; k++) {
          const a = pts[k], b = pts[k + 1];
          L.quad([a[0] - wdt, a[1], a[2]], [a[0] + wdt, a[1], a[2]], [b[0] + wdt, b[1], b[2]], [b[0] - wdt, b[1], b[2]], new THREE.Color(1, (90 + i * 20) / 255, 30 / 255), true);
        }
      }
    }
  } else if (B.land === 'spires') {
    for (const sp of LAND.spires) {
      let y = sp.y, z0 = 0;
      if (sp.near) [y, z0] = onCliff(sp.x);
      L.cone(sp.x, y, z0, sp.w, 0, sp.h, 5, [[0, 0.7, C3(sp.near ? '#46288a' : '#2e1a5c')], [0.7, 1, C3(sp.hue ? '#3e5aa8' : '#6a2c9a')]], sp.lean, 0.7);
      glows.push({ x: sp.x + sp.lean * sp.h, y, z: z0 + sp.h, col: sp.hue ? '#7ae6ff' : '#ff7ad8', r: sp.near ? 1.6 : 4, add: 1, ph: sp.x });
    }
  } else if (B.land === 'lavafalls') {
    for (const f of LAND.lavafalls) {
      L.cone(f.x, f.y, 0, f.w * 0.5, f.w * 0.5, 1400, 6, [[0, 1, new THREE.Color(1, 0.72, 0.3)]], 0, 1);
      glows.push({ x: f.x, y: f.y, z: 2, col: '#ff7a20', r: f.w * 0.9, add: 1, fall: 1 });
    }
    // the lava columns glow: move them into the glowing mesh
    L.e.push(...L.q.splice(0));
  } else if (B.land === 'stairs') {
    for (const st of LAND.stairs) {
      const sgn = Math.sign(st.run) || 1, half = st.w / 2, dx = Math.abs(st.run) * 0.5;
      for (let i = 0; i < st.steps; i++) {
        const k = i / st.steps, c = 60 + i * 2;
        const col = overSky(B, `rgba(${c},${c - 6},${c + 12},${Math.max(0.12, 0.72 - k * 0.6)})`);
        const xa = st.x + sgn * (i * dx - half), xb = st.x + sgn * (i * dx + half);
        L.box(Math.min(xa, xb), Math.max(xa, xb), st.y - 12, st.y + 12, i * st.rise, (i + 1) * st.rise, col, glOver('#' + col.getHexString(), 'rgba(255,225,210,0.25)'));
      }
    }
    for (const d of LAND.doors) {
      const h = d.w * 2.1, t = d.w * 0.14, fr = C3('#3e3848');
      L.box(d.x - d.w / 2 - t, d.x - d.w / 2, d.y - 2, d.y + 2, 0, h + t, fr);
      L.box(d.x + d.w / 2, d.x + d.w / 2 + t, d.y - 2, d.y + 2, 0, h + t, fr);
      L.box(d.x - d.w / 2, d.x + d.w / 2, d.y - 2, d.y + 2, h, h + t, fr);
      L.quad([d.x - d.w / 2, d.y + 0.3, 0], [d.x + d.w / 2, d.y + 0.3, 0], [d.x + d.w / 2, d.y + 0.3, h], [d.x - d.w / 2, d.y + 0.3, h], d.lit ? new THREE.Color(1, 0.84, 0.63) : C3('#141019'), d.lit);
      if (d.lit) glows.push({ x: d.x, y: d.y + 1, z: h * 0.5, col: '#ffd6a0', r: d.w * 0.35, add: 1 });
    }
    for (const l of LAND.lamps) {
      const [y, z] = onCliff(l.x);
      L.box(l.x - 0.25, l.x + 0.25, y - 0.25, y + 0.25, z, z + 7, C3('#1c1822'));
      glows.push({ x: l.x, y, z: z + 7, col: '#ffd6a0', r: 1.2, add: 1 });
    }
  } else if (B.land === 'temples') {
    const hillC = C3('#0f1210');
    for (const h of LAND.hills) L.slab([[h.x - h.w, 0], [h.x - h.w * 0.3, h.h], [h.x + h.w * 0.35, h.h * 0.9], [h.x + h.w, 0]], h.y, h.w * 0.8, hillC);
    const M = C3('#4c473e'), Lt = C3('#6a6457'), D = C3('#2c2924');
    for (const t of LAND.temples) {
      const hz = t.hz || (t.hz = t.y < -400 ? 140 : 90), { x, y, w, h } = t, dep = w * 0.45;
      L.slab([[x - w * 1.9, 0], [x - w * 0.75, hz], [x + w * 0.75, hz], [x + w * 1.9, 0]], y, w * 1.2, hillC);
      L.box(x - w / 2 - 4, x + w / 2 + 4, y - dep / 2 - 4, y + dep / 2 + 4, hz, hz + 3, D);
      L.box(x - w / 2, x + w / 2, y - dep / 2, y + dep / 2, hz + 3, hz + 5, M);
      const cw = w / (t.cols * 2 - 1);
      for (const yy of [y + dep / 2 - cw, y - dep / 2 + cw]) for (let i = 0; i < t.cols; i++) {
        const cx_ = x - w / 2 + cw * (i * 2) + cw / 2, chh = t.ruin && (i % 3 === 1) ? h * 0.45 : h;
        L.cone(cx_, yy, hz + 5, cw * 0.5, cw * 0.42, chh, 6, [[0, 1, i % 2 ? M : Lt]]);
      }
      if (!t.ruin) {
        L.box(x - w / 2 - 2, x + w / 2 + 2, y - dep / 2 - 1, y + dep / 2 + 1, hz + 5 + h, hz + 9 + h, Lt);
        L.slab([[x - w / 2 - 2, hz + 9 + h], [x + w / 2 + 2, hz + 9 + h], [x, hz + 9 + h + w * 0.16]], y, dep + 2, M);
      } else L.box(x - w / 2 - 2, x - w * 0.05, y - dep / 2 - 1, y + dep / 2 + 1, hz + 5 + h, hz + 8 + h, Lt);
      for (const sx of [-0.35, 0.35]) glows.push({ x: x + sx * w, y: y + dep / 2 + 1, z: hz + 9, col: '#ffb050', r: 1.6, add: 1, ph: sx * 9, torch: 1 });
    }
    for (const c of LAND.cypress) { const [y, z] = onCliff(c.x); L.cone(c.x, y, z, 1.6, 0, c.h, 6, [[0, 1, C3('#070a08')]]); }
  } else if (B.land === 'graves') {
    const c = LAND.church, wall = C3('#0b0e0c'), roof = C3('#0a0d0b'), tw = C3('#0c0f0d');
    L.box(c.x - 30, c.x + 10, c.y - 12, c.y + 12, 0, 26, wall);
    L.box(c.x + 10, c.x + 30, c.y - 12, c.y + 12, 0, 18, wall);   // the fallen-in end
    L.slab([[c.x - 32, 26], [c.x + 10, 26], [c.x - 8, 40]], c.y, 26, roof);
    L.box(c.x + 18, c.x + 34, c.y - 8, c.y + 8, 0, 55, tw);
    L.slab([[c.x + 18, 55], [c.x + 34, 55], [c.x + 34, 58], [c.x + 29, 63], [c.x + 24, 55]], c.y, 16, tw);
    for (const wx of [-18, -4, 26]) {
      const z = wx > 20 ? 44 : 14, yy = c.y + (wx > 20 ? 8.2 : 12.2);
      L.quad([c.x + wx - 2, yy, z - 3], [c.x + wx + 2, yy, z - 3], [c.x + wx + 2, yy, z + 4], [c.x + wx - 2, yy, z + 4], new THREE.Color(0.63, 0.86, 0.55), true);
    }
    // dead trees along the cliff tops
    const bark = C3('#080a09');
    for (const t of LAND.graves) {
      const [y, z] = onCliff(t.x);
      L.cone(t.x, y, z, 0.55, 0.25, t.h, 4, [[0, 1, bark]]);
      for (let i = 0; i < t.br; i++) {
        const f = 0.45 + i * 0.18, d = i % 2 ? 1 : -1, len = 5 + i, bz = z + t.h * f;
        L.quad([t.x, y - 0.2, bz], [t.x, y + 0.2, bz], [t.x + d * len, y + 0.2, bz + len * 0.6], [t.x + d * len, y - 0.2, bz + len * 0.6], bark);
      }
    }
  } else if (B.land === 'palms') {
    const trunk = C3('#0c0f0a');
    for (const p of LAND.palms) {
      const [y, z] = onCliff(p.x), tx = p.x + p.lean * p.h, tz = z + p.h;
      L.cone(p.x, y, z, 0.5, 0.35, p.h, 4, [[0, 1, trunk]], p.lean);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + p.ph, len = 5 + (i % 2), ex = tx + Math.cos(a) * len, ey = y + Math.sin(a) * len;
        const mx = tx + Math.cos(a) * len * 0.5, my = y + Math.sin(a) * len * 0.5;
        L.quad([tx, y, tz], [mx - Math.sin(a) * 0.9, my + Math.cos(a) * 0.9, tz + 0.8], [ex, ey, tz - 2.5], [mx + Math.sin(a) * 0.9, my - Math.cos(a) * 0.9, tz + 0.8], trunk);
      }
    }
  }
  L.meshes(grp);
}
// the land's lights, painted over the 3D view
function gl3dLandGlows() {
  const G = GL3D.glows; if (!G || !G.length) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const o of G) {
    const c = cam(o.x, o.y, o.z); if (c.f < SK.NEAR + 2) continue;
    const q = proj(c); if (q.x < -200 || q.x > W + 200) continue;
    let r = Math.max(1.5, o.r * q.s);
    if (o.ph != null) r *= 0.8 + 0.2 * Math.sin(g.t * (o.torch ? 7 : 2) + o.ph);
    if (o.fall) { const fade = Math.max(0.25, 1 - c.f / 3600); ctx.globalAlpha = fade; r = Math.max(2, o.r * q.s * 0.9); }
    if (o.crater) r = Math.max(4, o.r * q.s);
    lamp(q.x, q.y, o.col, r);
    ctx.globalAlpha = 1;
    if (o.crater && !reduceMotion) {
      // a column of lit smoke over the crater
      const v = o.crater, tw = v.w * v.top, n = v.h > 400 ? 5 : 3;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < n; i++) {
        const k = (g.t * 0.05 + i / n) % 1, s = cam(v.x + k * v.w * 0.5 + Math.sin(i * 2) * tw * 0.4, v.y, v.h + k * v.h * 0.9); if (s.f < SK.NEAR) continue;
        const p = proj(s); ctx.globalAlpha = 0.55 * (1 - k); lamp(p.x, p.y, '#4a2420', (tw * 0.6 + k * v.w * 0.35) * p.s / 3); ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'lighter';
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- the Backrooms, in 3D ----------
// Yellow walls with their faint stripes and damp skirting, the flooded carpet, the ceiling and its
// humming tubes. Lit the way the painted rooms are: the tubes near you (they fail together when
// the lights go out), your lantern, and a yellow haze that swallows everything past a few rooms.
function wallpaper() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const q = c.getContext('2d');
  q.fillStyle = '#fff'; q.fillRect(0, 0, 64, 128);
  q.fillStyle = 'rgba(0,0,0,0.28)'; q.fillRect(0, 0, 3, 128);   // a stripe every 8 m
  for (let i = 0; i < 40; i++) { q.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.04})`; q.fillRect(Math.random() * 64, Math.random() * 110, 1 + Math.random() * 3, 2 + Math.random() * 10); }
  const sk = Math.round(128 * 1.1 / SK.BACKROOMS_CEIL);
  q.fillStyle = 'rgba(30,24,8,0.82)'; q.fillRect(0, 128 - sk, 64, sk);   // the damp line where the water meets it
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function cutMaterial(mat) {
  // third person: walls between the camera and your ship are cut away, as in the painted rooms
  mat.userData.cut = { value: 0 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uCut = mat.userData.cut;
    sh.vertexShader = 'varying float vCutZ;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vCutZ = -mvPosition.z;');
    sh.fragmentShader = 'uniform float uCut; varying float vCutZ;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (vCutZ < uCut) discard;');
  };
  return mat;
}
function buildRooms() {
  const R = g.rooms;
  if (GL3D.roomsFor === R) return;
  GL3D.roomsFor = R;
  if (GL3D.rs) GL3D.rs.traverse(glDispose);
  const { X0, Y0, C, N, east, north, lights } = R, Z = SK.BACKROOMS_CEIL, id = (i, j) => j * N + i;
  const scene = GL3D.rs = new THREE.Scene();
  scene.background = new THREE.Color(ROOM_FOG);
  scene.fog = new THREE.Fog(ROOM_FOG, 0, 427);
  GL3D.ramb = new THREE.AmbientLight(0xffffff, 0.25); scene.add(GL3D.ramb);
  GL3D.rlight = new THREE.PointLight(0xfff4c8, 0.75, 300, 1); scene.add(GL3D.rlight);
  GL3D.rlant = new THREE.PointLight(0xffb060, 0.6, SK.LANTERN, 1); scene.add(GL3D.rlant);
  // walls: one quad on each cell edge that's closed, with the paper running along it in metres
  const pos = { x: [], y: [] }, uv = { x: [], y: [] };
  const wall = (x1, y1, x2, y2) => {
    const k = Math.abs(x2 - x1) > Math.abs(y2 - y1) ? 'x' : 'y', len = Math.hypot(x2 - x1, y2 - y1), u0 = (k === 'x' ? x1 : y1) / 8, u1 = u0 + len / 8;
    const P = [[x1, Z * 0, -y1], [x2, 0, -y2], [x2, Z, -y2], [x1, Z, -y1]], U = [[u0, 0], [u1, 0], [u1, 1], [u0, 1]];
    for (const i of [0, 1, 2, 0, 2, 3]) { pos[k].push(...P[i]); uv[k].push(...U[i]); }
  };
  for (let j = 0; j < N; j++) {
    wall(X0, Y0 + j * C, X0, Y0 + (j + 1) * C);
    wall(X0 + j * C, Y0, X0 + (j + 1) * C, Y0);
    for (let i = 0; i < N; i++) {
      const x = X0 + i * C, y = Y0 + j * C;
      if (i === N - 1 || east[id(i, j)]) wall(x + C, y, x + C, y + C);
      if (j === N - 1 || north[id(i, j)]) wall(x, y + C, x + C, y + C);
    }
  }
  const paper = wallpaper(), mats = GL3D.roomMats = [];
  for (const [k, col] of [['x', '#d9c25a'], ['y', '#c2aa45']]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos[k], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv[k], 2));
    geo.computeVertexNormals();
    const mat = cutMaterial(new THREE.MeshLambertMaterial({ color: col, map: paper, side: THREE.DoubleSide }));
    mats.push(mat); scene.add(new THREE.Mesh(geo, mat));
  }
  // the flooded carpet and the ceiling
  const S = N * C + 400, mid = [X0 + N * C / 2, Y0 + N * C / 2];
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshPhongMaterial({ color: '#4a4119', specular: 0x6a6040, shininess: 40 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(mid[0], 0, -mid[1]); scene.add(floor);
  GL3D.ceilMat = new THREE.MeshLambertMaterial({ color: '#8a7c3e', emissive: '#8a7c3e', side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(S, S), GL3D.ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(mid[0], Z, -mid[1]); scene.add(ceil);
  // the tubes: four panels to a room, their brightness set every frame
  const tp = [], tc = [];
  for (const lt of lights) for (const [ox, oy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    const x0 = lt.x + ox - 3, x1 = lt.x + ox + 3, y0 = lt.y + oy - 1, y1 = lt.y + oy + 1, z = Z - 0.05;
    const P = [[x0, z, -y0], [x1, z, -y0], [x1, z, -y1], [x0, z, -y1]];
    for (const i of [0, 1, 2, 0, 2, 3]) { tp.push(...P[i]); tc.push(0, 0, 0); }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
  const tubes = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  tubes.frustumCulled = false; scene.add(tubes); GL3D.tubes = tg;
}
function gl3dRooms(roll, sx, sy) {
  buildRooms();
  const cam3 = GL3D.camera, L = roomLevel();
  cam3.fov = 2 * Math.atan((H / 2) / focal) * 180 / Math.PI; cam3.aspect = W / H; cam3.near = 0.5; cam3.far = 2000;
  cam3.setViewOffset(W, H, -sx, H / 2 - hy - sy, W, H); cam3.updateProjectionMatrix();
  cam3.position.set(camX, camH, -camY); cam3.rotation.set(0, -yaw, roll, 'YXZ');
  GL3D.rlight.position.set(ship.x, 6, -ship.y); GL3D.rlight.intensity = 0.75 * L;
  GL3D.rlant.position.set(ship.x, 4, -ship.y);
  GL3D.rlant.distance = SK.LANTERN * (g.mods ? g.mods.lantern : 1) * ((BOAT_BY_ID[ship.boat] || {}).lamp || 1);
  GL3D.ceilMat.emissiveIntensity = 0.45 * L;
  const cut = VIEW.third ? CHASE.cut || 0 : 0;
  for (const m of GL3D.roomMats) m.userData.cut.value = cut;
  // the tubes
  const col = GL3D.tubes.attributes.color, lights = g.rooms.lights;
  for (let n = 0; n < lights.length; n++) {
    const lt = lights[n], d = Math.hypot(lt.x - ship.x, lt.y - ship.y);
    let on = d > 330 ? 0 : L * (1 - d / 330);
    if (lt.bad) on *= Math.sin(g.t * 23 + lt.ph) > 0.2 ? 1 : 0.1;
    const r = on, gg = on * 0.98, b = on * 0.84;
    for (let k = n * 24; k < n * 24 + 24; k++) col.setXYZ(k, r, gg, b);
  }
  col.needsUpdate = true;
  GL3D.r.render(GL3D.rs, cam3);
}

// ---------- the Open Sky's clouds, in 3D ----------
// Every puff of every cloud is a soft disc that always faces you, all in one draw: the dark bulk
// first, then the pale tops where the light catches them. Clouds are sorted far to near each frame.
const CLOUD_VS = `
attribute vec3 aCenter; attribute vec2 aCorner; attribute float aSize; attribute vec3 aCol; attribute float aK; attribute float aVis;
varying vec2 vUv; varying vec3 vCol; varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
  mv.xy += aCorner * aSize;
  gl_Position = projectionMatrix * mv;
  vUv = aCorner; vCol = aCol; vA = aK * aVis;
}`;
const CLOUD_FS = `
varying vec2 vUv; varying vec3 vCol; varying float vA;
void main() {
  float d = length(vUv);
  float a = d < 0.55 ? mix(1.0, 0.85, d / 0.55) : mix(0.85, 0.0, clamp((d - 0.55) / 0.45, 0.0, 1.0));
  if (a * vA < 0.004) discard;
  gl_FragColor = vec4(vCol, a * vA);
}`;
function buildClouds() {
  if (GL3D.cloudsFor === g.rocks) return;
  GL3D.cloudsFor = g.rocks;
  if (GL3D.clouds) { GL3D.scene.remove(GL3D.clouds); glDispose(GL3D.clouds); }
  const C = [], K = [], S = [], Col = [], A = [], ranges = [];
  const dark = [34 / 255, 40 / 255, 62 / 255], lite = [205 / 255, 215 / 255, 240 / 255];
  let v = 0;
  const puff = (x, y, z, size, col, k) => {
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { C.push(x, z, -y); K.push(a, b); S.push(size); Col.push(...col); A.push(k); }
    v += 4;
  };
  g.rocks.forEach((o, ci) => {
    const start = v, m = Math.min(o.r * 1.3, o.rz * 1.1);
    o.puffs.forEach((p, i) => puff(o.x + p.dx * o.r * 0.91, o.y + (glHash(ci, i) - 0.5) * o.r * 0.9, (o.z || 0) + p.dz * o.rz * 0.82, p.s * m * 1.15, dark, 0.9));
    o.puffs.forEach((p, i) => { if (p.dz >= 0) puff(o.x + p.dx * o.r * 0.91, o.y + (glHash(ci, i) - 0.5) * o.r * 0.9 + 0.5, (o.z || 0) + p.dz * o.rz * 0.82 + p.s * o.rz * 0.27, p.s * m * 0.7, lite, 0.35); });
    ranges.push([start, v]);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('aCorner', new THREE.Float32BufferAttribute(K, 2));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1));
  geo.setAttribute('aCol', new THREE.Float32BufferAttribute(Col, 3));
  geo.setAttribute('aK', new THREE.Float32BufferAttribute(A, 1));
  geo.setAttribute('aVis', new THREE.Float32BufferAttribute(new Float32Array(v), 1));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(v / 4 * 6), 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 5;
  GL3D.clouds = m; GL3D.cloudRanges = ranges; GL3D.scene.add(m);
}
function syncClouds() {
  buildClouds();
  const geo = GL3D.clouds.geometry, vis = geo.attributes.aVis, idx = geo.index, order = [];
  GL3D.clouds.visible = true;
  g.rocks.forEach((o, ci) => {
    const v = Math.max(cloudVis(o), afterglow(o) * 0.9); o.glVis = v;
    const [a, b] = GL3D.cloudRanges[ci];
    for (let k = a; k < b; k++) vis.array[k] = v;
    if (v >= 0.03) order.push([Math.hypot(o.x - camX, o.y - camY, (o.z || 0) - camH), a, b]);
  });
  vis.needsUpdate = true;
  order.sort((p, q) => q[0] - p[0]);
  let n = 0; const I = idx.array;
  for (const [, a, b] of order) for (let k = a; k < b; k += 4) { I[n++] = k; I[n++] = k + 1; I[n++] = k + 2; I[n++] = k; I[n++] = k + 2; I[n++] = k + 3; }
  idx.needsUpdate = true;
  geo.setDrawRange(0, n);
}
// over the 3D sky: a grey wash when you're inside a cloud, and lightning flashing in them
function gl3dSkyOverlay() {
  drawRunway();
  for (const o of g.rocks) {
    const v = o.glVis || 0; if (v < 0.03) continue;
    const c = cam(o.x, o.y, o.z || 0); if (c.f < SK.NEAR) continue;
    const q = proj(c), R = o.r * 1.3 * q.s, Rz = o.rz * 1.1 * q.s;
    if (Math.min(R, Rz) > Math.max(W, H) * 1.2) { ctx.globalAlpha = Math.min(0.85, v * 0.8); ctx.fillStyle = '#262c42'; ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2); ctx.globalAlpha = 1; }
    if (o.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, o.flash * 2); lamp(q.x, q.y, '#c8d8ff', Math.max(4, R * 0.35)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  }
}

// ---------- Wreckers' Night: the island they fight on ----------
// a low disc of rock and shingle with a beach running down into the sea, coloured for the sea it's in
function syncIsland(B) {
  const I = g.island, key = I ? B.name + ':' + I.x + ':' + I.y + ':' + I.r : '';
  if (GL3D.islandKey === key) return;
  GL3D.islandKey = key;
  if (GL3D.island) { GL3D.scene.remove(GL3D.island); GL3D.island.traverse(glDispose); GL3D.island = null; }
  if (!I) return;
  const base = glOver(B.head[1], 'rgba(150,146,130,0.22)'), dark = glOver(B.head[0], 'rgba(90,86,76,0.2)'), sand = glOver(B.head[1], `rgba(${B.surf},0.12)`);
  const SEG = 96, RINGS = 14, pos = [], col = [], idx = [];
  const edge = a => I.r * (1 + 0.035 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 13));
  pos.push(I.x, I.z, -I.y); col.push(base.r, base.g, base.b);
  for (let i = 1; i <= RINGS + 2; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = j / SEG * Math.PI * 2, e = edge(a);
      // rings out to the edge, then two more down the beach under the water
      const r = i <= RINGS ? e * i / RINGS : e + (i - RINGS) * 7, z = i <= RINGS ? I.z + 0.08 * Math.sin(a * 7 + i) * (i / RINGS) : I.z - (i - RINGS) * 0.6;
      pos.push(I.x + Math.cos(a) * r, z, -(I.y + Math.sin(a) * r));
      const n = glHash(i, j), c = i > RINGS ? sand : n < 0.3 ? dark : base;
      const k = 0.9 + 0.2 * glHash(j, i);
      col.push(c.r * k, c.g * k, c.b * k);
    }
  }
  const at = (i, j) => 1 + (i - 1) * SEG + (j % SEG);
  for (let j = 0; j < SEG; j++) idx.push(0, at(1, j), at(1, j + 1));
  for (let i = 1; i < RINGS + 2; i++) for (let j = 0; j < SEG; j++) { const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1); idx.push(a, c, d, a, d, b); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  GL3D.island = m; GL3D.scene.add(m);
}
