'use strict';
// Skerry Links in 3D (three.js, its own canvas, #gfCv): the hole's land and turf, the sea below the cliffs, the trees,
// the pin, the ball and its shadow, the golfer and the swing, the aim line, the slopes on the green, and the camera.
// The land is one mesh in detail over the hole (heights from gfH, src/golfcourse.js) wearing a picture of the course
// painted on a canvas (gf3dPaint: the rough, the mown fairway, the greens, the bunkers, the rocks and the sea bed, all
// from the same shapes the ball plays off), with a plainer one round it out to the horizon. Game frame to three.js:
// (x, y, z up) is (x, z, -y).

const G3 = { ok: false, r: null, scene: null, cam: null, hole: null, ball: null, shadow: null, golfer: null, pin: null, flag: null, aimPts: null, ring: null, slopes: null, others: [], trail: null, paint: null, cp: null, cl: null };
const gv = (x, y, z) => new THREE.Vector3(x, z, -y);

function gf3dInit() {
  if (G3.ok) return true;
  if (typeof THREE === 'undefined') return false;
  const cv = $('gfCv');
  // (phones and dense screens go without multisampling, which costs most there and shows least)
  const dpr = window.devicePixelRatio || 1, touch = matchMedia && matchMedia('(pointer: coarse)').matches;
  G3.lite = touch || dpr >= 2;
  try { G3.r = new THREE.WebGLRenderer({ canvas: cv, antialias: !G3.lite, powerPreference: 'high-performance' }); } catch (e) { return false; }
  G3.dprRaw = dpr; gf3dPower(true);
  const S = G3.scene = new THREE.Scene();
  S.fog = new THREE.Fog(0xdcc7a2, 260, 1500);
  G3.cam = new THREE.PerspectiveCamera(52, 1, 0.1, 6000);
  // late afternoon: a low warm sun out to sea, the sky light from above
  G3.hemi = new THREE.HemisphereLight(0xd8e6ff, 0x4e5a38, 0.85); S.add(G3.hemi);
  const sun = G3.sun = new THREE.DirectionalLight(0xffe0b0, 1.05); sun.position.set(-0.55, 0.42, -0.72).multiplyScalar(100); S.add(sun);
  // the sky: blue overhead to a warm haze at the horizon, brighter towards the sun
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sd: { value: sun.position.clone().normalize() }, top: { value: new THREE.Color(0.36, 0.55, 0.78) }, hor: { value: new THREE.Color(0.92, 0.8, 0.62) }, glow: { value: new THREE.Color(1, 0.78, 0.45) }, night: { value: 0 } },
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 sd, top, hor, glow; uniform float night; varying vec3 vd; void main(){ float h = clamp(vd.y, -0.1, 1.0); vec3 c = mix(hor, top, pow(max(h, 0.0), 0.55)); float s = max(dot(vd, sd), 0.0); c += glow * (pow(s, 9.0) * mix(0.35, 0.08, night) + pow(s, 400.0) * mix(1.2, 0.0, night)); gl_FragColor = vec4(c, 1.0); }' }));
  sky.renderOrder = -1; S.add(sky); G3.sky = sky;
  // the sea
  const sea = G3.sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshPhongMaterial({ color: 0x2b6a80, specular: 0xffe6b8, shininess: 70, transparent: true, opacity: 0.86 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0; S.add(sea);
  // the ball, its shadow and its trail
  G3.ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x555555 })); S.add(G3.ball);
  G3.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  G3.shadow.rotation.x = -Math.PI / 2; S.add(G3.shadow);
  G3.trailN = 48; const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(G3.trailN * 3), 3));
  G3.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); G3.trail.frustumCulled = false; S.add(G3.trail);
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshLambertMaterial({ color: GF_COLS[i], emissive: new THREE.Color(GF_COLS[i]).multiplyScalar(0.35) })); m.visible = false; S.add(m); const mk = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 8), new THREE.MeshBasicMaterial({ color: GF_COLS[i] })); mk.rotation.x = Math.PI; mk.visible = false; S.add(mk); G3.others.push({ m, mk }); }
  // the pin, the flag and the cup
  const pin = G3.pin = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.3, 6), new THREE.MeshLambertMaterial({ color: 0xf4efe2 })); stick.position.y = 1.15; pin.add(stick);
  const fg = new THREE.PlaneGeometry(0.75, 0.48, 6, 1); fg.translate(0.375, 0, 0);
  G3.flag = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: 0xd8452f, side: THREE.DoubleSide })); G3.flag.position.y = 2.05; pin.add(G3.flag);
  const cup = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshBasicMaterial({ color: 0x14180f })); cup.rotation.x = -Math.PI / 2; cup.position.y = 0.012; pin.add(cup);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.135, 20), new THREE.MeshBasicMaterial({ color: 0xe9e4d4 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.01; pin.add(rim);
  S.add(pin);
  // a marker over the pin, the same size however far off it is, so it can be found from the tee
  { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#f4efe2'; x.fillRect(29, 6, 4, 54); x.fillStyle = '#d8452f'; x.beginPath(); x.moveTo(33, 6); x.lineTo(60, 16); x.lineTo(33, 27); x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke();
    const t = new THREE.CanvasTexture(c); G3.pinMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.9 })); G3.pinMark.scale.set(0.045, 0.045, 1); G3.pinMark.renderOrder = 5; S.add(G3.pinMark); }
  // the aim: dots along the ground to where a full shot comes down, and a ring there
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
  G3.aimPts = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0xfff2c4, size: 0.32, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false })); G3.aimPts.frustumCulled = false; S.add(G3.aimPts);
  G3.ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.3, 40), new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  G3.ring.rotation.x = -Math.PI / 2; S.add(G3.ring);
  G3.golfer = gf3dGolfer(); S.add(G3.golfer);
  G3.ok = true; gf3dResize();
  return true;
}
// the resolution follows the frame rate: down a step when frames run long (under about 50 a second over a second and
// a half), back up when there's plenty to spare for a few seconds; never under 0.6 of a pixel per screen pixel
function gf3dScale(dt) {
  const S = G3.fps || (G3.fps = { n: 0, t: 0, good: 0 }); if (!(dt > 0) || dt > 0.25) return;
  S.n++; S.t += dt; if (S.t < 1.5) return;
  const avg = S.t / S.n; S.n = 0; S.t = 0;
  let pr = G3.pr;
  // (judged against the frame rate aimed at: at the battery saver's 30 a second, a 33 ms frame is on time)
  const aim = typeof pwFrameS === 'function' ? pwFrameS() : 0;
  if (avg > Math.max(1 / 50, aim * 1.2)) { pr = Math.max(0.6, pr - (avg > Math.max(1 / 30, aim * 1.6) ? 0.25 : 0.12)); S.good = 0; }
  else if (avg < Math.max(1 / 58, aim * 1.06)) { if (++S.good >= 3 && pr < G3.prMax) { pr = Math.min(G3.prMax, pr + 0.1); S.good = 0; } }
  if (Math.abs(pr - G3.pr) > 1e-3) { G3.pr = pr; G3.r.setPixelRatio(pr); gf3dResize(); }
}
// the top of the resolution: less on phones and dense screens, and no more than 1.25 with the battery saver (src/power.js)
function gf3dPower(first) { if (!G3.r) return; G3.prMax = Math.min(G3.lite ? 1.25 : 1.5, G3.dprRaw || 1, typeof pwSaver === 'function' && pwSaver() ? 1.25 : 9); G3.pr = G3.prMax; G3.r.setPixelRatio(G3.pr); if (!first) gf3dResize(); }
function gf3dResize() { if (!G3.r) return; const w = innerWidth, h = innerHeight; G3.r.setSize(w, h, false); G3.cam.aspect = w / h; G3.cam.fov = w < h ? 64 : 52; G3.cam.updateProjectionMatrix(); }

// ---------- the golfer ----------
function gf3dGolfer() {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c });
  const trou = L(0x2a3346), skin = L(0xe0b48c), dark = L(0x22201c);
  for (const z of [-0.13, 0.13]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.85, 0.15), trou); leg.position.set(-0.04, 0.43, z); leg.rotation.z = -0.12; g.add(leg); const sh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.13), dark); sh.position.set(0.02, 0.04, z); g.add(sh); }
  const body = g.userData.body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.42), L(0xffd88a)); body.position.set(0.06, 1.13, 0); body.rotation.z = -0.32; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skin); head.position.set(0.2, 1.55, 0); g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.08, 12), dark); cap.position.set(0.2, 1.64, 0); g.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.2), dark); brim.position.set(0.31, 1.61, 0); g.add(brim);
  // the arms and the club swing together about the line from the shoulders to the ball
  const sw = g.userData.sw = new THREE.Group(); sw.position.set(0.16, 1.32, 0); g.add(sw);
  const toBall = new THREE.Vector3(0.62, -1.3, 0), len = toBall.length(), dir = toBall.clone().normalize();
  const club = new THREE.Group(); club.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); sw.add(club);
  for (const z of [-0.09, 0.09]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.62, 6), L(0xffd88a)); arm.position.set(0, -0.31, z * 0.6); arm.rotation.x = z > 0 ? -0.15 : 0.15; club.add(arm); g.userData.arms = (g.userData.arms || []).concat(arm); }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len - 0.55, 5), L(0xc9c9c9)); shaft.position.y = -0.6 - (len - 0.55) / 2; club.add(shaft);
  const ch = g.userData.head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.06), L(0x8a8a8a)); ch.position.y = -len + 0.03; club.add(ch);
  return g;
}

// ---------- a hole ----------
function gf3dDispose(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) [].concat(c.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }); }
function gf3dHole(H) {
  if (!G3.ok && !gf3dInit()) return;
  if (G3.hole) { G3.scene.remove(G3.hole); gf3dDispose(G3.hole); }
  const grp = G3.hole = new THREE.Group();
  const P = G3.paint = gf3dPaint(H);
  const tex = new THREE.CanvasTexture(P.cv); tex.anisotropy = Math.min(G3.lite ? 2 : 4, G3.r.capabilities.getMaxAnisotropy ? G3.r.capabilities.getMaxAnisotropy() : 4); if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  // the land in detail over the hole
  const [x0, y0, x1, y1] = H.box, step = 2.5, nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1;
  const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2), idx = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = Math.min(x1, x0 + i * step), y = Math.min(y1, y0 + j * step), k = j * nx + i;
    pos[k * 3] = x; pos[k * 3 + 1] = gfH(H, x, y); pos[k * 3 + 2] = -y; uv[k * 2] = (x - x0) / (x1 - x0); uv[k * 2 + 1] = (y - y0) / (y1 - y0);
    if (i < nx - 1 && j < ny - 1) idx.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex })));
  // and plainer out to the horizon (with a hole where the detailed land is)
  const fs = 20, fx0 = x0 - 1100, fy0 = y0 - 900, fx1 = x1 + 1100, fy1 = y1 + 1100, fnx = Math.ceil((fx1 - fx0) / fs) + 1, fny = Math.ceil((fy1 - fy0) / fs) + 1;
  const fp = new Float32Array(fnx * fny * 3), fc = new Float32Array(fnx * fny * 3), fi = [], cR = new THREE.Color(0x4c6f36), cD = new THREE.Color(0x3e5e2e), cK = new THREE.Color(0x857a68), cB = new THREE.Color(0x2c5260), tmp = new THREE.Color();
  for (let j = 0; j < fny; j++) for (let i = 0; i < fnx; i++) {
    const x = fx0 + i * fs, y = fy0 + j * fs, k = j * fnx + i, h = gfH(H, x, y), sd = gfSeaD(H, x, y);
    fp[k * 3] = x; fp[k * 3 + 1] = h - 0.5; fp[k * 3 + 2] = -y;
    tmp.copy(sd < 0 ? cB : sd < 12 ? cK : (glHashG(i, j) > 0.5 ? cR : cD)); fc[k * 3] = tmp.r; fc[k * 3 + 1] = tmp.g; fc[k * 3 + 2] = tmp.b;
    if (i < fnx - 1 && j < fny - 1) { const inside = x >= x0 + fs && x + fs <= x1 - fs && y >= y0 + fs && y + fs <= y1 - fs; if (!inside) fi.push(k, k + 1, k + fnx, k + 1, k + fnx + 1, k + fnx); }
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.setIndex(fi); fg.computeVertexNormals();
  grp.add(new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true })));
  // the creek's water, a little below its banks
  for (const C of H.ck) {
    const sh = new THREE.Shape(C.map(p => new THREE.Vector2(p[0], p[1]))), m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshPhongMaterial({ color: 0x2f6474, specular: 0xffffff, shininess: 50, transparent: true, opacity: 0.85 }));
    m.rotation.x = -Math.PI / 2; const c = C.reduce((a, p) => [a[0] + p[0] / C.length, a[1] + p[1] / C.length], [0, 0]); m.position.y = gfBase(H, c[0], c[1]) - 1.3; grp.add(m);
  }
  // the trees: wind-bent cypresses and tall pines
  const T = H.trees, trunkG = new THREE.CylinderGeometry(0.22, 0.38, 1, 6), cypG = new THREE.DodecahedronGeometry(1, 0), pineG = new THREE.ConeGeometry(1, 1, 7);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x5a4330 }), T.length);
  const cyp = new THREE.InstancedMesh(cypG, new THREE.MeshLambertMaterial({ color: 0x31502c, flatShading: true }), Math.max(1, T.filter(t => !t.kind).length));
  const pine = new THREE.InstancedMesh(pineG, new THREE.MeshLambertMaterial({ color: 0x2a4630, flatShading: true }), Math.max(1, T.filter(t => t.kind).length));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  let a = 0, b = 0;
  T.forEach((t, k) => {
    const gz = t.gz = gfH(H, t.x, t.y);
    E.set(0, t.lean * 3, t.lean * 0.4); Q.setFromEuler(E); M.compose(V.set(t.x, gz + t.h * 0.3, -t.y), Q, Sc.set(1, t.h * 0.62, 1)); trunks.setMatrixAt(k, M);
    if (!t.kind) { M.compose(V.set(t.x + t.lean * 2, gz + t.h * 0.68, -t.y), Q, Sc.set(t.r * 1.25, t.r * 0.55, t.r * 1.05)); cyp.setMatrixAt(a++, M); }
    else { M.compose(V.set(t.x, gz + t.h * 0.62, -t.y), Q, Sc.set(t.r * 0.75, t.h * 0.75, t.r * 0.75)); pine.setMatrixAt(b++, M); }
  });
  cyp.count = a; pine.count = b; grp.add(trunks, cyp, pine);
  // the slopes on the green: little arrows pointing downhill, longer and warmer where it's steeper
  const sp = [], sc = [], gr = H.gr, cool = new THREE.Color(0xbfe8ff), warm = new THREE.Color(0xffb060);
  for (let yy = gr[1] - gr[3] - 2; yy <= gr[1] + gr[3] + 2; yy += 1.6) for (let xx = gr[0] - gr[2] - 2; xx <= gr[0] + gr[2] + 2; xx += 1.6) {
    if (gfEll(gr, xx, yy) > 1.05) continue;
    const n = gfNorm(H, xx, yy), gx = n[0] / n[2], gy = n[1] / n[2], m = Math.hypot(gx, gy); if (m < 0.002) continue;
    const L = Math.min(0.8, 0.12 + m * 18), ux = gx / m, uy = gy / m, h0 = gfH(H, xx, yy) + 0.03, ex = xx + ux * L, ey = yy + uy * L, h1 = gfH(H, ex, ey) + 0.03;
    const c = cool.clone().lerp(warm, Math.min(1, m / 0.035));
    const seg = (ax, ay, az, bx, by, bz) => { sp.push(ax, az, -ay, bx, bz, -by); sc.push(c.r, c.g, c.b, c.r, c.g, c.b); };
    seg(xx, yy, h0, ex, ey, h1);
    seg(ex, ey, h1, ex - ux * 0.22 + uy * 0.14, ey - uy * 0.22 - ux * 0.14, h1); seg(ex, ey, h1, ex - ux * 0.22 - uy * 0.14, ey - uy * 0.22 + ux * 0.14, h1);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  G3.slopes = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 })); G3.slopes.visible = false; grp.add(G3.slopes);
  // the lie of the green as a heat map (shown with the Slope toggle): blue low, red high, a thin line every 2.5 cm of height and a bolder one every 10
  G3.heat = gf3dHeat(H); grp.add(G3.heat.mesh);
  // the tee markers
  for (const x of [-3.2, 3.2]) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshLambertMaterial({ color: 0xd8452f })); t.position.copy(gv(x, 1.5, H.teeH + 0.1)); grp.add(t); }
  G3.scene.add(grp);
  G3.pin.position.copy(gv(H.pin[0], H.pin[1], gfH(H, H.pin[0], H.pin[1]))); G3.pinMark.position.copy(gv(H.pin[0], H.pin[1], gfH(H, H.pin[0], H.pin[1]) + 4.5));
  G3.cp = null;
  if (typeof gf3dCourse === 'function') gf3dCourse(H);
  if (typeof gfSkyHole === 'function') gfSkyHole(H);
  GF.intro = 2.4;
}
function gf3dHeat(H) {
  const gr = H.gr, R = Math.max(gr[2], gr[3]) + 3, x0 = gr[0] - R, y0 = gr[1] - R, st = 0.25, n = Math.ceil(2 * R / st) + 1, hs = new Float32Array(n * n);
  let lo = 1e9, hi = -1e9; const off = new Uint8Array(n * n);   // (bunkers and water left uncovered)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = x0 + i * st, y = y0 + j * st, h = hs[j * n + i] = gfH(H, x, y), su = gfSurf(H, x, y); off[j * n + i] = su === 'sand' || su === 'water' || su === 'out' || su === 'rock'; if (gfEll(gr, x, y) <= 1) { lo = Math.min(lo, h); hi = Math.max(hi, h); } }
  const span = Math.max(0.15, hi - lo), ppm = 14, S = Math.ceil(2 * R * ppm), cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'), img = c.createImageData(S, S), D = img.data;
  const ramp = [[40, 90, 220], [40, 190, 230], [70, 210, 90], [240, 220, 60], [240, 120, 40], [215, 40, 40]];
  const hAt = (x, y) => { const fx = Math.max(0, Math.min(n - 1.001, (x - x0) / st)), fy = Math.max(0, Math.min(n - 1.001, (y - y0) / st)), i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * n + i; return (hs[k] * (1 - u) + hs[k + 1] * u) * (1 - v) + (hs[k + n] * (1 - u) + hs[k + n + 1] * u) * v; };
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const x = x0 + (px + 0.5) / ppm, y = y0 + 2 * R - (py + 0.5) / ppm, e = gfEll(gr, x, y), o = (py * S + px) * 4;
    if (e > 1.14 || off[Math.round((y - y0) / st) * n + Math.round((x - x0) / st)]) { D[o + 3] = 0; continue; }
    const h = hAt(x, y), t = Math.max(0, Math.min(1, (h - lo) / span)) * (ramp.length - 1), a = Math.min(ramp.length - 2, t | 0), f = t - a;
    let r = ramp[a][0] + (ramp[a + 1][0] - ramp[a][0]) * f, g = ramp[a][1] + (ramp[a + 1][1] - ramp[a][1]) * f, b = ramp[a][2] + (ramp[a + 1][2] - ramp[a][2]) * f;
    // the contour lines: how close this height is to a whole 2.5 cm, measured in pixels across the slope so the lines stay even
    const dh = Math.hypot(hAt(x + 0.05, y) - hAt(x - 0.05, y), hAt(x, y + 0.05) - hAt(x, y - 0.05)) / 0.1 / ppm + 1e-6;
    const q = h / 0.025, d1 = Math.abs(q - Math.round(q)) * 0.025 / dh, q4 = h / 0.1, d4 = Math.abs(q4 - Math.round(q4)) * 0.1 / dh;
    const line = d4 < 1.1 ? 0.75 : d1 < 0.6 ? 0.4 : 0; r *= 1 - line; g *= 1 - line; b *= 1 - line;
    D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255 * (e < 1 ? 0.7 : 0.7 * (1.14 - e) / 0.14);
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  const m = Math.ceil(2 * R / 0.5) + 1, pos = new Float32Array(m * m * 3), uv = new Float32Array(m * m * 2), idx = [];
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const k = j * m + i, x = x0 + i * 0.5, y = y0 + j * 0.5; pos[k * 3] = x; pos[k * 3 + 1] = hAt(x, y) + 0.025; pos[k * 3 + 2] = -y; uv[k * 2] = i / (m - 1); uv[k * 2 + 1] = j / (m - 1); if (i < m - 1 && j < m - 1) idx.push(k, k + 1, k + m, k + 1, k + m + 1, k + m); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.visible = false; mesh.renderOrder = 1;
  return { mesh, lo, hi };
}
function glHashG(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }

// the picture of the course the land wears (and the map in the corner shows): painted from the hole's own shapes
function gf3dPaint(H) {
  const [x0, y0, x1, y1] = H.box, W = x1 - x0, Hh = y1 - y0, ppm = Math.min(4, 2048 / Math.max(W, Hh));
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W * ppm); cv.height = Math.ceil(Hh * ppm);
  const c = cv.getContext('2d'), X = x => (x - x0) * ppm, Y = y => (y1 - y) * ppm, path = P => { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); };
  const ell = (E, grow) => { c.beginPath(); c.ellipse(X(E[0]), Y(E[1]), (E[2] + grow) * ppm, (E[3] + grow) * ppm, -(E[4] || 0), 0, Math.PI * 2); };
  const r = gfRng(H.i * 31 + 5);
  // deep rough, then the rough along the line of play and round the green
  c.fillStyle = '#3f6130'; c.fillRect(0, 0, cv.width, cv.height);
  c.lineCap = c.lineJoin = 'round'; c.strokeStyle = '#4d7639';
  if (H.fwy.length) { path(H.fwy); c.lineWidth = 2 * (H.fw + 26) * ppm; c.stroke(); }
  path(H.pts); c.lineWidth = 2 * (Math.max(H.fw, 14) + 26) * ppm; c.stroke();
  c.fillStyle = '#4d7639'; c.beginPath(); c.ellipse(X(H.gr[0]), Y(H.gr[1]), H.gr[2] * 3.2 * ppm, H.gr[3] * 3.2 * ppm, -H.gr[4], 0, Math.PI * 2); c.fill();
  // tufts and wear
  for (let i = 0; i < 26000; i++) { const s = r() < 0.5; c.fillStyle = s ? 'rgba(20,40,10,0.13)' : 'rgba(190,210,120,0.08)'; c.fillRect(r() * cv.width, r() * cv.height, 1 + r() * 2.5, 1 + r() * 2.5); }
  // the fairway, mown in bands across the line of play
  if (H.fwy.length) {
    path(H.fwy); c.lineWidth = 2 * H.fw * ppm; c.strokeStyle = '#6a9e45'; c.stroke();
    // (the bands drawn on a canvas of their own, kept only where the fairway is, then laid on)
    const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const oc = o.getContext('2d');
    oc.lineCap = oc.lineJoin = 'round'; oc.beginPath(); H.fwy.forEach((p, i) => i ? oc.lineTo(X(p[0]), Y(p[1])) : oc.moveTo(X(p[0]), Y(p[1]))); oc.lineWidth = 2 * H.fw * ppm; oc.strokeStyle = '#000'; oc.stroke();
    oc.globalCompositeOperation = 'source-in'; oc.translate(X(0), Y(0)); oc.rotate(H.dir); oc.fillStyle = 'rgba(255,255,220,0.1)';
    for (let d = -60; d < H.len + 80; d += 16) oc.fillRect(-400 * ppm, -(d + 8) * ppm, 800 * ppm, 8 * ppm);
    c.drawImage(o, 0, 0);
  }
  // the tee
  c.fillStyle = '#74a84c'; c.fillRect(X(-4), Y(6), 8 * ppm, 12 * ppm);
  // the fringe and the green
  c.fillStyle = '#73a84b'; ell(H.gr, 1.8); c.fill();
  c.fillStyle = '#84c058'; ell(H.gr, 0); c.fill();
  c.save(); ell(H.gr, 0); c.clip(); c.fillStyle = 'rgba(255,255,230,0.08)'; c.translate(X(H.gr[0]), Y(H.gr[1])); c.rotate(H.dir + 0.6); for (let d = -30; d < 30; d += 3) c.fillRect(-40 * ppm, d * ppm, 80 * ppm, 1.5 * ppm); c.restore();
  // bunkers
  for (const b of H.bk) { c.fillStyle = '#c9b98a'; ell(b, 0.5); c.fill(); c.fillStyle = '#e8dbb0'; ell(b, 0); c.fill(); }
  for (let i = 0; i < 2500; i++) { const b = H.bk[(r() * H.bk.length) | 0]; if (!b) break; const a = r() * 6.283, d = Math.sqrt(r()); const px = b[0] + Math.cos(a) * b[2] * d, py = b[1] + Math.sin(a) * b[3] * d; c.fillStyle = 'rgba(150,130,90,0.16)'; c.fillRect(X(px), Y(py), 1.5, 1.5); }
  // the creek
  for (const C of H.ck) { c.fillStyle = '#5b5040'; path(C); c.closePath(); c.lineWidth = 5 * ppm; c.strokeStyle = '#6f6450'; c.stroke(); c.fill(); }
  // the sea: the bed, the surf at its edge, the rocks of the cliff
  const seaPath = () => { if (H.land) { c.beginPath(); c.rect(-10, -10, cv.width + 20, cv.height + 20); H.land.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); } else { c.beginPath(); for (const P of H.sea) { P.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); } } };
  const edges = H.land ? [H.land] : H.sea;
  if (edges.length) {
    seaPath(); c.fillStyle = '#35606a'; c.fill('evenodd');
    c.lineJoin = 'round';
    for (const P of edges) { path(P); c.closePath(); c.lineWidth = 7 * ppm; c.strokeStyle = 'rgba(210,235,230,0.55)'; c.stroke(); c.lineWidth = 2 * (GF_CLIFF - 1) * ppm; c.strokeStyle = '#857a66'; c.stroke(); c.lineWidth = 2.5 * ppm; c.strokeStyle = '#6b6152'; c.stroke(); }
  }
  return { cv, ppm, X, Y };
}

// ---------- each frame ----------
function gf3dDraw(dt) {
  if (!G3.ok || !GF.H) return;
  const H = GF.H, p = gfPlayer(), t = GF.t;
  // the ball: in flight from the track, or lying where it lies
  let bp = gfBallNow();
  const lying = !bp; if (lying && p) bp = [p.x, p.y, gfH(H, p.x, p.y)];
  if (bp) {
    G3.ball.position.copy(gv(bp[0], bp[1], bp[2] + 0.06)); G3.ball.visible = !(p && p.done && lying);
    const gh = gfH(H, bp[0], bp[1]), up = Math.max(0, bp[2] - gh); G3.shadow.position.copy(gv(bp[0], bp[1], Math.max(gh, 0) + 0.03)); G3.shadow.scale.setScalar(1 + up * 0.04); G3.shadow.material.opacity = Math.max(0.08, 0.35 - up * 0.006); G3.shadow.visible = G3.ball.visible && gh > -0.5;
  }
  // the trail behind a ball in the air
  const tp = G3.trail.geometry.attributes.position, S = GF.shot;
  if (S && GF.rep) { const tr = S.R.tr, i1 = Math.min(tr.length - 1, GF.rep.i); for (let k = 0; k < G3.trailN; k++) { const q = tr[Math.max(0, i1 - (G3.trailN - 1 - k) * 2)]; tp.setXYZ(k, q[0], q[2] + 0.06, -q[1]); } tp.needsUpdate = true; G3.trail.visible = true; } else G3.trail.visible = false;
  // the others' balls, where they lie
  GF.P.forEach((q, i) => { const o = G3.others[i]; if (!o) return; const show = q !== p && !q.done && q.st > 0; o.m.visible = o.mk.visible = show; if (show) { const z = gfH(H, q.x, q.y); o.m.position.copy(gv(q.x, q.y, z + 0.06)); o.mk.position.copy(gv(q.x, q.y, z + 1.6 + Math.sin(t * 3 + i) * 0.1)); } });
  // the golfer at the ball, swinging with the meter
  const aiming = (GF.ph === 'aim' || GF.ph === 'swing') && p && !p.done;
  const swinging = GF.ph === 'fly' && GF.rep && GF.rep.t < 1.2 && S && !lying;
  G3.golfer.visible = !!(aiming || swinging);
  if (G3.golfer.visible) {
    const sx = swinging ? S.sx : p.x, sy = swinging ? S.sy : p.y, a = swinging ? S.shot.a : GF.aim, rx = Math.cos(a), ry = -Math.sin(a), putt = GF_CLUBS[swinging ? S.shot.c : GF.club].putt;
    const st = putt ? 0.55 : 0.75, gx = sx - rx * st, gy = sy - ry * st;
    G3.golfer.position.copy(gv(gx, gy, gfH(H, gx, gy))); G3.golfer.rotation.y = Math.atan2(ry, rx);
    G3.golfer.userData.body.material.color.set(p ? p.col : '#ffd88a');
    let sw = 0; const M = GF.m, top = putt ? 0.55 : 2.5;
    if (GF.ph === 'swing' && M) sw = M.s === 1 ? -M.v * top / 1.1 : -Math.max(0, M.v) * top / 1.1;
    else if (swinging) { const k = GF.rep.t; sw = Math.min(top * 0.9, k * 9) * (putt ? 0.6 : 1); }
    G3.golfer.userData.sw.rotation.x = sw;
  }
  // the pin's flag streams downwind
  const wb = Math.atan2(GF.wind[0], GF.wind[1]), ws = Math.hypot(GF.wind[0], GF.wind[1]);
  G3.flag.rotation.y = -wb + Math.PI / 2 + Math.sin(t * (2 + ws * 0.4)) * 0.12; G3.flag.scale.x = 0.7 + Math.min(0.3, ws * 0.04);
  if (G3.pinMark) G3.pinMark.visible = !!p && gfToPin(p) > 35 && GF.view !== 'card';
  // the aim line and the ring where a full shot comes down
  const showAim = GF.ph === 'aim' && p && !p.done && GF.intro <= 0;
  const club = GF_CLUBS[GF.club], ap = G3.aimPts.geometry.attributes.position;
  G3.aimPts.visible = G3.ring.visible = showAim;
  const aimKey = showAim ? [p.x, p.y, GF.aim, GF.pw, GF.club, GF.putt, p.lie].join(',') : '';
  if (showAim && aimKey !== G3.aimKey) {
    G3.aimKey = aimKey;
    const lie = club.putt ? 1 : (GF_SURF[p.lie] || GF_SURF.rough).lie * (club.k === 'D' && p.lie !== 'tee' ? 0.9 : 1);
    const L = (club.putt ? GF_PUTTS[GF.putt] * 0.3048 : club.c * GF_YD * lie) * (GF.pw || 1), sa = Math.sin(GF.aim), ca = Math.cos(GF.aim);
    for (let k = 0; k < 64; k++) { const f = (k + 1) / 64, d = L * f, x = p.x + sa * d, y = p.y + ca * d, gz = gfH(H, x, y); ap.setXYZ(k, x, Math.max(gz, 0) + 0.08 + (club.putt ? 0 : Math.sin(f * Math.PI) * 0), -y); }
    ap.needsUpdate = true;
    const ex = p.x + sa * L, ey = p.y + ca * L; G3.ring.position.copy(gv(ex, ey, Math.max(gfH(H, ex, ey), 0) + 0.1)); G3.ring.scale.setScalar(club.putt ? 0.18 : 0.6 + L / 160);
    G3.aimPts.material.size = club.putt ? 0.06 : 0.32;
  }
  const onGreen = gfOnGreen(); if (G3.slopes) G3.slopes.visible = onGreen; if (G3.heat) G3.heat.mesh.visible = onGreen && !!GF.heat;
  gf3dCamera(dt, bp);
  if (typeof gfSkyTick === 'function') gfSkyTick(dt, t);
  gf3dScale(dt);
  G3.r.render(G3.scene, G3.cam);
}
// the camera: behind the ball down the aim when it's your go, chasing the ball in flight, high over the hole to look
function gf3dCamera(dt, bp) {
  const H = GF.H, p = gfPlayer(); let pos, look, k = 3;
  const behind = (x, y, a, back, up, ahead) => { const sa = Math.sin(a), ca = Math.cos(a), z = gfH(H, x, y); const cx = x - sa * back, cy = y - ca * back; return [[cx, cy, Math.max(gfH(H, cx, cy), 0, z - 4) + up], [x + sa * ahead, y + ca * ahead, Math.max(z + (ahead > 20 ? 1.5 : 0), 0)]]; };
  if (GF.intro > 0) {
    GF.intro -= dt; const f = 1 - Math.max(0, GF.intro) / 2.4, e = f * f * (3 - 2 * f);
    const A = [H.pin[0] - Math.sin(H.dir) * 40, H.pin[1] - Math.cos(H.dir) * 40, gfH(H, H.pin[0], H.pin[1]) + 45], B = behind(p.x, p.y, GF.aim, 7, 2.6, 60);
    pos = A.map((v, i) => v + (B[0][i] - v) * e); const LA = [H.pin[0], H.pin[1], gfH(H, H.pin[0], H.pin[1])]; look = LA.map((v, i) => v + (B[1][i] - v) * e); k = 50;
  } else if (GF.view === 'look' && p) {
    const mx = (p.x + H.pin[0]) / 2, my = (p.y + H.pin[1]) / 2, d = Math.max(60, gfToPin(p)), a = Math.atan2(H.pin[0] - p.x, H.pin[1] - p.y);
    pos = [mx - Math.sin(a) * d * 0.45, my - Math.cos(a) * d * 0.45, gfH(H, mx, my) + d * 0.85]; look = [mx + Math.sin(a) * d * 0.1, my + Math.cos(a) * d * 0.1, gfH(H, mx, my)]; k = 4;
  } else if ((GF.ph === 'fly' || GF.ph === 'result') && bp && GF.shot) {
    const S = GF.shot, tr = S.R.tr, i = Math.min(tr.length - 1, GF.rep.i), q = tr[Math.max(0, i - 12)], dx = bp[0] - q[0], dy = bp[1] - q[1], m = Math.hypot(dx, dy);
    const a = m > 0.3 ? Math.atan2(dx, dy) : S.shot.a, putt = GF_CLUBS[S.shot.c].putt;
    if (GF.rep.t < 0.35 && !putt) { const B = behind(S.sx, S.sy, S.shot.a, 7, 2.6, 60); pos = B[0]; look = [bp[0], bp[1], bp[2]]; k = 6; }
    else if (GF.ph === 'result' && S.R.how === 'cup') { const B = behind(bp[0], bp[1], S.shot.a, 9, 3.4, 0); pos = B[0]; look = [bp[0], bp[1], bp[2] + 0.6]; k = 1.5; }
    else if (putt) { const d0 = Math.hypot(S.sx - GF.H.pin[0], S.sy - GF.H.pin[1]), B = behind(S.sx, S.sy, S.shot.a, 3.6 + d0 * 0.22, 1.7 + d0 * 0.13, 0); pos = B[0]; look = [bp[0], bp[1], bp[2]]; k = 3; }
    else {
      // in flight: from above and behind, a little off to the side, looking down on the ball (higher the higher it flies)
      const sa = Math.sin(a), ca = Math.cos(a), up = Math.max(0, bp[2] - gfH(H, bp[0], bp[1])), back = 13 + up * 0.15, side = 5, cx = bp[0] - sa * back + ca * side, cy = bp[1] - ca * back - sa * side;
      pos = [cx, cy, Math.max(gfH(H, cx, cy), 0, bp[2]) + 11 + up * 0.25]; look = [bp[0] + sa * 6, bp[1] + ca * 6, bp[2]]; k = 2.6;
    }
  } else if (p) {
    const putt = GF_CLUBS[GF.club].putt, d = gfToPin(p), B = putt ? behind(p.x, p.y, GF.aim, 3.6 + d * 0.22, 1.7 + d * 0.13, Math.max(2, Math.min(d, 25) * 0.75)) : behind(p.x, p.y, GF.aim, 7, 2.6, 60);
    pos = B[0]; look = B[1]; k = 5;
  }
  if (!pos) return;
  const P = gv(pos[0], pos[1], pos[2]), L = gv(look[0], look[1], look[2]);
  if (!G3.cp) { G3.cp = P.clone(); G3.cl = L.clone(); }
  const f = 1 - Math.exp(-k * dt); G3.cp.lerp(P, f); G3.cl.lerp(L, f);
  // never under the ground
  const gz = gfH(H, G3.cp.x, -G3.cp.z); if (G3.cp.y < Math.max(gz, 0) + 0.8) G3.cp.y = Math.max(gz, 0) + 0.8;
  G3.cam.position.copy(G3.cp); G3.cam.lookAt(G3.cl);
  G3.yaw = Math.atan2(G3.cl.x - G3.cp.x, -(G3.cl.z - G3.cp.z));
}
