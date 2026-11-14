'use strict';
// Skerry Links: the time of day and the lighthouse.
// The round runs from midday on the 1st to night on the 7th, 8th and 9th: each hole has its own light (gfTod), the sun
// lower and warmer hole by hole, a sunset on the 6th, then the moon and the stars. Off in the distance stands Skerry
// Light on its rock, white with two red bands. By day its lamp is dark; from sunset on it turns, its one beam sweeping
// round, and ships with their lanterns lit come in along the channel it marks, keeping well outside the skerries
// (a reef of black rocks further out). Each hole is its own frame, so the lighthouse is set for each: out to sea in
// the direction nearest a little right of the line of play, or, on the inland holes, on high ground far off.
// Far things wear no scene fog (it would wash them out at a kilometre); their colours are hazed by hand instead.

// the light at key points through the round (f: 0 the 1st hole, 1 the 9th), mixed between for each hole
const GF_TOD_KEYS = [
  { f: 0, el: 62, sun: [1, 0.97, 0.9], sunI: 0.82, hemi: [0.84, 0.9, 1], gnd: [0.31, 0.35, 0.22], hemiI: 0.74, top: [0.28, 0.5, 0.86], hor: [0.78, 0.86, 0.94], glow: [1, 0.95, 0.8], fog: [0.8, 0.86, 0.9], sea: [0.15, 0.42, 0.53], spec: [1, 1, 0.95], star: 0, beam: 0 },
  { f: 0.3, el: 40, sun: [1, 0.93, 0.8], sunI: 0.95, hemi: [0.85, 0.9, 1], gnd: [0.31, 0.35, 0.22], hemiI: 0.8, top: [0.32, 0.53, 0.82], hor: [0.86, 0.84, 0.76], glow: [1, 0.85, 0.6], fog: [0.84, 0.81, 0.72], sea: [0.16, 0.41, 0.5], spec: [1, 0.95, 0.8], star: 0, beam: 0 },
  { f: 0.5, el: 20, sun: [1, 0.86, 0.66], sunI: 1.05, hemi: [0.85, 0.89, 1], gnd: [0.31, 0.35, 0.22], hemiI: 0.82, top: [0.36, 0.55, 0.78], hor: [0.92, 0.8, 0.62], glow: [1, 0.78, 0.45], fog: [0.86, 0.78, 0.64], sea: [0.17, 0.41, 0.5], spec: [1, 0.9, 0.72], star: 0, beam: 0 },
  { f: 0.625, el: 4, sun: [1, 0.62, 0.36], sunI: 0.85, hemi: [0.92, 0.8, 0.82], gnd: [0.3, 0.29, 0.22], hemiI: 0.88, top: [0.28, 0.33, 0.55], hor: [0.98, 0.6, 0.38], glow: [1, 0.55, 0.28], fog: [0.62, 0.48, 0.44], sea: [0.17, 0.3, 0.4], spec: [1, 0.66, 0.4], star: 0.15, beam: 1 },
  { f: 0.75, el: 34, moon: 1, sun: [0.62, 0.72, 1], sunI: 0.5, hemi: [0.5, 0.6, 0.9], gnd: [0.2, 0.22, 0.2], hemiI: 0.78, top: [0.03, 0.05, 0.13], hor: [0.1, 0.13, 0.24], glow: [0.75, 0.82, 1], fog: [0.08, 0.1, 0.18], sea: [0.06, 0.12, 0.2], spec: [0.09, 0.1, 0.15], star: 1, beam: 1 },
  { f: 1, el: 40, moon: 1, sun: [0.6, 0.7, 1], sunI: 0.48, hemi: [0.48, 0.58, 0.88], gnd: [0.19, 0.21, 0.19], hemiI: 0.75, top: [0.02, 0.035, 0.1], hor: [0.08, 0.1, 0.2], glow: [0.75, 0.82, 1], fog: [0.06, 0.08, 0.15], sea: [0.05, 0.1, 0.17], spec: [0.08, 0.09, 0.14], star: 1, beam: 1 },
];
function gfTod(i) {
  const f = Math.max(0, Math.min(1, i / 8)), K = GF_TOD_KEYS;
  let a = K[K.length - 1], b = a;
  for (let k = 0; k < K.length - 1; k++) if (f >= K[k].f && f < K[k + 1].f) { a = K[k]; b = K[k + 1]; break; }
  // (the sun doesn't fade into the moon: the moon's keys stand apart)
  if (!a.moon && b.moon) b = a;
  const u = b === a ? 0 : (f - a.f) / (b.f - a.f), mix = (x, y) => Array.isArray(x) ? x.map((v, j) => v + (y[j] - v) * u) : x + (y - x) * u, o = {};
  for (const k in a) if (k !== 'f') o[k] = mix(a[k], b[k] != null ? b[k] : a[k]);
  o.moon = !!a.moon; return o;
}

// ---------- building it all, once ----------
function gfSkyInit() {
  if (G3.lh) return;
  const S = G3.scene, haze = G3.haze = [];
  const M = (hex, o) => { const m = new THREE.MeshLambertMaterial(Object.assign({ color: hex, fog: false }, o || {})); haze.push([m, new THREE.Color(hex)]); return m; };
  const lh = G3.lh = new THREE.Group();
  // the rock it stands on, and the tower: whitewashed with two red bands, the gallery, the lantern and its red dome
  G3.mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x557a3c)); G3.mound.scale.set(120, 26, 105); G3.mound.position.y = -24; lh.add(G3.mound);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(22, 1), M(0x3d3a36, { flatShading: true })); rock.scale.set(1.4, 0.5, 1.1); rock.position.y = -2; lh.add(rock);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.8, 36, 18), M(0xf1ede2)); tw.position.y = 26; lh.add(tw);
  for (const y of [17, 31]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - (y - 8) * 0.04, 4.6 - (y - 8) * 0.04 + 0.12, 4.2, 18), M(0xb23a2c)); band.position.y = y; lh.add(band); }
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.9, 18), M(0x2a2826)); gal.position.y = 44.4; lh.add(gal);
  G3.lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 4, 14), new THREE.MeshBasicMaterial({ color: 0x9fb2b8, fog: false })); G3.lamp.position.y = 47; lh.add(G3.lamp);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9c3326)); dome.position.y = 49; lh.add(dome);
  const ck = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 7), M(0xe4ddcc)); ck.position.set(13, 6.5, 4); lh.add(ck);
  const rf = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.6, 4), M(0x5a3a30)); rf.rotation.y = Math.PI / 4; rf.scale.set(1.1, 1, 0.75); rf.position.set(13, 10.8, 4); lh.add(rf);
  G3.cottageWin = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, fog: false })); G3.cottageWin.position.set(13, 6.6, 7.55); lh.add(G3.cottageWin);
  // the beam: one long cone of light from the lantern, brightest at the lamp and fading out along their length
  const BL = 900, bg = new THREE.ConeGeometry(30, BL, 20, 1, true); bg.translate(0, -BL / 2, 0); bg.rotateZ(Math.PI / 2);
  const bm = G3.beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { k: { value: 0 }, L: { value: BL } },
    vertexShader: 'uniform float L; varying float a; void main(){ a = clamp(position.x / L, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float k; varying float a; void main(){ float v = pow(1.0 - a, 2.2) * 0.42 * k; gl_FragColor = vec4(vec3(1.0, 0.93, 0.72) * v, 1.0); }' });
  const beams = G3.beams = new THREE.Group(); beams.position.y = 47;
  { const b = new THREE.Mesh(bg, bm); b.rotation.z = -0.025; beams.add(b); }
  lh.add(beams);
  // the lamp's glow, and its flash as a beam comes round towards you
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const x = gc.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(0.25, 'rgba(255,225,150,0.6)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const glowT = G3.glowT = new THREE.CanvasTexture(gc);
  G3.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); G3.glow.position.y = 47; lh.add(G3.glow);
  S.add(lh);
  // the skerries: a reef of low black rocks out beyond the light, the surf white round them by day
  const sk = G3.skerries = new THREE.Group(), skM = M(0x24221f, { flatShading: true }), surf = new THREE.MeshBasicMaterial({ color: 0xdfe8ea, transparent: true, opacity: 0.55, fog: false });
  const r = gfRng(4242);
  for (let k = 0; k < 10; k++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), skM), s = 5 + r() * 9;
    m.scale.set(s * (1 + r()), s * 0.45, s); m.rotation.y = r() * 6; m.userData.p = [(r() - 0.5) * 70, -130 + k * 34 + (r() - 0.5) * 16]; sk.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(s * 1.3, s * 1.9, 18), surf); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; ring.userData.of = m; sk.add(ring);
  }
  S.add(sk);
  // the ships: a hull, a mast or two, sails, and a lantern at the stern and the masthead, lit after dark
  G3.ships = [];
  for (let k = 0; k < 3; k++) {
    const sh = new THREE.Group(), hull = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 20), M(0x4a3122)); hull.position.y = 1.5; sh.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 4), M(0x4a3122)); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.8); bow.position.set(0, 1.5, 12.8); sh.add(bow);
    for (const [z, h] of [[4, 22], [-5, 18]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, h, 5), M(0x3b2a1f)); mast.position.set(0, 3 + h / 2, z); sh.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(10, h * 0.62), M(0xe9e1cc, { side: THREE.DoubleSide })); sail.position.set(0, 4 + h * 0.5, z + 0.5); sail.rotation.y = Math.PI / 2 + 0.25; sh.add(sail);
    }
    const lt = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); lt.position.set(0, 7, -10); lt.scale.setScalar(9); sh.add(lt);
    const mt = lt.clone(); mt.material = lt.material.clone(); mt.material.color.set(0xfff0d0); mt.position.set(0, 26, 4); mt.scale.setScalar(6); sh.add(mt);
    sh.userData = { lights: [lt, mt], ph: k / 3 }; S.add(sh); G3.ships.push(sh);
  }
  // the harbour: a stone quay at the foot of the cliffs, a breakwater curving round it, cottages, lamps and two boats
  // moored (built along its own x, the sea towards its +z)
  { const hg = G3.harbour = new THREE.Group(), stone = M(0x8a8478), dark = M(0x4a443c), wall = M(0xe4ddcc), roof = M(0x5a3a30), lamps = [];
    const quay = new THREE.Mesh(new THREE.BoxGeometry(80, 3, 16), stone); quay.position.set(0, 1.5, -8); hg.add(quay);
    for (let k = 0; k < 9; k++) { const a = k / 8 * 1.9, bx = 40 + Math.sin(a) * 6 - (1 - Math.cos(a)) * 38, bz = -2 + Math.sin(a) * 78; const b = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 12), stone); b.position.set(bx, 1.4, bz); b.rotation.y = -a * 0.9; hg.add(b); }
    [[-26, 6, 4.5], [-10, 7, 4], [8, 6, 5], [24, 8, 4]].forEach(([hx, w, h]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(w * 1.6, h, w), wall); c.position.set(hx, 3 + h / 2, -13); hg.add(c); const r = new THREE.Mesh(new THREE.ConeGeometry(w * 1.05, 3, 4), roof); r.rotation.y = Math.PI / 4; r.scale.set(1.6, 1, 1); r.position.set(hx, 4.5 + h, -13); hg.add(r); });
    for (const [lxp, lzp] of [[-38, -1], [0, -1], [36, -1], [8, 74]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 6, 5), dark); post.position.set(lxp, 6, lzp); hg.add(post); const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); g.position.set(lxp, 9.3, lzp); g.scale.setScalar(10); hg.add(g); lamps.push(g); }
    for (const [bx, bz, r] of [[-20, 10, 0.3], [14, 12, -0.2]]) { const b = new THREE.Group(), h = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 11), M(0x6a4a30)); h.position.y = 0.9; b.add(h); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 9, 5), dark); m.position.y = 5.5; b.add(m); b.position.set(bx, 0, bz); b.rotation.y = r + Math.PI / 2; hg.add(b); }
    hg.scale.setScalar(0.85); hg.userData.lamps = lamps; hg.visible = false; S.add(hg); }
  // the stars and the moon
  const sp = [], rs = gfRng(77);
  for (let k = 0; k < 900; k++) { const a = rs() * Math.PI * 2, z = Math.pow(rs(), 0.7), c = Math.sqrt(1 - z * z); sp.push(Math.cos(a) * c * 4000, z * 4000 + 40, Math.sin(a) * c * 4000); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  G3.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); G3.stars.renderOrder = 0; S.add(G3.stars);
  const mc = document.createElement('canvas'); mc.width = mc.height = 64; { const x = mc.getContext('2d'), g = x.createRadialGradient(32, 32, 10, 32, 32, 32); g.addColorStop(0, 'rgba(235,240,255,1)'); g.addColorStop(0.42, 'rgba(235,240,255,1)'); g.addColorStop(0.5, 'rgba(180,195,240,0.35)'); g.addColorStop(1, 'rgba(160,180,240,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  G3.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), fog: false, depthWrite: false, transparent: true })); G3.moon.scale.setScalar(260); S.add(G3.moon);
}

// ---------- each hole: its light, and where the lighthouse stands ----------
function gfSkyHole(H) {
  if (!G3.ok) return; gfSkyInit();
  const T = G3.tod = gfTod(H.i), c3 = a => new THREE.Color(a[0], a[1], a[2]);
  // the sun (or the moon) out over the sea, ahead and to the left
  const az = Math.atan2(-0.55, 0.72) + (T.moon ? 0.9 : 0), el = T.el * Math.PI / 180, sd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  G3.sun.position.copy(sd).multiplyScalar(100); G3.sun.color.copy(c3(T.sun)); G3.sun.intensity = T.sunI;
  if (G3.hemi) { G3.hemi.color.copy(c3(T.hemi)); G3.hemi.groundColor.copy(c3(T.gnd)); G3.hemi.intensity = T.hemiI; }
  const U = G3.sky.material.uniforms; U.sd.value.copy(sd); if (U.top) { U.top.value.copy(c3(T.top)); U.hor.value.copy(c3(T.hor)); U.glow.value.copy(c3(T.glow)); U.night.value = T.moon ? 1 : 0; }
  const fc = c3(T.fog); G3.scene.fog.color.copy(fc); G3.r.setClearColor(fc);
  G3.sea.material.color.copy(c3(T.sea)); G3.sea.material.specular.copy(c3(T.spec)); G3.sea.material.shininess = T.moon ? 160 : 70;
  G3.stars.material.opacity = T.star; G3.stars.visible = T.star > 0.01;
  G3.moon.visible = T.moon; G3.moon.position.copy(sd).multiplyScalar(3900);
  // far things hazed towards the horizon's colour by hand
  const hz = T.moon ? 0.25 : 0.32; for (const [m, base] of G3.haze) m.color.copy(base).lerp(fc, hz);
  G3.beamOn = T.beam > 0.5;
  G3.lamp.material.color.set(G3.beamOn ? 0xfff2c0 : 0x8c9ea6);
  G3.cottageWin.material.color.set(G3.beamOn ? 0xffc472 : 0x3a3a3a);
  for (const s of G3.ships) for (const l of s.userData.lights) l.visible = G3.beamOn;
  // where the light stands: out to sea a little right of the line of play if there's sea, or far off on the land
  const cx = (H.box[0] + H.box[2]) / 2, cy = (H.box[1] + H.box[3]) / 2, want = H.dir + 0.45;
  // (a spot of open water well off, with room round it for the rock, nearest the direction wanted; further is better)
  let best = null; const wetAt = (x, y) => gfSeaD(H, x, y) < -60;
  for (let k = 0; k < 72; k++) {
    const a = k / 72 * Math.PI * 2, da = Math.abs(((a - want) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    for (const d of [1050, 900, 750, 600, 480]) {
      const x = cx + Math.sin(a) * d, y = cy + Math.cos(a) * d;
      if (!wetAt(x, y) || ![0, 1, 2, 3, 4, 5].every(j => wetAt(x + Math.sin(j) * 70, y + Math.cos(j) * 70))) continue;
      const cost = da + (1050 - d) / 1000 * 0.9; if (!best || cost < best.cost) best = { a, d, cost }; break;
    }
  }
  const sea = !!best, a = sea ? best.a : want, d = sea ? best.d : 680, ux = Math.sin(a), uy = Math.cos(a), lx = cx + ux * d, ly = cy + uy * d;
  const ks = sea ? 1.35 : 1.6, gz = sea ? 0 : Math.max(0, gfH(H, lx, ly)) + 26 * ks; G3.mound.visible = !sea; G3.lh.scale.setScalar(ks);
  G3.lh.position.copy(gv(lx, ly, gz)); G3.lh.rotation.y = -a;
  G3.lhAt = [lx, ly, gz + 47 * ks];
  gfHarbourHole(H, sea, lx, ly, ux, uy);
}

// the harbour under the cliffs, and the ships' way into it: in from far out, past the Light, then threading between
// the skerries that lie across the direct line, out to the harbour mouth and in to the quay
function gfHarbourHole(H, sea, lx, ly, ux, uy) {
  const [x0, y0, x1, y1] = H.box, sdA = (x, y) => (x < x0 - 1000 || x > x1 + 1000 || y < y0 - 800 || y > y1 + 1000) ? -999 : gfSeaD(H, x, y);
  const wet = (x, y, m) => sdA(x, y) < -(m || 14);
  G3.harbour.visible = false; G3.route = null; for (const s of G3.ships) s.visible = false;
  const rocks = [];
  // a few rocks round the Light's own rock
  if (sea) { const r = gfRng(H.i * 13 + 7); for (let k = 0; k < 4; k++) { const a = r() * 6.28, d = 70 + r() * 60, x = lx + Math.sin(a) * d, y = ly + Math.cos(a) * d; if (wet(x, y, 20)) rocks.push([x, y]); } }
  // the harbour: just off the foot of the cliffs, in view from the tee (a little right of the line of play by choice)
  let hb = null;
  if (sea) for (let k = -12; k <= 12; k++) {
    const rel = k * 5 * Math.PI / 180, a = H.dir + rel;
    for (let d = 160; d <= 800; d += 15) {
      const x = Math.sin(a) * d, y = Math.cos(a) * d, v = sdA(x, y);
      if (v < 0 && v > -70) {
        if (v > -14 || gfSegD(x, y, 0, 0, H.pin[0], H.pin[1]) < 100) continue;
        const gx = sdA(x + 3, y) - sdA(x - 3, y), gy = sdA(x, y + 3) - sdA(x, y - 3), gl = Math.hypot(gx, gy) || 1, nx = -gx / gl, ny = -gy / gl;
        if (![60, 120, 180].every(o => wet(x + nx * o, y + ny * o, 30))) break;
        const cost = Math.abs(rel - 0.35) + Math.abs(d - 380) / 500; if (!hb || cost < hb.cost) hb = { x, y, nx, ny, cost }; break;
      }
      if (v < -70) break;
    }
  }
  if (hb) {
    const { x, y, nx, ny } = hb, tx = -ny, ty = nx;   // (seaward, and along the shore)
    G3.harbour.visible = true; G3.harbour.position.copy(gv(x, y, 0)); G3.harbour.rotation.y = Math.atan2(nx, -ny);
    G3.harbour.userData.lamps.forEach(l => l.visible = !!G3.beamOn);
    const B = [x + nx * 22 + tx * 6, y + ny * 22 + ty * 6], M = [x + nx * 95 - tx * 40, y + ny * 95 - ty * 40];
    // in past the Light (on its landward side, a ship's length off), from far out beyond it
    const lo = [lx - x, ly - y], ll = Math.hypot(lo[0], lo[1]) || 1, ox = lo[0] / ll, oy = lo[1] / ll, px = -oy, py = ox;
    let best = null;
    for (const side of [1, -1]) for (const amp of [70, 50, 35]) {
      if (best) break;
      const S0 = [lx + ox * 900 + px * side * 160, ly + oy * 900 + py * side * 160], S1 = [lx - ox * 40 + px * side * 150, ly - oy * 40 + py * side * 150];
      // the skerries lie on the straight line from there to the harbour mouth; the way swings out round each in turn
      const way = [S0, S1], reef = [];
      for (const [f, sgn] of [[0.22, 1], [0.44, -1], [0.66, 1], [0.84, -1]]) {
        const cx = S1[0] + (M[0] - S1[0]) * f, cy = S1[1] + (M[1] - S1[1]) * f, dx = M[0] - S1[0], dy = M[1] - S1[1], dl = Math.hypot(dx, dy) || 1;
        reef.push([cx, cy]); way.push([cx - dy / dl * amp * sgn, cy + dx / dl * amp * sgn]);
      }
      way.push(M, B);
      const pts = gfSpline(way, 12);
      let ok = pts.every(([px2, py2], i) => wet(px2, py2, i > pts.length - 14 ? 6 : 16)) && reef.every(([rx, ry]) => wet(rx, ry, 12));
      if (ok) best = { pts, reef };
    }
    if (best) { G3.route = best.pts; rocks.push(...best.reef); for (const s of G3.ships) s.visible = true; }
  }
  // set the rocks out (any left over hidden)
  const R = G3.skerries.children.filter(c => !c.userData.of);
  R.forEach((m, k) => { const p = rocks[k]; m.visible = !!p; if (p) m.position.copy(gv(p[0], p[1], 0.5)); });
  for (const c of G3.skerries.children) if (c.userData.of) { c.visible = c.userData.of.visible; c.position.set(c.userData.of.position.x, 0.3, c.userData.of.position.z); }
  G3.skerries.visible = rocks.length > 0;
}
// a smooth way through the points (Catmull-Rom), a point about every `step` metres
function gfSpline(P, step) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
  }
  out.push(P[P.length - 1]); return out;
}

// ---------- every frame ----------
function gfSkyTick(dt, t) {
  if (!G3.lh) return;
  // the light turns once in ten seconds; its flash as the beam swings round to face you
  const on = !!G3.beamOn; G3.beams.visible = on; G3.beamMat.uniforms.k.value = on ? 1 : 0;
  if (on) {
    G3.beams.rotation.y = -t * Math.PI * 2 / 10;
    const lp = G3.lh.position, dx = G3.cam.position.x - lp.x, dz = G3.cam.position.z - lp.z, dl = Math.hypot(dx, dz) || 1, ba = G3.lh.rotation.y + G3.beams.rotation.y;
    const face = Math.pow(Math.max(0, (Math.cos(ba) * dx - Math.sin(ba) * dz) / dl), 60);
    const far = Math.max(0.35, Math.min(1.2, dl / 900)); G3.glow.visible = true; G3.glow.scale.setScalar((30 + face * 240) * far);
  } else G3.glow.visible = false;
  // the ships work their way in along the route, round and round
  const R = G3.route; if (!R) return;
  const segL = [], tot = R.slice(1).reduce((s, p, i) => { const l = Math.hypot(p[0] - R[i][0], p[1] - R[i][1]); segL.push(l); return s + l; }, 0);
  for (const s of G3.ships) {
    let u = ((t * 11 / tot + s.userData.ph) % 1) * tot, i = 0; while (i < segL.length - 1 && u > segL[i]) { u -= segL[i]; i++; }
    const A = R[i], B = R[i + 1], f = Math.min(1, u / segL[i]), x = A[0] + (B[0] - A[0]) * f, y = A[1] + (B[1] - A[1]) * f;
    s.position.copy(gv(x, y, 0)); s.rotation.y = Math.atan2(B[0] - A[0], -(B[1] - A[1])); s.rotation.z = Math.sin(t * 0.9 + s.userData.ph * 9) * 0.04;
    // (growing out of the haze far out, and slipping in at the quay at the end of the way)
    const left = segL.slice(i).reduce((q, v) => q + v, 0) - u, done = u + segL.slice(0, i).reduce((q, v) => q + v, 0), e = Math.min(1, done / 150, left / 25); s.scale.setScalar(Math.max(0.001, e));
  }
}
