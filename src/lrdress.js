'use strict';
// The Lamp Road: Gullhaven dressed in 3D, at late evening, and the Lamp Wain (src/lrmap.js is the map as data; src/lr3d.js
// draws the match and calls in here when these exist):
//   lrDressMap(scene, renderer) -> { update(dt, t, cart) }  every box and ramp of LR_MAP by its kind, the Wain's road,
//                                  the checkpoints, the sea, the skerries, the sky, the lamps, the light and the fog
//   lrLightOn()                     the Gullhaven Light is lit (the Wain has come home): the lamp blazes, the beam sweeps
//   lrWainModel() -> { group, update(cart, dt) }   the Lamp Wain, facing -z at yaw 0, its wheels turning with cart.s
//   lrPackMesh(big) -> Object3D     an oil can (small) or a ship's medicine chest (big)
// And the shared means of making things (src/lrhero.js builds its figures with them too):
//   lrBatch()   many little shapes copied into one geometry, each with its own colour (one draw call a material)
//   lrProto(k)  the unit shapes those are made from ('box', 'cyl:8', 'cyl:8:0.6' (tapered), 'cone:6', 'sph:8',
//               'ico:1', 'tor:16:0.1', 'arc:16:0.1' (half a ring), 'hemi:8')
//   lrGlowTex() a soft round glow, for sprites and points
// Everything static is merged by material and by a 40 m slice of the town (so what's behind you isn't drawn): the whole
// map comes to a few dozen draw calls.

const LRD = { st: null, proto: {}, tex: {} };

function lrRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const LRD_C = new (typeof THREE !== 'undefined' ? THREE.Color : Object)();
// a colour a little lighter or darker than hex, at random
function lrJ(hex, R, a) { LRD_C.setHex(hex); LRD_C.offsetHSL(0, 0, (R() - 0.5) * a); return LRD_C.getHex(); }

// ---------- unit shapes ----------
function lrProto(k) {
  if (LRD.proto[k]) return LRD.proto[k];
  const p = k.split(':'), n = p[0], s = +p[1] || 8, b = p[2] == null ? null : +p[2];
  let g;
  if (n === 'box') g = new THREE.BoxGeometry(1, 1, 1);
  else if (n === 'cyl') g = new THREE.CylinderGeometry(b == null ? 1 : b, 1, 1, s);   // radius 1 (top b), height 1, centred
  else if (n === 'cone') g = new THREE.ConeGeometry(1, 1, s);
  else if (n === 'sph') g = new THREE.SphereGeometry(1, s, Math.max(3, Math.round(s * 0.6)));
  else if (n === 'hemi') g = new THREE.SphereGeometry(1, s, Math.max(2, Math.round(s * 0.35)), 0, Math.PI * 2, 0, Math.PI / 2);
  else if (n === 'ico') g = new THREE.IcosahedronGeometry(1, s >= 1 && p[1] ? s : 0);
  else if (n === 'tor') g = new THREE.TorusGeometry(1, b == null ? 0.12 : b, 5, s);
  else if (n === 'arc') g = new THREE.TorusGeometry(1, b == null ? 0.12 : b, 5, s, Math.PI);   // half a ring, over the top
  else if (n === 'dod') g = new THREE.DodecahedronGeometry(1, 0);
  else g = new THREE.BoxGeometry(1, 1, 1);
  return (LRD.proto[k] = g);
}

// ---------- one geometry out of many ----------
function lrBatch() {
  const P = [], N = [], C = [];
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), e = new THREE.Euler(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  const B = {
    count: 0,
    // a geometry, by a matrix; fn(nx, ny, nz, x, y, z) -> hex, if given, colours each triangle by its (world) normal and place
    geo(g, col, mtx, fn) {
      const pa = g.attributes.position.array, na = g.attributes.normal.array, idx = g.index ? g.index.array : null;
      nm.getNormalMatrix(mtx); c.set(col);
      const me = mtx.elements, ne = nm.elements, n = idx ? idx.length : pa.length / 3;
      for (let k = 0; k < n; k++) {
        const i = idx ? idx[k] : k, x = pa[i * 3], y = pa[i * 3 + 1], z = pa[i * 3 + 2];
        const wx = me[0] * x + me[4] * y + me[8] * z + me[12], wy = me[1] * x + me[5] * y + me[9] * z + me[13], wz = me[2] * x + me[6] * y + me[10] * z + me[14];
        P.push(wx, wy, wz);
        const a = na[i * 3], b = na[i * 3 + 1], d = na[i * 3 + 2];
        let nx = ne[0] * a + ne[3] * b + ne[6] * d, ny = ne[1] * a + ne[4] * b + ne[7] * d, nz = ne[2] * a + ne[5] * b + ne[8] * d;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        N.push(nx, ny, nz);
        if (fn && k % 3 === 0) c.set(fn(nx, ny, nz, wx, wy, wz));
        C.push(c.r, c.g, c.b);
      }
      B.count += n;
      return B;
    },
    // at (x, y, z), turned (rx, ry, rz) in the order Y then X then Z, scaled (sx, sy, sz) (sy, sz default to sx)
    add(g, col, x, y, z, rx, ry, rz, sx, sy, sz, fn) {
      if (typeof g === 'string') g = lrProto(g);
      e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e);
      const s = sx == null ? 1 : sx;
      m.compose(v.set(x || 0, y || 0, z || 0), q, sc.set(s, sy == null ? s : sy, sz == null ? s : sz));
      return B.geo(g, col, m, fn);
    },
    box(x0, y0, z0, x1, y1, z1, col) { return B.add('box', col, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, 0, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); },
    // a rod from a to b ([x, y, z]), radius r
    rod(a, b, r, col, seg) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-6;
      v.set(dx / L, dy / L, dz / L); q.setFromUnitVectors(sc.set(0, 1, 0), v);
      m.compose(v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, sc.set(r, L, r));
      return B.geo(lrProto('cyl:' + (seg || 6)), col, m);
    },
    build() {
      if (!B.count) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    },
    mesh(mat) { const g = B.build(); return g ? new THREE.Mesh(g, mat) : null; },
  };
  return B;
}

// ---------- textures ----------
function lrGlowTex() {
  if (LRD.tex.glow) return LRD.tex.glow;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (LRD.tex.glow = new THREE.CanvasTexture(c));
}
// the town's cobbles ('cobble') and the Wain's road of granite setts ('setts')
function lrPaveTex(kind, aniso) {
  if (LRD.tex[kind]) return LRD.tex[kind];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), R = lrRng(kind === 'setts' ? 11 : 5);
  const sh = (b, a) => { const k = b + (R() - 0.5) * a; return Math.max(0, Math.min(255, k | 0)); };
  if (kind === 'setts') {
    x.fillStyle = '#4a443c'; x.fillRect(0, 0, S, S);
    const rows = 8, h = S / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 0.5, n = 5;
      for (let i = -1; i < n + 1; i++) {
        const w = S / n, x0 = (i + off) * w;
        const g = sh(150, 34), cr = sh(g + 6, 8), cb = sh(g - 14, 8);
        x.fillStyle = `rgb(${cr},${g},${cb})`;
        x.beginPath(); x.roundRect ? x.roundRect(x0 + 2, r * h + 2, w - 4, h - 4, 4) : x.rect(x0 + 2, r * h + 2, w - 4, h - 4); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(x0 + 4, r * h + 3, w - 8, 3);
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(x0 + 4, r * h + h - 6, w - 8, 3);
      }
    }
  } else {
    x.fillStyle = '#2f2b27'; x.fillRect(0, 0, S, S);
    const n = 11, h = S / n;
    for (let r = 0; r < n; r++) for (let i = -1; i <= n; i++) {
      const cx = (i + (r % 2) * 0.5 + 0.5) * h + (R() - 0.5) * 3, cy = (r + 0.5) * h + (R() - 0.5) * 3;
      const g = sh(98, 30), cr = sh(g + 4, 14), cb = sh(g - 10, 14);
      x.fillStyle = `rgb(${cr},${g},${cb})`;
      x.beginPath(); x.ellipse(((cx % S) + S) % S, cy, h * 0.44 + R() * 1.5, h * 0.4 + R() * 1.5, R() * 3, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,240,220,0.07)'; x.beginPath(); x.ellipse(((cx % S) + S) % S - 2, cy - 2, h * 0.22, h * 0.16, 0, 0, Math.PI * 2); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso || 1;
  return (LRD.tex[kind] = t);
}

// ---------- a box's faces ----------
// side 0 faces -z, 1 +z, 2 -x, 3 +x. u runs along the face (from its left end, seen from outside), v is height, w is
// out from the face. A shape made facing +z, set with put(), faces out of the wall.
function lrFaceOf(b, side) {
  const [x0, , z0, x1, , z1] = b;
  const d = [[0, -1, x1, z0, x1 - x0], [0, 1, x0, z1, x1 - x0], [-1, 0, x0, z0, z1 - z0], [1, 0, x1, z1, z1 - z0]][side];
  const nx = d[0], nz = d[1], tx = nz, tz = -nx, ox = d[2], oz = d[3];
  const F = {
    nx, nz, tx, tz, len: d[4], ry: Math.atan2(nx, nz), side,
    at(u, w) { return [ox + tx * u + nx * w, oz + tz * u + nz * w]; },
    box(B, u0, u1, v0, v1, w0, w1, col) { const a = F.at(u0, w0), c = F.at(u1, w1); return B.box(Math.min(a[0], c[0]), v0, Math.min(a[1], c[1]), Math.max(a[0], c[0]), v1, Math.max(a[1], c[1]), col); },
    put(B, g, col, u, v, w, rx, rz, sx, sy, sz) { const p = F.at(u, w); return B.add(g, col, p[0], v, p[1], rx, F.ry, rz, sx, sy, sz); },
  };
  return F;
}
// is (x, z) inside any box or ramp of the map (with a margin)?
function lrInSolid(x, z, m) {
  m = m || 0;
  for (const b of LR_MAP.boxes) if (x > b[0] - m && x < b[3] + m && z > b[2] - m && z < b[5] + m) return true;
  for (const r of LR_MAP.ramps) if (x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m) return true;
  return false;
}
// how far (x, z) is from the Wain's road
function lrRoadDist(x, z) {
  const P = LR_MAP.path; let best = 1e9;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], az = P[i][1], dx = P[i + 1][0] - ax, dz = P[i + 1][1] - az, l2 = dx * dx + dz * dz;
    const f = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = ax + dx * f - x, ez = az + dz * f - z;
    best = Math.min(best, Math.hypot(ex, ez));
  }
  return best;
}
// a flat strip along the road, off metres to its side (+ is to the right, walking along it), w wide, at height y
function lrStrip(off, w, y, uvS) {
  const P = LR_MAP.path, n = P.length, pos = [], uv = [], nor = [];
  const side = [];
  let L = 0; const acc = [0];
  for (let i = 1; i < n; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); acc.push(L); }
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i], c = P[Math.min(n - 1, i + 1)];
    let d1x = b[0] - a[0], d1z = b[1] - a[1], d2x = c[0] - b[0], d2z = c[1] - b[1];
    if (i === 0) { d1x = d2x; d1z = d2z; } if (i === n - 1) { d2x = d1x; d2z = d1z; }
    let l = Math.hypot(d1x, d1z); d1x /= l; d1z /= l; l = Math.hypot(d2x, d2z); d2x /= l; d2z /= l;
    const n1x = -d1z, n1z = d1x, n2x = -d2z, n2z = d2x; let mx = n1x + n2x, mz = n1z + n2z; l = Math.hypot(mx, mz); mx /= l; mz /= l;
    const k = 1 / Math.max(0.3, mx * n1x + mz * n1z);
    side.push([b[0] + mx * k * (off - w / 2), b[1] + mz * k * (off - w / 2), b[0] + mx * k * (off + w / 2), b[1] + mz * k * (off + w / 2)]);
  }
  const S = uvS || 2.4;
  const push = (x, z, u, v) => { pos.push(x, y, z); uv.push(u, v); nor.push(0, 1, 0); };
  for (let i = 0; i < n - 1; i++) {
    const A = side[i], Bq = side[i + 1], v0 = acc[i] / S, v1 = acc[i + 1] / S, ua = (off - w / 2) / S, ub = (off + w / 2) / S;
    const a0 = [A[0], A[1], ua, v0], a1 = [A[2], A[3], ub, v0], b0 = [Bq[0], Bq[1], ua, v1], b1 = [Bq[2], Bq[3], ub, v1];
    for (const T of [[a0, a1, b1], [a0, b1, b0]]) {
      const [p, q, r] = T, cy = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
      const o = cy >= 0 ? [p, q, r] : [p, r, q];
      for (const t of o) push(t[0], t[1], t[2], t[3]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
// a rough lump: a box of segments pushed in and out (its top kept flat at the top, if flat), faceted
function lrLump(w, h, d, R, amt, flat, seg) {
  const s = seg || 3;
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / s)), Math.max(1, Math.round(h / s)), Math.max(1, Math.round(d / s))).toNonIndexed();
  const p = g.attributes.position, H = h / 2;
  const hash = (x, y, z) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const top = y > H - 1e-4, bot = y < -H + 1e-4;
    const k = hash(x, y, z) - 0.5, k2 = hash(z, x, y) - 0.5;
    if (top && flat) { p.setXYZ(i, x * (0.93 + k * 0.05), y, z * (0.93 + k2 * 0.05)); continue; }
    if (bot) { p.setXYZ(i, x * (1 + k * 0.04), y, z * (1 + k2 * 0.04)); continue; }
    p.setXYZ(i, x + Math.sign(x) * k * amt + (Math.abs(x) > w / 2 - 1e-4 ? 0 : k2 * amt * 0.5), y + (top ? k * amt * 0.6 : k2 * amt * 0.4), z + Math.sign(z) * k2 * amt + (Math.abs(z) > d / 2 - 1e-4 ? 0 : k * amt * 0.5));
  }
  g.computeVertexNormals();
  return g;
}

// ---------- the palette ----------
const LRD_P = {
  white: 0xe6e0d2, cream: 0xd9ccb0, stone: 0x8a8274, granite: 0x9a958a, dark: 0x3a3632, slate: 0x4a5058, slate2: 0x3c424a,
  lead: 0x5c6268, tar: 0x231f1c, timber: 0x4a3626, plank: 0x6e5038, rope: 0xa08a60, iron: 0x3a3c40, brass: 0xc09a40,
  grass: 0x4e6238, heather: 0x5e4a5a, rock: 0x6a665e, rock2: 0x58544e, sand: 0x9a8a6a, sea: 0x1c3a4c, weed: 0x34402a,
  warm: 0xffc874, warm2: 0xffa850, glassD: 0x1a2330, red: 0xb8402e, blue: 0x3d7fb8, gold: 0xf2c14e, rust: 0xc8463a,
};
const LRD_SHUT = [0x3d6a8a, 0x2f5a4a, 0x8a3a2e, 0x4a4a6a, 0x6a7a4a, 0x2a4a6a];

// ---------- the town ----------
function lrDressMap(scene, renderer) {
  const R = lrRng(1729), P = LRD_P, root = new THREE.Group(); root.name = 'lrDress'; scene.add(root);
  const aniso = renderer && renderer.capabilities ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  const cellOf = x => Math.max(0, Math.min(5, Math.floor((x + 110) / 40)));
  const bats = {};
  const get = (k, x) => { const key = k + (x == null ? 'f' : cellOf(x)); return (bats[key] || (bats[key] = { k, B: lrBatch() })).B; };
  const L = x => get('lit', x), G = x => get('glow', x);
  const halos = [];   // [x, y, z, hex, size]
  const halo = (x, y, z, col, s) => halos.push([x, y, z, col || 0xffc070, s || 1]);
  const lampT = [];   // the lamps that flicker a little: their halo index

  // the materials
  const M = {
    lit: new THREE.MeshLambertMaterial({ vertexColors: true }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  };

  // ----- the light and the air: a clear late evening, the sun just down in the west -----
  const FOG = 0x7a7c98;
  scene.fog = new THREE.Fog(FOG, 75, 340);
  scene.background = new THREE.Color(FOG);
  const hemi = new THREE.HemisphereLight(0xb4c0e8, 0x5a5050, 0.95); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb888, 0.75); sun.position.set(-120, 45, 30); root.add(sun);
  const fill = new THREE.DirectionalLight(0x8898d0, 0.35); fill.position.set(80, 60, -40); root.add(fill);
  const amb = new THREE.AmbientLight(0x404058, 0.35); root.add(amb);

  // ----- the sky: a dome that follows the camera -----
  const skyM = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new THREE.Vector3(-1, -0.04, 0.22).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 sunDir; varying vec3 vD;',
      'float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }',
      'void main(){',
      ' vec3 d = normalize(vD); float y = d.y;',
      ' float s = max(0.0, dot(normalize(vec3(d.x,0.0,d.z)), normalize(vec3(sunDir.x,0.0,sunDir.z))));',
      ' vec3 zen = vec3(0.10,0.13,0.30), mid = vec3(0.36,0.36,0.58), hor = vec3(0.56,0.52,0.66);',
      ' vec3 warm = vec3(1.0,0.56,0.32), pink = vec3(0.86,0.50,0.56);',
      ' vec3 c = mix(hor, mid, smoothstep(0.0,0.22,y)); c = mix(c, zen, smoothstep(0.18,0.85,y));',
      ' float w = pow(s, 3.0) * (1.0 - smoothstep(-0.02, 0.35, y));',
      ' c = mix(c, mix(pink, warm, pow(s,8.0)), w);',
      ' c += vec3(1.0,0.62,0.3) * pow(s, 40.0) * (1.0 - smoothstep(-0.03, 0.08, y)) * 0.8;',
      ' c = mix(c, vec3(0.42,0.43,0.55), 1.0 - smoothstep(-0.12, 0.0, y));',
      // a few stars, away from the afterglow
      ' vec3 q = floor(d * 380.0); float st = step(0.9975, h(q)) * smoothstep(0.15, 0.6, y) * (1.0 - s * 0.9);',
      ' c += vec3(st) * 0.85;',
      ' gl_FragColor = vec4(c, 1.0);',
      '}'].join('\n'),
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyM); sky.frustumCulled = false; sky.renderOrder = -10;
  sky.onBeforeRender = (r, s, cam) => { sky.position.copy(cam.position); sky.scale.setScalar((cam.far || 1000) * 0.92); sky.updateMatrixWorld(); };
  root.add(sky);

  // ----- the sea -----
  const seaM = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, sunDir: { value: new THREE.Vector3(-1, 0.1, 0.22).normalize() } }]),
    vertexShader: ['varying vec3 vW;', '#include <fog_pars_vertex>', 'void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;', '#include <fog_vertex>', '}'].join('\n'),
    fragmentShader: ['uniform float time; uniform vec3 sunDir; varying vec3 vW;', '#include <fog_pars_fragment>',
      'void main(){',
      ' vec2 p = vW.xz;',
      ' float a = sin(p.x*0.21 + time*0.9) + sin(p.y*0.17 - time*0.7) + sin((p.x+p.y)*0.43 + time*1.6)*0.5 + sin((p.x-p.y)*0.9 - time*2.1)*0.25;',
      ' vec3 n = normalize(vec3(cos(p.x*0.21+time*0.9)*0.08 + cos((p.x-p.y)*0.9-time*2.1)*0.06, 1.0, cos(p.y*0.17-time*0.7)*0.08 + cos((p.x+p.y)*0.43+time*1.6)*0.06));',
      ' vec3 v = normalize(cameraPosition - vW); vec3 r = reflect(-v, n);',
      ' float fr = pow(1.0 - max(0.0, dot(v, n)), 3.0);',
      ' vec3 deep = vec3(0.07,0.15,0.22), skyc = vec3(0.42,0.42,0.6);',
      ' vec3 c = mix(deep, skyc, 0.25 + fr * 0.6) + a * 0.012;',
      ' float g = pow(max(0.0, dot(r, sunDir)), 60.0); c += vec3(1.0,0.6,0.35) * g * 1.2;',
      ' c += vec3(1.0,0.7,0.45) * pow(max(0.0, dot(r, sunDir)), 6.0) * 0.18;',
      ' gl_FragColor = vec4(c, 1.0);',
      '#include <fog_fragment>',
      '}'].join('\n'),
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = -2.2; sea.frustumCulled = false;
  sea.onBeforeRender = (r, s, cam) => { const f = (cam.far || 1000) * 2; sea.scale.set(f, f, 1); sea.position.x = cam.position.x; sea.position.z = cam.position.z; sea.updateMatrixWorld(); };
  root.add(sea);

  // ----- the ground: cobbles everywhere, the Wain's road of granite setts with its two wheel-ways -----
  const B0 = LR_MAP.bounds;
  const gw = B0.x1 - B0.x0 + 10, gd = B0.z1 - B0.z0 + 10;
  const gtex = lrPaveTex('cobble', aniso).clone(); gtex.needsUpdate = true; gtex.repeat.set(gw / 2.2, gd / 2.2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), new THREE.MeshLambertMaterial({ map: gtex, color: 0xb8b0a4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((B0.x0 + B0.x1) / 2, 0, (B0.z0 + B0.z1) / 2); root.add(ground);
  const roadM = new THREE.MeshLambertMaterial({ map: lrPaveTex('setts', aniso), color: 0xd8d0c0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const road = new THREE.Mesh(lrStrip(0, 5.2, 0.012, 2.4), roadM); root.add(road);
  {
    const B = get('lit', null);
    for (const off of [-1.0, 1.0]) B.geo(lrStrip(off, 0.42, 0.03), 0x7e786c, new THREE.Matrix4());
    for (const off of [-2.75, 2.75]) B.geo(lrStrip(off, 0.32, 0.06), 0x6e6a62, new THREE.Matrix4());
  }

  let lightAt = new THREE.Vector3(101, 29.6, 0);
  const LT = { on: false, k: 0, glassM: null, lensM: null }, farLight = new THREE.Vector3(240, 30, -260);
  // ----- every box, by its kind -----
  const isMermaid = b => b[0] === 38 && b[2] === -2, isChand = b => b[0] === 12 && b[2] === 8, isCustoms = b => b[0] === -2 && b[2] === -30;
  LR_MAP.boxes.forEach((b, i) => {
    const k = b[6], cx = (b[0] + b[3]) / 2;
    if (k === 'wall') dressWall(b);
    else if (k === 'house') dressHouse(b, i);
    else if (k === 'shed') dressShed(b);
    else if (k === 'crate') dressCrates(b);
    else if (k === 'stall') dressStall(b, i);
    else if (k === 'hulk') dressHulk(b);
    else if (k === 'rock') dressRock(b);
    else if (k === 'tower') dressTower(b);
    else if (k === 'spawn') dressBoatHouseWall(b);
    else L(cx).box(b[0], b[1], b[2], b[3], b[4], b[5], P.stone);
  });

  // stone courses on a face, between u0..u1 and v0..v1
  function courses(B, F, u0, u1, v0, v1, base, jit, deep) {
    let v = v0;
    while (v < v1 - 0.05) {
      const h = Math.min(v1 - v, 0.42 + R() * 0.3); let u = u0;
      while (u < u1 - 0.02) { const l = Math.min(u1 - u, 0.8 + R() * 1.4); F.box(B, u + 0.025, u + l - 0.025, v + 0.025, v + h - 0.025, 0, (deep || 0.05) + R() * 0.05, lrJ(base, R, jit || 0.1)); u += l; }
      v += h;
    }
  }
  function lamp(B, Gb, x, y, z, s) {   // a lit lantern (its glass and its cap) at (x, y, z)
    s = s || 1;
    Gb.add('box', P.warm, x, y, z, 0, 0, 0, 0.22 * s, 0.3 * s, 0.22 * s);
    B.add('cone:4', P.iron, x, y + 0.24 * s, z, 0, Math.PI / 4, 0, 0.2 * s, 0.16 * s, 0.2 * s);
    B.add('box', P.iron, x, y - 0.17 * s, z, 0, 0, 0, 0.26 * s, 0.04 * s, 0.26 * s);
    halo(x, y, z, 0xffc070, 1.6 * s); lampT.push(halos.length - 1);
  }
  function lampPost(x, z, h, y0) {
    const B = L(x), Gb = G(x); h = h || 3.6; y0 = y0 || 0;
    B.add('cyl:6', P.iron, x, y0 + 0.2, z, 0, 0, 0, 0.16, 0.4, 0.16);
    B.add('cyl:6', P.iron, x, y0 + h / 2, z, 0, 0, 0, 0.06, h, 0.06);
    B.add('box', P.iron, x, y0 + h - 0.05, z, 0, 0, 0, 0.36, 0.06, 0.36);
    lamp(B, Gb, x, y0 + h + 0.2, z, 1.1);
  }
  function dressWall(b) {
    const cx = (b[0] + b[3]) / 2, north = b[5] <= -36, south = b[2] >= 36, west = b[3] <= -106, east = b[0] >= 111;
    // the wall itself (the mortar between the stones), from under the sea up
    const B = get('lit', null);
    if (north) {
      // the cliff: rough rock face, and the hill rising behind with the upper town on it
      for (let x = b[0]; x < b[3]; x += 6) {
        const w = 6.4, h = 6 + R() * 1.4;
        B.geo(lrLump(w, h, 5, R, 0.9, true, 2), P.rock, new THREE.Matrix4().makeTranslation(x + 3, h / 2 - 0.3, -38.8 + (R() - 0.5) * 0.6), (nx, ny) => ny > 0.6 ? lrJ(P.grass, R, 0.08) : lrJ(R() < 0.5 ? P.rock : P.rock2, R, 0.08));
      }
      return;
    }
    B.box(b[0], -3, b[2], b[3], b[4], b[5], 0x48443e);
    const side = south ? 0 : west ? 3 : 2;
    const F = lrFaceOf(b, side);
    // courses in 40 m runs, so each goes in its slice of the town
    for (let u = 0; u < F.len; u += 40) {
      const p = F.at(u + 20, 0), Bc = L(p[0]);
      courses(Bc, F, u, Math.min(F.len, u + 40), 0, b[4] - 0.4, P.granite, 0.12);
      F.box(Bc, u, Math.min(F.len, u + 40), b[4] - 0.4, b[4] + 0.1, 0, 0.3, 0xa8a398);   // the coping
      F.box(Bc, u, Math.min(F.len, u + 40), 0, 0.5, 0, 0.12, 0x5a564e);                    // the plinth, green-dark
    }
    // the outside of the sea wall, down to the sea, with weed at the waterline
    const Fo = lrFaceOf(b, side ^ 1);
    Fo.box(B, 0, Fo.len, -2.6, -1.2, 0, 0.1, P.weed);
    // the parapet on top, and lamps along it
    const Ft = F;
    for (let u = 2; u < Ft.len - 2; u += 2.4) Ft.box(B, u, u + 1.6, b[4] + 0.1, b[4] + 1.0, -2.2, -1.0, lrJ(P.granite, R, 0.1));
    for (let u = 10; u < Ft.len - 5; u += 22) { const p = Ft.at(u, -0.6); lampPost(p[0], p[1], 2.4, b[4] + 0.1); }
    if (south) {
      // bollards and a ladder or two on the quay side, nets hung to dry
      for (let u = 6; u < F.len; u += 9 + R() * 8) { const p = F.at(u, 0.3); const Bc = L(p[0]); Bc.add('box', 0x5a4a38, p[0], b[4] * 0.45, p[1], 0, 0, 0, 1.8, 2.2, 0.06); for (let j = 0; j < 4; j++) Bc.add('box', P.rope, p[0], 1.3 + j * 0.45, p[1] - 0.04, 0, 0, 0, 1.8, 0.03, 0.03); }
    }
  }
  function dressHouse(b, i) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, B = L(cx), Gb = G(cx);
    const white = isMermaid(b) || isChand(b) ? true : isCustoms(b) ? false : R() < 0.55;
    const wall = white ? lrJ(i % 2 ? P.white : P.cream, R, 0.04) : lrJ(P.stone, R, 0.06);
    const trim = white ? 0x7a7468 : 0xc8c0b0, shut = LRD_SHUT[i % LRD_SHUT.length];
    B.box(x0, 0, z0, x1, H - 0.02, z1, wall);
    if (!white) { // dressed stone: courses on every face
      for (let s = 0; s < 4; s++) { const F = lrFaceOf(b, s); courses(B, F, 0, F.len, 0.5, H - 1.6, P.stone, 0.12, 0.02); }
    }
    const floors = Math.max(1, Math.floor((H - 1.4) / 2.6));
    for (let s = 0; s < 4; s++) {
      const F = lrFaceOf(b, s);
      // the plinth, the corner stones, the string course
      F.box(B, -0.05, F.len + 0.05, 0, 0.55, 0, 0.1, 0x4c4842);
      if (white) for (let v = 0.55; v < H - 1.5; v += 0.5) { const q = (Math.round(v * 2) % 2) ? 0.5 : 0.8; F.box(B, -0.06, q, v, v + 0.46, 0, 0.07, lrJ(0x9a9488, R, 0.06)); F.box(B, F.len - q, F.len + 0.06, v, v + 0.46, 0, 0.07, lrJ(0x9a9488, R, 0.06)); }
      // the slates: a steep band of them all round the top floor, the walkable flat roof above (the leads)
      const sl = Math.min(1.5, H * 0.28), lean = 0.42, ang = Math.atan2(lean, sl);
      F.put(B, 'box', lrJ(P.slate, R, 0.05), F.len / 2, H - sl / 2, lean / 2, -ang, 0, F.len + lean * 2 + 0.1, Math.hypot(sl, lean), 0.12);
      for (let v = H - sl + 0.22; v < H - 0.1; v += 0.26) F.put(B, 'box', P.slate2, F.len / 2, v, lean * (H - v) / sl + 0.07, -ang, 0, F.len + lean * 2 * (H - v) / sl, 0.03, 0.03);
      F.box(B, -0.5, F.len + 0.5, H - sl - 0.2, H - sl, 0, lean + 0.15, white ? 0x6a645a : 0xb0a898);   // the eaves board
      // windows and doors, bay by bay
      const bays = Math.max(1, Math.floor(F.len / 3.4)), bw = F.len / bays;
      for (let j = 0; j < bays; j++) {
        const u = (j + 0.5) * bw;
        for (let f = 0; f < floors; f++) {
          const v = 0.95 + f * 2.6;
          if (v + 1.4 > H - sl - 0.25) break;
          if (f === 0 && R() < 0.3) { door(B, F, u, shut); continue; }
          win(B, Gb, F, u, v, 0.9, 1.3, R() < (f === 0 ? 0.35 : 0.5), trim, R() < 0.6 ? shut : 0);
        }
        // a dormer in the slates
        if (R() < 0.45 && sl > 1.1) {
          const v = H - sl + 0.25;
          F.box(B, u - 0.6, u + 0.6, v, v + 0.95, 0.1, 0.75, wall);
          F.put(B, 'box', P.slate, u, v + 1.02, 0.42, 0.25, 0, 1.45, 0.08, 0.85);
          F.box(R() < 0.55 ? Gb : B, u - 0.35, u + 0.35, v + 0.15, v + 0.8, 0.72, 0.8, R() < 0.55 ? P.warm : P.glassD);
        }
      }
    }
    // the leads: a flat roof with a low parapet, lead rolls, a hatch, chimney stacks at the corners
    const ri = 0.28;
    B.box(x0 + ri, H - 0.02, z0 + ri, x1 - ri, H, z1 - ri, lrJ(P.lead, R, 0.05));
    for (let x = x0 + 1.4; x < x1 - 0.6; x += 1.4) B.box(x - 0.04, H, z0 + ri, x + 0.04, H + 0.04, z1 - ri, 0x6a7076);
    B.box(x0, H - 0.1, z0, x1, H + 0.32, z0 + ri, trim); B.box(x0, H - 0.1, z1 - ri, x1, H + 0.32, z1, trim);
    B.box(x0, H - 0.1, z0, x0 + ri, H + 0.32, z1, trim); B.box(x1 - ri, H - 0.1, z0, x1, H + 0.32, z1, trim);
    const hx = x0 + (x1 - x0) * (0.3 + R() * 0.4), hz = z0 + (z1 - z0) * (0.3 + R() * 0.4);
    B.box(hx - 0.6, H, hz - 0.6, hx + 0.6, H + 0.12, hz + 0.6, P.timber);
    for (const [cxx, czz] of [[x0 + 0.4, z0 + 0.4], [x1 - 0.4, z1 - 0.4]]) {
      if (R() < 0.25) continue;
      B.box(cxx - 0.4, H - 0.5, czz - 0.4, cxx + 0.4, H + 1.5, czz + 0.4, white ? 0xb8b0a0 : P.stone);
      B.box(cxx - 0.48, H + 1.5, czz - 0.48, cxx + 0.48, H + 1.65, czz + 0.48, 0x5a5650);
      for (const o of [-0.18, 0.18]) B.add('cyl:6', 0x8a4a34, cxx + o, H + 1.85, czz, 0, 0, 0, 0.1, 0.4, 0.1);
    }
    // signs: the Mermaid's, the chandlery's, the customs house's flag
    if (isMermaid(b)) sign(B, Gb, lrFaceOf(b, 2), (z1 - z0) * 0.5, 3.4, 0x2f6a6a, 'mermaid');
    if (isChand(b)) sign(B, Gb, lrFaceOf(b, 0), (x1 - x0) * 0.35, 2.9, 0x6a3a22, 'anchor');
    if (isCustoms(b)) {
      const F = lrFaceOf(b, 1); const p = F.at(F.len / 2, 0.6);
      B.rod([p[0], H - 1.2, p[1]], [p[0], H + 3.4, p[1] + 1.4], 0.06, P.iron);
      B.add('box', P.blue, p[0] + 0.8, H + 2.9, p[1] + 1.2, 0, 0, 0.1, 1.6, 0.9, 0.04); B.add('box', P.gold, p[0] + 0.8, H + 2.9, p[1] + 1.22, 0, 0, 0.1, 1.6, 0.18, 0.05);
    }
  }
  function door(B, F, u, col) {
    F.box(B, u - 0.66, u + 0.66, 0, 2.35, 0, 0.08, 0x5a564e);
    F.box(B, u - 0.52, u + 0.52, 0, 2.15, 0.05, 0.12, lrJ(col, R, 0.08));
    F.box(B, u - 0.4, u + 0.4, 1.0, 1.04, 0.1, 0.14, 0x000000 + 0x2a2a2a);
    F.put(B, 'sph:6', P.brass, u + 0.36, 1.05, 0.15, 0, 0, 0.05);
    F.box(B, u - 0.8, u + 0.8, 0, 0.14, 0, 0.5, 0x6a665e);   // the step
  }
  function win(B, Gb, F, u, v, w, h, lit, frame, shut) {
    F.box(B, u - w / 2 - 0.1, u + w / 2 + 0.1, v - 0.1, v + h + 0.1, 0, 0.05, frame);
    if (lit) F.box(Gb, u - w / 2, u + w / 2, v, v + h, 0.03, 0.07, lrJ(P.warm, R, 0.12));
    else F.box(B, u - w / 2, u + w / 2, v, v + h, 0.03, 0.07, P.glassD);
    F.box(B, u - 0.03, u + 0.03, v, v + h, 0.05, 0.1, frame); F.box(B, u - w / 2, u + w / 2, v + h * 0.55 - 0.03, v + h * 0.55 + 0.03, 0.05, 0.1, frame);
    F.box(B, u - w / 2 - 0.16, u + w / 2 + 0.16, v - 0.2, v - 0.1, 0, 0.16, 0x9a9488);
    if (shut) { F.box(B, u - w / 2 - 0.1 - w * 0.5, u - w / 2 - 0.1, v - 0.04, v + h + 0.04, 0, 0.05, shut); F.box(B, u + w / 2 + 0.1, u + w / 2 + 0.1 + w * 0.5, v - 0.04, v + h + 0.04, 0, 0.05, shut); }
  }
  function sign(B, Gb, F, u, v, col, what) {
    const p0 = F.at(u, 0), p1 = F.at(u, 1.3);
    B.rod([p0[0], v + 0.9, p0[1]], [p1[0], v + 0.9, p1[1]], 0.04, P.iron);
    F.put(B, 'box', 0x2a2420, u, v, 0.85, 0, 0, 0.08, 1.0, 1.2);
    F.put(B, 'box', col, u, v, 0.85, 0, 0, 0.1, 0.84, 1.04);
    if (what === 'mermaid') { F.put(B, 'sph:6', P.gold, u, v + 0.12, 0.85, 0, 0, 0.12, 0.12, 0.2); F.put(B, 'cone:5', P.gold, u, v - 0.18, 0.85, Math.PI / 2, 0, 0.06, 0.35, 0.18); }
    else { F.put(B, 'box', P.gold, u, v, 0.85, 0, 0, 0.12, 0.6, 0.08); F.put(B, 'box', P.gold, u, v + 0.18, 0.85, 0, 0, 0.12, 0.08, 0.36); F.put(B, 'tor:10:0.2', P.gold, u, v - 0.22, 0.85, 0, Math.PI / 2, 0.2, 0.2, 0.2); }
    const lp = F.at(u - 0.9, 0.35); lamp(B, Gb, lp[0], v + 0.9, lp[1], 0.9);
  }
  function dressShed(b) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, B = L(cx), Gb = G(cx);
    B.box(x0, 0, z0, x1, H - 0.02, z1, P.tar);
    for (let s = 0; s < 4; s++) {
      const F = lrFaceOf(b, s);
      for (let u = 0.1; u < F.len - 0.1; u += 0.32) F.box(B, u, u + 0.28, 0.4, H - 0.35, 0, 0.04 + R() * 0.02, lrJ(0x2e2824, R, 0.06));
      F.box(B, -0.05, F.len + 0.05, 0, 0.45, 0, 0.1, 0x4a463e);
      F.box(B, -0.2, F.len + 0.2, H - 0.4, H, 0, 0.35, 0x3a2e26);   // the eaves
      // big doors on the long faces, a window or two
      if (F.len > 14) {
        const u = F.len * (0.3 + R() * 0.4), dw = Math.min(4.2, H * 0.8), dh = Math.min(H - 1, 3.6);
        F.box(B, u - dw / 2 - 0.15, u + dw / 2 + 0.15, 0, dh + 0.2, 0, 0.08, 0x8a7e6a);
        F.box(B, u - dw / 2, u, 0, dh, 0.06, 0.12, lrJ(0x5a3a2a, R, 0.05)); F.box(B, u, u + dw / 2, 0, dh, 0.06, 0.12, lrJ(0x5a3a2a, R, 0.05));
        for (const o of [-1, 1]) F.put(B, 'box', 0x8a7e6a, u + o * dw / 4, dh / 2, 0.13, 0, o * 0.9, 0.12, dh * 1.1, 0.04);
        const lp = F.at(u, 0.5); lamp(B, Gb, lp[0], dh + 0.6, lp[1], 0.8);
      }
      for (let u = 2; u < F.len - 1.5; u += 5.5) if (R() < 0.5 && H > 4.5) win(B, Gb, F, u, H - 2.2, 0.8, 0.9, R() < 0.4, 0x6a604e, 0);
    }
    // a tarred-felt roof with battens, a roof-light ridge down the middle
    B.box(x0 - 0.2, H - 0.02, z0 - 0.2, x1 + 0.2, H, z1 + 0.2, 0x2a2826);
    for (let x = x0 + 0.8; x < x1; x += 1.2) B.box(x - 0.05, H, z0 - 0.2, x + 0.05, H + 0.05, z1 + 0.2, 0x3a3632);
    const mz = (z0 + z1) / 2; B.box(x0 + 1.5, H, mz - 0.7, x1 - 1.5, H + 0.25, mz + 0.7, 0x4a5056); B.box(x0 + 1.6, H + 0.25, mz - 0.6, x1 - 1.6, H + 0.27, mz + 0.6, 0x6a7a88);
  }
  function dressCrates(b) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, B = L(cx);
    B.box(x0 + 0.1, 0, z0 + 0.1, x1 - 0.1, H - 0.05, z1 - 0.1, 0x2a221a);
    const nx = Math.max(1, Math.round((x1 - x0) / 1)), nz = Math.max(1, Math.round((z1 - z0) / 1)), cw = (x1 - x0) / nx, cd = (z1 - z0) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const ax = x0 + i * cw, az = z0 + j * cd, mx = ax + cw / 2, mz = az + cd / 2;
      const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      if (R() < 0.38 && edge) {
        // a barrel, standing, its lid level with the stack's top
        const r = Math.min(cw, cd) * 0.46, hb = H;
        B.add('cyl:10', lrJ(0x6a4a2e, R, 0.1), mx, hb / 2, mz, 0, 0, 0, r, hb, r);
        B.add('cyl:10', lrJ(0x7a5636, R, 0.1), mx, hb * 0.5, mz, 0, 0, 0, r * 1.06, hb * 0.6, r * 1.06);
        for (const y of [0.12, 0.5, 0.88]) B.add('cyl:10', P.iron, mx, hb * y, mz, 0, 0, 0, r * 1.08, 0.06, r * 1.08);
        B.add('cyl:10', 0x5a3e26, mx, hb - 0.01, mz, 0, 0, 0, r * 0.92, 0.03, r * 0.92);
      } else {
        // fish boxes, stacked, a little askew
        let y = 0; const tone = lrJ(R() < 0.5 ? 0x8a6a46 : 0x6a7a7a, R, 0.12);
        while (y < H - 0.05) {
          const h = Math.min(H - y, 0.3), a = (R() - 0.5) * 0.08;
          B.add('box', lrJ(tone, R, 0.06), mx, y + h / 2, mz, 0, a, 0, cw * 0.97, h - 0.02, cd * 0.97);
          B.add('box', 0x3a2c20, mx, y + h * 0.5, mz, 0, a, 0, cw * 0.99, 0.03, cd * 0.99);
          y += h;
        }
        if (R() < 0.5) B.add('box', 0xc8ccc8, mx, H + 0.005, mz, 0, R(), 0, cw * 0.6, 0.02, cd * 0.4);   // a scatter of ice and fish
      }
    }
    // a net and a coil of rope over the top
    B.box(x0 + 0.15, H - 0.01, z0 + 0.15, x0 + (x1 - x0) * 0.6, H + 0.03, z1 - 0.15, 0x4a5a4a);
    B.add('tor:12:0.3', P.rope, x1 - 0.5, H + 0.05, z1 - 0.5, Math.PI / 2, 0, 0, 0.3);
  }
  function dressStall(b, i) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, B = L(cx), Gb = G(cx);
    const stripe = i % 2 ? [0xc8463a, 0xe8e0d0] : [0x3d7fb8, 0xe8e0d0];
    B.box(x0, 0, z0, x1, H - 0.1, z1, 0x5a4230);
    for (let x = x0 + 0.15; x < x1; x += 0.3) B.box(x - 0.12, 0.05, z0 - 0.02, x + 0.12, H - 0.15, z0, lrJ(0x7a5a3a, R, 0.1));
    B.box(x0 - 0.1, H - 0.1, z0 - 0.1, x1 + 0.1, H, z1 + 0.1, 0x8a6a46);
    // trays of fish on ice
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.9) {
      B.box(x - 0.4, H, z0 + 0.2, x + 0.4, H + 0.06, z1 - 0.2, 0xd8dcd8);
      for (let k = 0; k < 4; k++) B.add('sph:5', R() < 0.5 ? 0x9aa8b0 : 0xb07a5a, x + (R() - 0.5) * 0.5, H + 0.08, z0 + 0.4 + R() * (z1 - z0 - 0.8), 0, R() * 3, 0, 0.18, 0.05, 0.06);
    }
    // posts and a striped awning, leaning to the front
    const top = H + 1.5;
    for (const [px, pz] of [[x0 + 0.08, z0 + 0.08], [x1 - 0.08, z0 + 0.08], [x0 + 0.08, z1 - 0.08], [x1 - 0.08, z1 - 0.08]]) B.add('box', 0x4a3626, px, (top + 0.2) / 2, pz, 0, 0, 0, 0.1, top + 0.2, 0.1);
    const n = 6, w = (x1 - x0 + 0.6) / n;
    for (let k = 0; k < n; k++) B.add('box', stripe[k % 2], x0 - 0.3 + w * (k + 0.5), top + 0.15, cz - 0.15, -0.18, 0, 0, w, 0.04, z1 - z0 + 1.0);
    for (let k = 0; k < n; k++) B.add('box', stripe[k % 2], x0 - 0.3 + w * (k + 0.5), top - 0.12, z0 - 0.62, 0, 0, 0, w, 0.36, 0.03);
    lamp(B, Gb, cx, top - 0.35, cz, 0.7);
  }
  function dressHulk(b) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (z1 - z0) / 2, B = L(cx);
    // the hull: stations from the bow (west) to her transom (east), planked in strakes, tarred, a rust-red band
    const NS = 14, NV = 6, hwAt = (f, y) => { const bow = f < 0.32 ? Math.pow(Math.sin(f / 0.32 * Math.PI / 2), 0.75) : 1, st = f > 0.92 ? 0.96 : 1; return Math.max(0.05, hw * bow * st * (0.72 + 0.28 * Math.pow(y / H, 0.6))); };
    const pos = [];
    for (let i = 0; i < NS; i++) for (let j = 0; j < NV; j++) {
      const fa = i / NS, fb = (i + 1) / NS, ya = -0.6 + (H + 0.6) * j / NV, yb = -0.6 + (H + 0.6) * (j + 1) / NV;
      const xa = x0 + (x1 - x0) * fa, xb = x0 + (x1 - x0) * fb;
      for (const s of [-1, 1]) {
        const A = [xa, ya, cz + s * hwAt(fa, Math.max(0, ya))], Bq = [xb, ya, cz + s * hwAt(fb, Math.max(0, ya))], C = [xb, yb, cz + s * hwAt(fb, yb)], D = [xa, yb, cz + s * hwAt(fa, yb)];
        const col = j === NV - 2 ? 0x8a3a2a : j < 2 ? 0x2a3422 : lrJ(j % 2 ? 0x2a2420 : 0x34302a, R, 0.04);
        pos.push([s > 0 ? [A, Bq, C, D] : [A, D, C, Bq], col]);
      }
    }
    for (const [q, col] of pos) {
      const g = new THREE.BufferGeometry(); const a = [];
      for (const k of [0, 1, 2, 0, 2, 3]) a.push(...q[k]);
      g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); g.computeVertexNormals();
      B.geo(g, col, new THREE.Matrix4());
    }
    // the transom
    B.box(x1 - 0.3, -0.5, cz - hw * 0.96, x1, H, cz + hw * 0.96, 0x2e2a24);
    B.box(x1 - 0.32, H - 1.2, cz - hw * 0.8, x1 + 0.02, H - 0.9, cz + hw * 0.8, 0x8a3a2a);
    // the deck, planked fore and aft, the rail along her sides
    for (let z = z0 + 0.1; z < z1 - 0.1; z += 0.36) {
      const off = Math.abs(z + 0.18 - cz); let xs = x0; for (let f = 0; f <= 1; f += 0.01) if (hwAt(f, H) > off + 0.1) { xs = x0 + (x1 - x0) * f; break; }
      B.box(xs, H - 0.06, z, x1 - 0.3, H, z + 0.33, lrJ(0x7a6448, R, 0.1));
    }
    for (let i = 0; i < NS; i++) for (const s of [-1, 1]) {
      const fa = i / NS, fb = (i + 1) / NS, xa = x0 + (x1 - x0) * fa, xb = x0 + (x1 - x0) * fb;
      B.rod([xa, H + 0.55, cz + s * (hwAt(fa, H) - 0.05)], [xb, H + 0.55, cz + s * (hwAt(fb, H) - 0.05)], 0.07, 0x3a2e24, 4);
      B.rod([xb, H, cz + s * (hwAt(fb, H) - 0.05)], [xb, H + 0.55, cz + s * (hwAt(fb, H) - 0.05)], 0.05, 0x3a2e24, 4);
    }
    // a hatch, the stump of her mast, a capstan, coils
    B.box(cx - 1.5, H, cz - 1.2, cx + 1.5, H + 0.25, cz + 1.2, 0x4a3a2a); B.box(cx - 1.3, H + 0.25, cz - 1.0, cx + 1.3, H + 0.27, cz + 1.0, 0x1a1612);
    B.add('cyl:8', 0x5a4632, cx - 4, H + 0.6, cz, 0, 0, 0.05, 0.3, 1.2, 0.3);
    B.add('cyl:8:0.8', 0x5a4a3a, x1 - 3, H + 0.4, cz, 0, 0, 0, 0.45, 0.8, 0.45);
    B.add('tor:12:0.35', P.rope, x1 - 3, H + 0.06, cz + 3, Math.PI / 2, 0, 0, 0.5);
    // shingle heaped round her
    for (let x = x0 - 1; x < x1 + 1; x += 2.2) for (const s of [-1, 1]) B.add('ico', lrJ(P.sand, R, 0.1), x + R(), 0, cz + s * (hw + 0.2 - R() * 0.6), 0, R() * 3, 0, 1.4, 0.45, 0.9);
    // ribs of an older wreck, beside her, picked clean
    for (let k = 0; k < 5; k++) { const x = x0 - 5 + k * 1.1; for (const s of [-1, 1]) B.rod([x, 0, -29], [x, 1.6 - k * 0.15, -29 + s * 1.6], 0.09, 0x6a5a48, 4); }
  }
  function dressRock(b) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, B = L(cx);
    B.geo(lrLump(x1 - x0 + 0.4, H + 0.4, z1 - z0 + 0.4, R, 0.5, true, 1.6), P.rock, new THREE.Matrix4().makeTranslation(cx, (H + 0.4) / 2 - 0.4, cz),
      (nx, ny) => ny > 0.75 ? lrJ(ny > 0.95 ? P.grass : P.heather, R, 0.06) : lrJ(R() < 0.5 ? P.rock : P.rock2, R, 0.1));
    for (let k = 0; k < 6; k++) B.add('dod', lrJ(P.rock2, R, 0.1), x0 + R() * (x1 - x0), 0.2, R() < 0.5 ? z0 - 0.3 : z1 + 0.3, R(), R(), R(), 0.5 + R() * 0.5);
  }
  function dressBoatHouseWall(b) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, B = L(cx);
    B.box(x0, 0, z0, x1, H, z1, 0x5a564e);
    for (let s = 0; s < 4; s++) { const F = lrFaceOf(b, s); if (F.len < 1) continue; courses(B, F, 0, F.len, 0, H - 0.3, P.granite, 0.1, 0.03); F.box(B, -0.02, F.len + 0.02, H - 0.3, H, 0, 0.12, 0x3d7fb8); }
  }
  function dressTower(b) {
    const [x0, , z0, x1, H, z1] = b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, B = L(cx), Gb = G(cx);
    // the keeper's base, square, granite, a blue door facing the road
    const base = 3.2;
    B.box(x0, 0, z0, x1, base, z1, 0x8a867c);
    for (let s = 0; s < 4; s++) { const F = lrFaceOf(b, s); courses(B, F, 0, F.len, 0, base - 0.3, P.granite, 0.1, 0.04); F.box(B, -0.1, F.len + 0.1, base - 0.3, base, 0, 0.25, 0xb0ab9e); }
    const Fw = lrFaceOf(b, 2); door(B, Fw, Fw.len / 2, P.blue); lamp(B, Gb, x0 - 0.3, 2.7, cz - 1.2, 0.8); lamp(B, Gb, x0 - 0.3, 2.7, cz + 1.2, 0.8);
    // the tower, round and tapering, in bands of white and red
    const r0 = 4.6, r1 = 3.3, top = 27, bands = 6;
    for (let k = 0; k < bands; k++) {
      const ya = base + (top - base) * k / bands, yb = base + (top - base) * (k + 1) / bands, ra = r0 + (r1 - r0) * k / bands, rb = r0 + (r1 - r0) * (k + 1) / bands;
      B.add('cyl:20:' + (rb / ra).toFixed(3), k % 2 ? 0xb8402e : 0xe8e4dc, cx, (ya + yb) / 2, cz, 0, 0, 0, ra, yb - ya, ra);
    }
    // small windows climbing round it
    for (let k = 0; k < 7; k++) {
      const y = base + 2.5 + k * 3.2, a = k * 1.1 + 2.2, r = r0 + (r1 - r0) * (y - base) / (top - base);
      B.add('box', 0x2a2622, cx + Math.sin(a) * r, y, cz + Math.cos(a) * r, 0, a, 0, 0.7, 1.1, 0.2);
      (k % 2 ? Gb : B).add('box', k % 2 ? P.warm : P.glassD, cx + Math.sin(a) * (r + 0.05), y, cz + Math.cos(a) * (r + 0.05), 0, a, 0, 0.5, 0.85, 0.14);
    }
    // the gallery, its railing, the lamp room, the dome
    B.add('cyl:20', 0x2a2a2c, cx, top + 0.2, cz, 0, 0, 0, r1 + 1.0, 0.4, r1 + 1.0);
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; B.add('box', 0x1e1e20, cx + Math.sin(a) * (r1 + 0.9), top + 0.9, cz + Math.cos(a) * (r1 + 0.9), 0, a, 0, 0.06, 1.0, 0.06); }
    B.add('tor:28:0.025', 0x1e1e20, cx, top + 1.4, cz, Math.PI / 2, 0, 0, r1 + 0.9);
    B.add('cyl:10', 0x2a2a2c, cx, top + 0.8, cz, 0, 0, 0, 2.5, 0.8, 2.5);
    for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * Math.PI * 2; B.add('box', 0x1a1a1c, cx + Math.sin(a) * 2.45, top + 2.6, cz + Math.cos(a) * 2.45, 0, a, 0, 0.1, 3.0, 0.1); }
    B.add('cyl:10', 0x1a1a1c, cx, top + 4.15, cz, 0, 0, 0, 2.6, 0.3, 2.6);
    B.add('cone:10', 0x3a5a50, cx, top + 5.1, cz, 0, 0, 0, 2.7, 1.7, 2.7);
    B.add('sph:8', P.brass, cx, top + 6.1, cz, 0, 0, 0, 0.3); B.add('cyl:4', 0x1a1a1c, cx, top + 6.8, cz, 0, 0, 0, 0.04, 1.2, 0.04);
    B.add('box', 0x1a1a1c, cx, top + 7.1, cz, 0, 0.6, 0, 1.0, 0.04, 0.04); B.add('cone:4', 0x1a1a1c, cx + 0.5, top + 7.1, cz - 0.33, 0, 0.6, -Math.PI / 2, 0.12, 0.3, 0.05);
    // the glass and the great lens inside it: dark until the Wain comes home
    lightAt = new THREE.Vector3(cx, top + 2.6, cz);
    const glassM = new THREE.MeshLambertMaterial({ color: 0x2a3440, emissive: 0x000000, transparent: true, opacity: 0.55 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 2.9, 10, 1, true), glassM); glass.position.copy(lightAt); root.add(glass);
    const lensM = new THREE.MeshBasicMaterial({ color: 0x3a3428 });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.0, 12), lensM); lens.position.copy(lightAt); root.add(lens);
    LT.glassM = glassM; LT.lensM = lensM;
  }

  // ----- the ramps: stone steps, or a gangway up onto the hulk -----
  LR_MAP.ramps.forEach(rp => {
    const [x0, z0, x1, z1, h0, h1, ax] = rp, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, B = L(cx);
    const hi = Math.max(h0, h1), along = ax === 'x' ? x1 - x0 : z1 - z0, rising = h1 > h0 ? 1 : -1;
    const toHulk = Math.abs(hi - 3) < 0.01 && x0 === 62;
    const pt = (f, g) => ax === 'x' ? [x0 + (x1 - x0) * f, z0 + (z1 - z0) * g] : [x0 + (x1 - x0) * g, z0 + (z1 - z0) * f];
    const hAt = f => h0 + (h1 - h0) * f;
    if (toHulk) {
      // a gangway of planks on trestles, with a rope rail
      const ang = Math.atan2(h0 - h1, along);
      for (let g = 0.25; g < 0.8; g += 0.09) {
        const a = pt(0, g), c = pt(1, g);
        B.rod([a[0], h0 - 0.05, a[1]], [c[0], h1 - 0.05, c[1]], 0.06, lrJ(0x7a6448, R, 0.1), 4);
      }
      for (let f = 0.05; f < 1; f += 0.15) { const a = pt(f, 0.25), c = pt(f, 0.75); B.rod([a[0], hAt(f), a[1]], [c[0], hAt(f), c[1]], 0.04, 0x4a3a2a, 4); }
      for (const f of [0.3, 0.7]) { const a = pt(f, 0.3), c = pt(f, 0.7); B.rod([a[0], 0, a[1]], [a[0], hAt(f), a[1]], 0.08, 0x4a3a2a, 4); B.rod([c[0], 0, c[1]], [c[0], hAt(f), c[1]], 0.08, 0x4a3a2a, 4); }
      for (const g of [0.22, 0.78]) { const a = pt(0, g), c = pt(1, g); B.rod([a[0], h0 + 0.9, a[1]], [c[0], h1 + 0.9, c[1]], 0.03, P.rope, 4); for (let f = 0; f <= 1; f += 0.33) { const p = pt(f, g); B.rod([p[0], hAt(f), p[1]], [p[0], hAt(f) + 0.95, p[1]], 0.04, 0x4a3a2a, 4); } }
      return;
    }
    const n = Math.max(2, Math.ceil(hi / 0.3));
    for (let k = 0; k < n; k++) {
      const fa = k / n, fb = (k + 1) / n, top = hAt((fa + fb) / 2) + hi / n / 2;
      const a = pt(fa, 0), c = pt(fb, 1);
      B.box(Math.min(a[0], c[0]), 0, Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(0.05, top), Math.max(a[1], c[1]), lrJ(P.granite, R, 0.1));
      const e = pt(h1 > h0 ? fa : fb, 0), e2 = pt(h1 > h0 ? fa : fb, 1);
      B.box(Math.min(e[0], e2[0]) - 0.04, top - 0.08, Math.min(e[1], e2[1]) - 0.04, Math.max(e[0], e2[0]) + 0.04, top + 0.01, Math.max(e[1], e2[1]) + 0.04, 0xb0aa9c);
    }
    // the cheek walls each side and an iron handrail
    for (const g of [0, 1]) {
      const a = pt(0, g), c = pt(1, g), o = (g ? 1 : -1) * 0.18;
      const ofs = p => ax === 'x' ? [p[0], p[1] + o] : [p[0] + o, p[1]];
      const A = ofs(a), C = ofs(c);
      for (let k = 0; k < n; k++) { const fa = k / n, fb = (k + 1) / n, pa = ofs(pt(fa, g)), pb = ofs(pt(fb, g)), top = Math.max(hAt(fa), hAt(fb)) + 0.35; B.box(Math.min(pa[0], pb[0]) - 0.18, 0, Math.min(pa[1], pb[1]) - 0.18, Math.max(pa[0], pb[0]) + 0.18, top, Math.max(pa[1], pb[1]) + 0.18, lrJ(P.stone, R, 0.06)); }
      if (g) { B.rod([A[0], h0 + 1.3, A[1]], [C[0], h1 + 1.3, C[1]], 0.035, P.iron, 5); for (let f = 0; f <= 1.001; f += 0.25) { const p = ofs(pt(f, g)); B.rod([p[0], hAt(f) + 0.35, p[1]], [p[0], hAt(f) + 1.3, p[1]], 0.03, P.iron, 4); } }
    }
  });

  // ----- lamps along the road, the checkpoints -----
  const len = lrPathLen();
  for (let s = 8, k = 0; s < len - 6; s += 15, k++) {
    const p = lrPathAt(s), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = -fz, rz = fx, side = k % 2 ? 1 : -1;
    let x = p.x + rx * 3.4 * side, z = p.z + rz * 3.4 * side;
    if (lrInSolid(x, z, 0.4)) { x = p.x - rx * 3.4 * side; z = p.z - rz * 3.4 * side; }
    if (lrInSolid(x, z, 0.4) || lrRoadDist(x, z) < 2.9) continue;
    lampPost(x, z);
  }
  const CPS = [];
  LR_MAP.cps.forEach((f, i) => {
    const s = f * len, p = lrPathAt(s), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = -fz, rz = fx, B = L(p.x), last = i === LR_MAP.cps.length - 1;
    // a gold line across the road, and two granite posts with a lamp each, lit when the Wain has passed
    B.add('box', P.gold, p.x, 0.04, p.z, 0, p.yaw, 0, 5.4, 0.03, 0.35);
    const lampM = new THREE.MeshBasicMaterial({ color: 0x4a4030 }), lamps = [];
    for (const sd of [-1, 1]) {
      const x = p.x + rx * 3.3 * sd, z = p.z + rz * 3.3 * sd;
      B.add('box', 0x9a958a, x, 0.9, z, 0, p.yaw, 0, 0.6, 1.8, 0.6); B.add('box', 0xb0ab9e, x, 1.85, z, 0, p.yaw, 0, 0.75, 0.15, 0.75);
      B.add('box', 0x3d7fb8, x, 1.2, z, 0, p.yaw, 0, 0.62, 0.3, 0.62);
      B.add('cyl:6', P.iron, x, 2.5, z, 0, 0, 0, 0.05, 1.3, 0.05);
      const lm = new THREE.Mesh(lrProto('box'), lampM); lm.position.set(x, 3.3, z); lm.scale.set(0.34, 0.42, 0.34); root.add(lm); lamps.push(lm);
      B.add('cone:4', P.iron, x, 3.62, z, 0, Math.PI / 4, 0, 0.3, 0.22, 0.3);
    }
    if (last) {
      // the end of the road: a granite apron with the compass of the Light inlaid, where the lens goes up
      B.add('cyl:24', 0xa8a294, p.x, 0.03, p.z, 0, 0, 0, 3.6, 0.06, 3.6);
      B.add('tor:24:0.06', P.gold, p.x, 0.07, p.z, Math.PI / 2, 0, 0, 3.0);
      for (let k = 0; k < 8; k++) B.add('box', k % 2 ? P.gold : P.blue, p.x + Math.sin(k * Math.PI / 4) * 1.4, 0.07, p.z + Math.cos(k * Math.PI / 4) * 1.4, 0, k * Math.PI / 4, 0, k % 2 ? 0.12 : 0.24, 0.02, k % 2 ? 1.6 : 2.6);
    }
    CPS.push({ s, mat: lampM, lit: false });
  });

  // ----- the spawns: the Lamplighters' tidy keeper's look, the Wreckers' tarred camp -----
  // the boat house itself (its walls are boxes): a timber roof frame open to the sky, a lifeboat, the doors pinned back
  {
    const B = L(-97), Gb = G(-97);
    for (let x = -105; x <= -89; x += 3.2) {
      B.box(x - 0.15, 4.7, -11.5, x + 0.15, 5.0, 11.5, 0x5a4230);
      B.rod([x, 5.0, -11.5], [x, 7.6, 0], 0.13, 0x5a4230, 4); B.rod([x, 5.0, 11.5], [x, 7.6, 0], 0.13, 0x5a4230, 4);
      B.rod([x, 5.0, 0], [x, 7.6, 0], 0.08, 0x5a4230, 4);
    }
    B.box(-105.5, 7.5, -0.15, -88.5, 7.8, 0.15, 0x5a4230);
    // the doors, blue, pinned back against the east wall
    for (const s of [-1, 1]) { B.box(-88, 0, s * 4 - 0.1 * s, -87.8, 4.2, s * 4 + 3.6 * s, 0x2f6a9a); B.box(-87.82, 1.9, s * 4 + 0.2 * s, -87.75, 2.1, s * 4 + 3.4 * s, P.gold); }
    // over the opening: a board with the Lamplighters' lamp on it
    B.box(-88.1, 4.2, -4, -87.7, 5.6, 4, 0x2a4a6a); B.box(-87.72, 4.4, -3.6, -87.66, 5.4, 3.6, 0x3d7fb8);
    B.add('cyl:8', P.gold, -87.6, 4.9, 0, 0, 0, Math.PI / 2, 0.35, 0.06, 0.35); B.add('cone:8', P.gold, -87.6, 5.35, 0, 0, 0, -Math.PI / 2, 0.3, 0.12, 0.3);
    for (const z of [-2.6, 2.6]) lamp(B, Gb, -87.3, 4.6, z, 0.9);
    // the lifeboat on her carriage by the north wall, oars racked, lamps on a shelf, cans of oil in a row
    const bz = -7.5;
    B.add('hemi:16', 0x2f6a9a, -97.5, 2.1, bz, Math.PI, 0, 0, 5.6, 1.1, 1.35);
    B.add('hemi:16', 0xe8e4dc, -97.5, 2.12, bz, Math.PI, 0, 0, 5.62, 0.35, 1.37);
    B.add('tor:24:0.05', P.gold, -97.5, 2.12, bz, Math.PI / 2, 0, 0, 5.6, 1.35, 1);
    for (let k = -2; k <= 2; k++) B.add('box', 0x8a6a46, -97.5 + k * 1.6, 1.9, bz, 0, 0, 0, 0.25, 0.06, 2.4 * Math.cos(k / 3));
    B.box(-102, 0, bz - 0.6, -93, 1.05, bz + 0.6, 0x4a3626); for (let x = -105.6; x < -88.4; x += 0.5) B.box(x, 0, -9.9, x + 0.47, 0.03, 9.9, lrJ(0x6a5038, R, 0.12));
    for (let k = 0; k < 8; k++) B.rod([-104 + k * 0.3, 0.2, 10.8], [-104 + k * 0.3 + 0.4, 4, 10.8], 0.05, 0xb09a70, 4);
    B.box(-100, 2.6, 9.6, -92, 2.7, 10, 0x6a5038);
    for (let k = 0; k < 6; k++) lamp(B, Gb, -99.3 + k * 1.3, 2.95, 9.8, 0.6);
    for (let k = 0; k < 7; k++) { B.add('cyl:8', 0xb08a3a, -101 + k * 0.7, 0.3, 9.2, 0, 0, 0, 0.22, 0.6, 0.22); B.add('cyl:6', 0x8a6a2a, -101 + k * 0.7, 0.68, 9.2, 0, 0, 0, 0.05, 0.16, 0.05); }
    // bunting, gold and blue, across the roof frame
    for (let k = 0; k < 14; k++) { const x = -104.5 + k * 1.2, y = 6.2 - Math.sin(k / 13 * Math.PI) * 0.6; B.add('cone:3', k % 2 ? P.gold : P.blue, x, y, 0, Math.PI, 0, 0, 0.3, 0.5, 0.05); }
    // a slipway out to the sea behind it
    for (let x = -112; x > -125; x -= 1.2) B.box(x - 0.55, -2.4 - (-112 - x) * 0.05, -2.5, x + 0.55, -2.2 - (-112 - x) * 0.05, 2.5, lrJ(0x6a5a48, R, 0.1));
  }
  const keeper = (x, z, yaw) => {
    const B = L(x), Gb = G(x);
    // a painted compass rose on the ground, a lamp on a pole, a blue-and-gold pennant
    B.add('cyl:16', 0x2f5a80, x, 0.02, z, 0, 0, 0, 2.2, 0.03, 2.2);
    B.add('tor:16:0.05', P.gold, x, 0.04, z, Math.PI / 2, 0, 0, 2.0);
    for (let k = 0; k < 4; k++) B.add('box', P.gold, x, 0.045, z, 0, k * Math.PI / 4, 0, 0.18, 0.02, 3.6);
    const px = x + Math.cos(yaw) * 2.6, pz = z - Math.sin(yaw) * 2.6;
    if (!lrInSolid(px, pz, 0.3)) {
      B.add('cyl:6', P.iron, px, 2.2, pz, 0, 0, 0, 0.06, 4.4, 0.06);
      B.add('box', P.blue, px, 3.9, pz + 0.75, 0, 0, 0, 0.04, 0.7, 1.4); B.add('box', P.gold, px, 3.9, pz + 0.75, 0, 0, 0, 0.05, 0.16, 1.4);
      lamp(B, Gb, px, 4.6, pz, 0.9);
    }
  };
  const wreckers = (x, z, yaw) => {
    const B = L(x), Gb = G(x);
    // a lean-to of tarred canvas on driftwood poles, a brazier, a false light on a pole (the wreckers' lure), barrels
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
    const bx = x - fx * 3, bz = z - fz * 3;
    for (const s of [-1, 1]) { const px = bx + rx * 2 * s, pz = bz + rz * 2 * s; B.rod([px, 0, pz], [px - fx * 0.3, 2.6, pz - fz * 0.3], 0.07, 0x5a4a3a, 5); }
    for (let k = 0; k < 6; k++) { const o = -1.8 + k * 0.72; B.rod([bx + rx * o - fx * 0.3, 2.6, bz + rz * o - fz * 0.3], [bx + rx * o - fx * 2.3, 0.1, bz + rz * o - fz * 2.3], 0.38, lrJ(P.tar, R, 0.05), 4); }
    B.add('cyl:8:1.3', P.iron, x + rx * 2.3, 0.5, z + rz * 2.3, 0, 0, 0, 0.35, 0.9, 0.35);
    Gb.add('cone:6', 0xff7a30, x + rx * 2.3, 1.15, z + rz * 2.3, 0, 0, 0, 0.28, 0.5, 0.28); halo(x + rx * 2.3, 1.3, z + rz * 2.3, 0xff6a30, 2.6); lampT.push(halos.length - 1);
    B.add('cyl:12', 0x1a1614, x, 0.02, z, 0, 0, 0, 2.0, 0.03, 2.0);
    B.add('tor:16:0.05', P.rust, x, 0.04, z, Math.PI / 2, 0, 0, 1.9);
    const px = x - rx * 2.5, pz = z - rz * 2.5;
    B.rod([px, 0, pz], [px, 4.6, pz], 0.07, 0x4a3a2a, 5);
    B.add('box', P.rust, px, 4.1, pz + 0.7, 0, 0, 0.1, 0.04, 0.6, 1.3);
    Gb.add('box', 0xff5a3a, px, 4.75, pz, 0, 0.4, 0, 0.25, 0.32, 0.25); B.add('cone:4', P.iron, px, 5.0, pz, 0, Math.PI / 4, 0, 0.22, 0.16, 0.22); halo(px, 4.75, pz, 0xff4a2a, 2.2); lampT.push(halos.length - 1);
    for (let k = 0; k < 3; k++) { const ox = bx + rx * (k - 1) * 0.8 - fx * 1.4, oz = bz + rz * (k - 1) * 0.8 - fz * 1.4; B.add('cyl:8', 0x3a2a1e, ox, 0.5, oz, 0, 0, 0, 0.32, 1.0, 0.32); B.add('cyl:8', P.rust, ox, 0.5, oz, 0, 0, 0, 0.335, 0.12, 0.335); }
  };
  const seen = new Set();
  for (const [x, z, yaw] of LR_MAP.spawns.a) { const k = x + ',' + z; if (seen.has(k) || x < -88) continue; seen.add(k); keeper(x, z, yaw); }
  for (const [x, z, yaw] of LR_MAP.spawns.d) { const k = x + ',' + z; if (seen.has(k)) continue; seen.add(k); wreckers(x, z, yaw); }

  // ----- beyond the walls: the upper town on the hill, boats in the harbour, the skerries -----
  {
    const B = get('lit', null), Gb = get('glow', null);
    // the hill behind the north cliff
    const hill = new THREE.PlaneGeometry(340, 120, 34, 12).toNonIndexed(); hill.rotateX(-Math.PI / 2);
    const hp = hill.attributes.position;
    const hillL = (x, zl) => 6 + (60 - zl) * 0.2 + Math.pow(Math.max(0, 50 - zl), 1.3) * 0.04 + (Math.sin(x * 0.07) * 1.4 + Math.sin(x * 0.19 + zl * 0.1) * 0.8) * Math.min(1, (60 - zl) / 8);
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), z = hp.getZ(i); hp.setXYZ(i, x, hillL(x, z), z); }
    hill.computeVertexNormals();
    B.geo(hill, P.grass, new THREE.Matrix4().makeTranslation(0, 0, -98), (nx, ny) => ny > 0.9 ? lrJ(R() < 0.85 ? P.grass : 0x5a6040, R, 0.05) : lrJ(R() < 0.25 ? P.heather : 0x56603c, R, 0.05));
    const hillY = (x, z) => hillL(x, z + 98);
    for (let k = 0; k < 46; k++) {
      const x = -140 + R() * 280, z = -44 - R() * 55, y = hillY(x, z) - 0.3, w = 5 + R() * 4, d = 4 + R() * 2, h = 3 + R() * 2, a = (R() - 0.5) * 0.3;
      const col = R() < 0.6 ? lrJ(P.white, R, 0.08) : lrJ(P.stone, R, 0.08);
      B.add('box', col, x, y + h / 2, z, 0, a, 0, w, h, d);
      const roofG = lrProto('cyl:3');
      B.add(roofG, lrJ(P.slate, R, 0.08), x, y + h + 0.9, z, -Math.PI / 2, a, Math.PI / 2, 1.9 * d / 3.4, w + 0.4, 1.9 * d / 3.4);
      for (let j = 0; j < 3; j++) { const u = (j - 1) * w * 0.3; (R() < 0.55 ? Gb : B).add('box', R() < 0.55 ? P.warm : P.glassD, x + Math.cos(a) * u + Math.sin(a) * (d / 2 + 0.02), y + 1.6, z - Math.sin(a) * u + Math.cos(a) * (d / 2 + 0.02), 0, a, 0, 0.7, 0.9, 0.06); }
      if (R() < 0.5) B.add('box', 0x9a948a, x + Math.cos(a) * w * 0.4, y + h + 1.6, z, 0, a, 0, 0.6, 1.4, 0.6);
    }
    // a chapel on the brow, its tower
    const chX = -20, chZ = -86, chY = hillY(chX, chZ) - 0.3;
    B.add('box', 0x9a948a, chX, chY + 3, chZ, 0, 0, 0, 12, 6, 7); B.add(lrProto('cyl:3'), P.slate, chX, chY + 7.3, chZ, -Math.PI / 2, 0, Math.PI / 2, 3.9, 12.4, 3.9);
    B.add('box', 0x8a847a, chX - 7, chY + 7, chZ, 0, 0, 0, 3.4, 14, 3.4); B.add('cone:4', P.slate, chX - 7, chY + 16, chZ, 0, Math.PI / 4, 0, 2.7, 4, 2.7);
    Gb.add('box', P.warm, chX - 7, chY + 11, chZ + 1.72, 0, 0, 0, 0.6, 1.4, 0.05);
    // boats in the harbour to the south, riding at their moorings
    for (let k = 0; k < 11; k++) {
      const x = -95 + k * 19 + (R() - 0.5) * 8, z = 50 + R() * 40, a = R() * Math.PI * 2, L0 = 7 + R() * 6, Wd = L0 * 0.32;
      const ca = Math.cos(a), sa = Math.sin(a);
      const hullc = [0x2a4a6a, 0x6a2a24, 0x2a2a2a, 0xd8d2c4, 0x2f5a4a][k % 5];
      B.add('box', hullc, x, -1.6, z, 0, a, 0, Wd, 1.4, L0 * 0.78);
      B.add('cyl:3', hullc, x - sa * L0 * 0.45, -1.6, z - ca * L0 * 0.45, Math.PI / 2, a, 0, Wd * 0.58, L0 * 0.25, Wd * 0.4);
      B.add('box', 0xd8d0b8, x, -0.85, z, 0, a, 0, Wd * 1.02, 0.12, L0 * 0.8);
      B.add('cyl:5', 0x5a4632, x - sa * 0.5, 3.2, z - ca * 0.5, 0, 0, 0, 0.1, 8 + R() * 3, 0.1);
      B.add('cyl:5', 0xc8bca0, x + sa * 1.2, 0.0, z + ca * 1.2, Math.PI / 2 - 0.08, a, 0, 0.25, L0 * 0.55, 0.25);
      if (R() < 0.6) { Gb.add('box', P.warm, x - sa * 0.5, 7, z - ca * 0.5, 0, 0, 0, 0.18, 0.24, 0.18); halo(x - sa * 0.5, 7, z - ca * 0.5, 0xffd080, 2.2); }
    }
    // the skerries and the far islands
    for (let k = 0; k < 22; k++) {
      const a = R() * Math.PI * 2, d = 170 + R() * 330, x = Math.cos(a) * d * 1.3 + 5, z = Math.sin(a) * d;
      if (Math.abs(z) < 60 && Math.abs(x) < 160) continue;
      const w = 12 + R() * 40, h = 3 + R() * (d > 300 ? 28 : 12), dd = 10 + R() * 30;
      B.geo(lrLump(w, h, dd, R, Math.min(4, w * 0.12), false, Math.max(3, w / 4)), P.rock, new THREE.Matrix4().makeRotationY(R() * 3).setPosition(x, h / 2 - 2.6, z), (nx, ny) => ny > 0.8 ? lrJ(P.grass, R, 0.08) : lrJ(R() < 0.5 ? P.rock : P.rock2, R, 0.12));
      if (R() < 0.35) { B.add('box', P.white, x, h - 1.6, z, 0, R() * 3, 0, 4, 3, 3.2); Gb.add('box', P.warm, x, h - 1.6, z + 1.62, 0, 0, 0, 0.6, 0.7, 0.05); halo(x, h - 1.6, z + 1.7, 0xffc070, 3); }
    }
    // a far lighthouse on a skerry to the north-east, blinking
    farLight.set(240, 30, -260);
    B.geo(lrLump(40, 14, 30, R, 3, true, 6), P.rock, new THREE.Matrix4().makeTranslation(240, 4.4, -260), (nx, ny) => ny > 0.8 ? lrJ(P.grass, R, 0.08) : lrJ(P.rock2, R, 0.1));
    B.add('cyl:10:0.7', 0xe8e4dc, 240, 21, -260, 0, 0, 0, 2.2, 16, 2.2); B.add('cyl:10', 0x2a2a2a, 240, 30.2, -260, 0, 0, 0, 1.4, 2.4, 1.4);
  }

  // ----- the gulls -----
  const gullG = new THREE.BufferGeometry();
  gullG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.25, -0.9, 0.18, 0.05, 0, 0, 0.15, 0, 0, -0.25, 0, 0, 0.15, 0.9, 0.18, 0.05, 0, 0.02, -0.35, -0.1, 0, 0.3, 0.1, 0, 0.3], 3));
  gullG.computeVertexNormals();
  const gulls = new THREE.InstancedMesh(gullG, new THREE.MeshBasicMaterial({ color: 0xe8e8f0, side: THREE.DoubleSide }), 14);
  const gullD = []; for (let k = 0; k < 14; k++) gullD.push({ cx: -80 + R() * 180, cz: -30 + R() * 90, r: 10 + R() * 25, y: 14 + R() * 18, w: (0.15 + R() * 0.2) * (R() < 0.5 ? -1 : 1), p: R() * 6, f: 3 + R() * 2 });
  gulls.frustumCulled = false; root.add(gulls);
  const gm = new THREE.Matrix4(), gq = new THREE.Quaternion(), ge = new THREE.Euler(), gv = new THREE.Vector3(), gs = new THREE.Vector3();

  // ----- the beam of the Light (dark until lrLightOn) -----
  const beamG = new THREE.ConeGeometry(14, 190, 20, 1, true); beamG.translate(0, -95, 0); beamG.rotateX(-Math.PI / 2);   // apex at the lamp, opening along +z
  { const p = beamG.attributes.position, c = []; for (let i = 0; i < p.count; i++) { const f = Math.max(0, 1 - p.getZ(i) / 190); c.push(f * 1.0, f * 0.85, f * 0.55); } beamG.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const beamM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Group(); beam.position.copy(lightAt);
  for (const a of [0, Math.PI]) { const m = new THREE.Mesh(beamG, beamM); m.rotation.y = a; m.frustumCulled = false; beam.add(m); }
  beam.visible = false; root.add(beam);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xffe0a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lampGlow.position.copy(lightAt); lampGlow.scale.setScalar(16); root.add(lampGlow);
  const lightPt = new THREE.PointLight(0xffd090, 0, 60, 1.5); lightPt.position.copy(lightAt); root.add(lightPt);
  const farGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xfff0c0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  farGlow.position.copy(farLight); farGlow.scale.setScalar(14); root.add(farGlow);

  // ----- put it together: one mesh a material a slice -----
  for (const key in bats) { const o = bats[key], m = o.B.mesh(M[o.k]); if (m) { m.name = 'lrDress:' + key; m.matrixAutoUpdate = false; root.add(m); } }
  // the halos round every lamp: one set of points
  const hp = [], hc = [], hs = [];
  for (const h of halos) { hp.push(h[0], h[1], h[2]); LRD_C.setHex(h[3]); hc.push(LRD_C.r, LRD_C.g, LRD_C.b); }
  const haloG = new THREE.BufferGeometry(); haloG.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); haloG.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
  const haloM = new THREE.PointsMaterial({ size: 2.4, map: lrGlowTex(), vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const haloP = new THREE.Points(haloG, haloM); root.add(haloP);
  root.updateMatrixWorld(true);

  const st = {
    root,
    update(dt, t, cart) {
      t = t || 0; seaM.uniforms.time.value = t;
      haloM.opacity = 0.7 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.03;
      // the gulls wheel
      for (let k = 0; k < gullD.length; k++) {
        const g = gullD[k], a = g.p + t * g.w;
        gv.set(g.cx + Math.cos(a) * g.r, g.y + Math.sin(t * 0.5 + k) * 1.5, g.cz + Math.sin(a) * g.r);
        ge.set(Math.sin(t * g.f + k) * 0.1, -a + (g.w > 0 ? Math.PI : 0), (g.w > 0 ? 0.35 : -0.35), 'YXZ'); gq.setFromEuler(ge);
        gs.set(1.1, 1 + Math.sin(t * g.f * 2 + k) * 0.6, 1.1);
        gm.compose(gv, gq, gs); gulls.setMatrixAt(k, gm);
      }
      gulls.instanceMatrix.needsUpdate = true;
      farGlow.material.opacity = Math.pow(Math.max(0, Math.sin(t * 1.4)), 6);
      // checkpoints the Wain has passed are lit gold
      if (cart) for (const c of CPS) { const on = cart.s >= c.s - 0.5; if (on !== c.lit) { c.lit = on; c.mat.color.setHex(on ? 0xffd070 : 0x4a4030); } }
      // the Light
      if (LT.on) {
        LT.k = Math.min(1, LT.k + (dt || 0) * 0.5);
        beam.visible = true; beam.rotation.y += (dt || 0) * 0.6;
        beamM.opacity = 0.14 * LT.k; lampGlow.material.opacity = LT.k; lightPt.intensity = 2.2 * LT.k;
        if (LT.lensM) LT.lensM.color.setRGB(0.25 + 0.75 * LT.k, 0.2 + 0.65 * LT.k, 0.15 + 0.4 * LT.k);
        if (LT.glassM) LT.glassM.emissive.setRGB(0.6 * LT.k, 0.5 * LT.k, 0.3 * LT.k);
      }
    },
    lightOn() { LT.on = true; },
  };
  LRD.st = st;
  return st;
}
function lrLightOn() { if (LRD.st) LRD.st.lightOn(); }

// ---------- the Lamp Wain ----------
// A heavy iron carriage on four spoked wheels carrying the great lens of the Light: about 3 m long (z), 2.2 m wide, 3 m
// tall, facing -z. The wheels turn with cart.s; the lens glows bright while it's pushed, red-tinged while contested,
// dim when idle or rolling back.
function lrWainModel() {
  const g = new THREE.Group(); g.name = 'lrWain';
  const lit = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glowM = new THREE.MeshBasicMaterial({ vertexColors: true });
  const B = lrBatch(), Gb = lrBatch(), P = LRD_P, R = lrRng(42);
  const IR = 0x34363a, IR2 = 0x2a2b2e, BR = 0xc8a048;
  const wr = 0.62, wx = 0.98, wz = 1.05, ay = wr;
  // the frame: two side beams, cross members, a bed plate, riveted
  for (const s of [-1, 1]) {
    B.box(s * 0.78 - 0.1, ay - 0.05, -1.5, s * 0.78 + 0.1, ay + 0.32, 1.5, IR);
    for (let z = -1.4; z <= 1.41; z += 0.2) B.add('sph:4', 0x50525a, s * 0.89, ay + 0.14, z, 0, 0, 0, 0.035);
    B.box(s * 0.95 - 0.05, ay + 0.3, -1.45, s * 0.95 + 0.05, ay + 0.36, 1.45, BR);   // a brass rubbing strip
  }
  for (const z of [-1.4, -0.5, 0.5, 1.4]) B.box(-0.8, ay - 0.02, z - 0.08, 0.8, ay + 0.26, z + 0.08, IR2);
  B.box(-1.0, ay + 0.32, -1.5, 1.0, ay + 0.42, 1.5, 0x2e3034);
  // the axles, the wheel hubs, the wheels (separate, to turn)
  for (const z of [-wz, wz]) B.add('cyl:8', IR2, 0, ay, z, 0, 0, Math.PI / 2, 0.07, 2.1, 0.07);
  const wheels = [];
  const wheelGeo = (() => {
    const W = lrBatch();
    W.add('tor:22:0.11', 0x2a2a2c, 0, 0, 0, 0, Math.PI / 2, 0, wr - 0.06, wr - 0.06, 0.9);   // the iron tyre
    W.add('tor:22:0.06', 0x4a3424, 0, 0, 0, 0, Math.PI / 2, 0, wr - 0.16);                  // the felloe
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; W.add('box', 0x5a4030, 0, Math.cos(a) * (wr - 0.32) / 2 * 1.0, Math.sin(a) * (wr - 0.32) / 2, a, 0, 0, 0.05, wr - 0.12, 0.06); }
    W.add('cyl:10', BR, 0, 0, 0, 0, 0, Math.PI / 2, 0.14, 0.2, 0.14);
    W.add('cyl:6', 0x2a2a2c, 0, 0, 0, 0, 0, Math.PI / 2, 0.06, 0.28, 0.06);
    return W.build();
  })();
  for (const x of [-wx, wx]) for (const z of [-wz, wz]) { const w = new THREE.Mesh(wheelGeo, lit); w.position.set(x, ay, z); g.add(w); wheels.push(w); }
  // the cradle: an iron ring on four brass-capped posts holding the lens
  const cy = ay + 0.42;
  B.add('cyl:16', IR, 0, cy + 0.12, 0, 0, 0, 0, 0.95, 0.24, 0.95);
  B.add('tor:20:0.06', BR, 0, cy + 0.25, 0, Math.PI / 2, 0, 0, 0.95);
  for (const [x, z] of [[-0.78, -1.25], [0.78, -1.25], [-0.78, 1.25], [0.78, 1.25]]) {
    B.add('cyl:6', IR, x, cy + 0.8, z, 0, 0, 0, 0.07, 1.6, 0.07); B.add('sph:6', BR, x, cy + 1.65, z, 0, 0, 0, 0.11);
  }
  // the chains from the posts to the lens's band
  const chain = (a, b) => { const n = 12; for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, sag = Math.sin(f * Math.PI) * 0.12; const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - sag, a[2] + (b[2] - a[2]) * f]; B.add('tor:6:0.3', 0x55575c, p[0], p[1], p[2], k % 2 ? Math.PI / 2 : 0, Math.atan2(b[0] - a[0], b[2] - a[2]), 0, 0.045, 0.045, 0.045); } };
  for (const [x, z] of [[-0.78, -1.25], [0.78, -1.25], [-0.78, 1.25], [0.78, 1.25]]) chain([x, cy + 1.55, z], [x * 0.75, cy + 1.25, z * 0.5]);
  // a push bar at the back, a tow eye at the front, lamps on the corners
  B.box(-0.9, ay + 0.9, 1.62, 0.9, ay + 1.0, 1.72, BR); for (const s of [-1, 1]) B.rod([s * 0.85, ay + 0.3, 1.45], [s * 0.85, ay + 0.95, 1.67], 0.04, IR);
  B.add('tor:10:0.3', IR, 0, ay + 0.15, -1.62, 0, 0, 0, 0.14);
  B.box(-0.3, ay + 0.1, -1.6, 0.3, ay + 0.3, -1.5, IR2);
  const lantern = (x, z) => { Gb.add('box', P.warm, x, ay + 0.65, z, 0, 0, 0, 0.16, 0.2, 0.16); B.add('cone:4', BR, x, ay + 0.82, z, 0, Math.PI / 4, 0, 0.14, 0.12, 0.14); B.add('box', BR, x, ay + 0.52, z, 0, 0, 0, 0.18, 0.04, 0.18); };
  for (const s of [-1, 1]) { lantern(s * 1.02, -1.4); lantern(s * 1.02, 1.4); }
  // a blue-and-gold plate on each side
  for (const s of [-1, 1]) { B.box(s * 0.9 - 0.02, ay + 0.02, -0.6, s * 0.9 + 0.02, ay + 0.28, 0.6, 0x2f5a80); B.box(s * 0.92 - 0.02, ay + 0.1, -0.45, s * 0.92 + 0.02, ay + 0.2, 0.45, P.gold); }
  const body = B.mesh(lit); g.add(body);
  const glowBits = Gb.mesh(glowM); g.add(glowBits);
  // the lens: a beehive of glass rings round a glowing heart, in a brass frame; its own group, so it can sway a little
  const lens = new THREE.Group(); lens.position.set(0, cy + 0.3, 0); lens.scale.setScalar(0.74); g.add(lens);
  const heartM = new THREE.MeshBasicMaterial({ color: 0xffd080 });
  const heart = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 12), heartM); heart.position.y = 1.05; lens.add(heart);
  const glassM = new THREE.MeshPhongMaterial({ color: 0xa8c8c0, emissive: 0x6a5020, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.6, depthWrite: false });
  const ringG = [];
  const LB = lrBatch();
  // the central drum of upright prisms, then the rings above and below, narrowing
  for (let k = 0; k < 6; k++) LB.add('tor:24:0.18', 0xffffff, 0, 0.75 + k * 0.12, 0, Math.PI / 2, 0, 0, 0.82, 0.82, 0.55);
  for (let k = 0; k < 6; k++) { const r = 0.78 - k * 0.11; LB.add('tor:22:0.2', 0xffffff, 0, 1.5 + k * 0.17, 0, Math.PI / 2, 0, 0, r, r, 0.7); LB.add('tor:22:0.2', 0xffffff, 0, 0.6 - k * 0.12, 0, Math.PI / 2, 0, 0, r * 0.95, r * 0.95, 0.6); }
  LB.add('sph:10', 0xffffff, 0, 2.45, 0, 0, 0, 0, 0.18);
  const lensMesh = LB.mesh(glassM); lens.add(lensMesh);
  // the brass astragals over it
  const FB = lrBatch();
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; FB.rod([Math.sin(a) * 0.88, 0.0, Math.cos(a) * 0.88], [Math.sin(a) * 0.9, 1.45, Math.cos(a) * 0.9], 0.025, BR, 4); FB.rod([Math.sin(a) * 0.9, 1.45, Math.cos(a) * 0.9], [Math.sin(a) * 0.15, 2.45, Math.cos(a) * 0.15], 0.022, BR, 4); }
  for (const y of [0.02, 0.72, 1.45]) FB.add('tor:24:0.04', BR, 0, y, 0, Math.PI / 2, 0, 0, 0.9);
  FB.add('cyl:12', BR, 0, 0.0, 0, 0, 0, 0, 0.8, 0.12, 0.8);
  FB.add('sph:8', BR, 0, 2.58, 0, 0, 0, 0, 0.12);
  lens.add(FB.mesh(lit));
  const glowSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: 0xffc870, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowSpr.position.y = 1.05; glowSpr.scale.setScalar(4.2); lens.add(glowSpr);
  const pt = new THREE.PointLight(0xffc870, 1.0, 11, 1.6); pt.position.y = cy + 1.4; g.add(pt);
  let k = 0.5, red = 0, lastS = null;
  const cW = new THREE.Color(1, 0.82, 0.48), cR = new THREE.Color(1, 0.32, 0.22), tmp = new THREE.Color();
  return {
    group: g, lens,
    update(cart, dt) {
      dt = dt || 0; const s = cart ? cart.s || 0 : 0, st = cart ? cart.st : 'idle';
      for (const w of wheels) w.rotation.x = -s / wr;
      const want = st === 'push' ? 1 : st === 'contest' ? 0.7 : 0.3, wantR = st === 'contest' ? 1 : 0;
      k += (want - k) * Math.min(1, dt * 3); red += (wantR - red) * Math.min(1, dt * 4);
      const tt = performance.now() / 1000, pulse = 1 + Math.sin(tt * (st === 'contest' ? 9 : 2.5)) * (st === 'contest' ? 0.12 : 0.05);
      tmp.copy(cW).lerp(cR, red);
      heartM.color.copy(tmp).multiplyScalar(0.35 + 0.75 * k * pulse);
      glassM.emissive.copy(tmp).multiplyScalar(0.15 + 0.5 * k);
      glowSpr.material.color.copy(tmp); glowSpr.material.opacity = 0.2 + 0.6 * k * pulse; glowSpr.scale.setScalar(3 + 2.2 * k);
      pt.color.copy(tmp); pt.intensity = 0.4 + 1.3 * k * pulse;
      // a slow sway in the cradle while it rolls
      const v = lastS == null ? 0 : (s - lastS) / Math.max(1e-3, dt); lastS = s;
      lens.rotation.z = Math.sin(tt * 2.1) * 0.012 * Math.min(1, Math.abs(v)); lens.rotation.x = Math.sin(tt * 1.7) * 0.01 * Math.min(1, Math.abs(v));
      lens.rotation.y += dt * 0.15 * k;
    },
  };
}

// ---------- the packs: an oil can, or a ship's medicine chest ----------
function lrPackMesh(big) {
  const g = new THREE.Group(), B = lrBatch(), Gb = lrBatch();
  if (big) {
    B.box(-0.42, 0, -0.28, 0.42, 0.5, 0.28, 0x2f5a3a);
    B.box(-0.44, 0.5, -0.3, 0.44, 0.58, 0.3, 0x264a30);
    for (const x of [-0.36, 0.36]) B.box(x - 0.03, -0.005, -0.3, x + 0.03, 0.585, 0.3, LRD_P.brass);
    B.box(-0.44, 0.24, -0.295, 0.44, 0.28, 0.295, LRD_P.brass);
    for (const s of [-1, 1]) B.add('tor:10:0.25', LRD_P.brass, s * 0.45, 0.38, 0, 0, Math.PI / 2, 0, 0.08);
    Gb.box(-0.06, 0.585, -0.2, 0.06, 0.6, 0.2, 0xf4f0e0); Gb.box(-0.2, 0.585, -0.06, 0.2, 0.6, 0.06, 0xf4f0e0);
    Gb.box(-0.06, 0.12, -0.31, 0.06, 0.46, -0.3, 0xf4f0e0); Gb.box(-0.15, 0.23, -0.31, 0.15, 0.35, -0.3, 0xf4f0e0);
  } else {
    B.add('cyl:12', 0xb08a3a, 0, 0.17, 0, 0, 0, 0, 0.15, 0.34, 0.15);
    B.add('cyl:12', 0x8a6a2a, 0, 0.35, 0, 0, 0, 0, 0.1, 0.04, 0.1);
    B.add('cyl:8:0.3', 0x8a6a2a, 0.08, 0.42, 0, 0, 0, -0.9, 0.04, 0.3, 0.04);
    B.add('tor:10:0.15', 0x3a3a3a, 0, 0.42, 0, 0, Math.PI / 2, 0, 0.1);
    Gb.add('cyl:12', 0xf2c14e, 0, 0.17, 0, 0, 0, 0, 0.153, 0.1, 0.153);
  }
  g.add(B.mesh(new THREE.MeshLambertMaterial({ vertexColors: true })));
  g.add(Gb.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lrGlowTex(), color: big ? 0xa8ffb8 : 0xffd070, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.y = 0.3; s.scale.setScalar(big ? 1.9 : 1.3); g.add(s);
  return g;
}
