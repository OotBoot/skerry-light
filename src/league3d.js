'use strict';
// Skerry League in 3D (three.js, its own canvas, #lgCv): the Harbour Pool at dusk. The water and its markings, the
// sea walls with their lamps, the cliffs round the cove, the two goals and the lighthouse behind each, the gale buoys,
// the ball, every ship (built here from her boat's shape in src/crates.js BOATS and dressed in her skin, her sails
// and pennant in her side's colour), their wakes and the Gale's spray, the goal bursts, and the camera.
// src/league.js owns the state; this only reads it. Game frame to three.js: (x, y, z up) is (x, z, -y), and a
// ship's heading h is rotation.y = -h (her bow is the model's -z).

const L3 = { ok: false, r: null, scene: null, cam: null, ships: [], ball: null, shadow: null, pads: [], fx: [], houses: [], water: null, wt: 0, camP: null, camL: null, soft: null };
const lv = (x, y, z) => new THREE.Vector3(x, z, -y);

function lg3dInit() {
  if (L3.ok) return true;
  if (typeof THREE === 'undefined') return false;
  const cv = $('lgCv');
  const dpr = window.devicePixelRatio || 1, touch = matchMedia && matchMedia('(pointer: coarse)').matches;
  L3.lite = touch || dpr >= 2;
  try { L3.r = new THREE.WebGLRenderer({ canvas: cv, antialias: !L3.lite, powerPreference: 'high-performance' }); } catch (e) { return false; }
  L3.r.setPixelRatio(Math.min(L3.lite ? 1.25 : 1.5, dpr, typeof pwSaver === 'function' && pwSaver() ? 1.25 : 9));
  const S = L3.scene = new THREE.Scene();
  S.background = lg3dSky();
  S.fog = new THREE.Fog(0x8a6f7a, 420, 1500);
  L3.cam = new THREE.PerspectiveCamera(60, 1, 0.5, 4000);
  S.add(new THREE.HemisphereLight(0xc8d4f0, 0x2a3442, 0.9));
  const sun = new THREE.DirectionalLight(0xffc89a, 1.0); sun.position.set(-300, 160, -500); S.add(sun);
  const fill = new THREE.DirectionalLight(0x8aa8d8, 0.35); fill.position.set(200, 120, 400); S.add(fill);
  L3.soft = lg3dSoftTex();
  lg3dArena();
  L3.ok = true; lg3dResize();
  return true;
}
function lg3dResize() { if (!L3.r) return; const w = innerWidth, h = innerHeight; L3.r.setSize(w, h, false); L3.cam.aspect = w / h; L3.cam.fov = w < h ? 74 : 60; L3.cam.updateProjectionMatrix(); }
function lg3dSky() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1b2440'); g.addColorStop(0.45, '#4a4a6e'); g.addColorStop(0.7, '#b0767a'); g.addColorStop(0.85, '#f0a870'); g.addColorStop(1, '#ffd29a');
  x.fillStyle = g; x.fillRect(0, 0, 8, 256); const t = new THREE.CanvasTexture(c); return t;
}
function lg3dSoftTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const lg3dLam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
function lg3dGlow(col, s, opa) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: L3.soft, color: col, transparent: true, opacity: opa == null ? 0.9 : opa, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(s); return m; }

// ---------- the pool ----------
function lg3dArena() {
  const S = L3.scene, { AX, AY, GW, GD, WALLH, BAR } = LGC;
  // the open sea beyond, and the pool's own water with its markings painted on
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshPhongMaterial({ color: 0x1b3348, shininess: 60, specular: 0x665544 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.6; S.add(sea);
  const wg = new THREE.PlaneGeometry(AX * 2 + 4, (AY + GD) * 2 + 4, 34, 64);
  const wm = new THREE.MeshPhongMaterial({ map: lg3dMarks(), shininess: 80, specular: 0x886655 });
  const water = L3.water = new THREE.Mesh(wg, wm); water.rotation.x = -Math.PI / 2; S.add(water);
  L3.wbase = Float32Array.from(wg.attributes.position.array);
  // the sea walls: a block along every segment but the goal boxes' own, with a walk along the top and lamps on it
  const stone = lg3dLam(0x6a6a70), top = lg3dLam(0x9a9488), dark = lg3dLam(0x3c3a3e);
  for (const w of lgWalls()) {
    const th = 5, h = w.goal ? BAR + 4 : WALLH, len = w.L + th * (w.goal ? 1 : 0.95);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h + 3, th), w.goal ? dark : stone);
    const mx = (w.ax + w.bx) / 2 - w.nx * th / 2, my = (w.ay + w.by) / 2 - w.ny * th / 2;
    m.position.copy(lv(mx, my, (h + 3) / 2 - 3)); m.rotation.y = Math.atan2(w.by - w.ay, w.bx - w.ax); S.add(m);
    if (!w.goal) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, th + 1.2), top); cap.position.copy(lv(mx, my, h + 0.4)); cap.rotation.y = m.rotation.y; S.add(cap);
      const n = Math.max(1, Math.floor(w.L / 32));
      for (let i = 0; i <= n; i++) { const f = n ? i / n : 0.5, x = w.ax + (w.bx - w.ax) * f - w.nx * 2.5, y = w.ay + (w.by - w.ay) * f - w.ny * 2.5; lg3dLamp(x, y, h + 0.8); }
    }
  }
  // the ends above each goal: a stone lintel over the mouth, and each goal's frame, net and glow
  for (const tm of [0, 1]) {
    const sg = tm === 0 ? -1 : 1, T = LG_TEAMS[tm], y0 = AY * sg;
    const lint = new THREE.Mesh(new THREE.BoxGeometry(GW + 10, WALLH + 6 - BAR + 6, 5), stone); lint.position.copy(lv(0, y0 + sg * 2.5, BAR + (WALLH + 12 - BAR) / 2)); S.add(lint);
    const post = lg3dLam(0xf2efe6, { emissive: 0x302820 }), pr = 0.8;
    for (const px of [-GW / 2, GW / 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, BAR + 3, 10), post); p.position.copy(lv(px, y0, (BAR + 3) / 2 - 3)); S.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, GW, 10), post); bar.rotation.z = Math.PI / 2; bar.position.copy(lv(0, y0, BAR)); S.add(bar);
    // the net: lines over the box's sides, back and roof
    const P = [], st = 3.2;
    for (let x = -GW / 2; x <= GW / 2 + 0.01; x += st) { P.push(lv(x, y0, BAR), lv(x, y0 + sg * GD, BAR), lv(x, y0 + sg * GD, BAR), lv(x, y0 + sg * GD, 0)); }
    for (let z = 0; z <= BAR + 0.01; z += st) P.push(lv(-GW / 2, y0 + sg * GD, z), lv(GW / 2, y0 + sg * GD, z));
    for (let d = 0; d <= GD + 0.01; d += st) { P.push(lv(-GW / 2, y0 + sg * d, BAR), lv(GW / 2, y0 + sg * d, BAR)); for (const x of [-GW / 2, GW / 2]) P.push(lv(x, y0 + sg * d, 0), lv(x, y0 + sg * d, BAR)); }
    for (let z = 0; z <= BAR + 0.01; z += st) for (const x of [-GW / 2, GW / 2]) P.push(lv(x, y0, z), lv(x, y0 + sg * GD, z));
    const net = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(P), new THREE.LineBasicMaterial({ color: T.hex, transparent: true, opacity: 0.55 })); S.add(net);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), new THREE.MeshBasicMaterial({ color: T.hex, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })); gl.rotation.x = -Math.PI / 2; gl.position.copy(lv(0, y0 + sg * GD / 2, 0.15)); S.add(gl);
    // the lighthouse behind it, in its side's bands
    const H = lg3dHouse(T); H.position.copy(lv(0, y0 + sg * (GD + 30), 0)); S.add(H); L3.houses[tm] = H;
  }
  // the cliffs round the cove, and a few rocks in the water outside the walls
  const rock = lg3dLam(0x4a4440), rock2 = lg3dLam(0x5c5248), grass = lg3dLam(0x3e5034);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * Math.PI * 2, open = Math.abs(Math.sin(a)) < 0.22 && Math.cos(a) < 0;   // a gap out to the open sea, west
    if (open) continue;
    const rx = AX + 90 + rnd() * 70, ry = AY + 110 + rnd() * 70, x = Math.cos(a) * rx, y = Math.sin(a) * ry, s = 30 + rnd() * 40;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rnd() < 0.5 ? rock : rock2); m.scale.set(s * (0.8 + rnd() * 0.6), s * (0.7 + rnd() * 1.1), s * (0.8 + rnd() * 0.6)); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); m.position.copy(lv(x, y, s * 0.2)); S.add(m);
    if (rnd() < 0.5) { const t = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), grass); t.scale.set(s * 0.7, s * 0.25, s * 0.7); t.position.copy(lv(x, y, s * 0.2 + m.scale.y * 0.75)); S.add(t); }
  }
  for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, d = 1 + rnd() * 0.4, x = Math.cos(a) * (AX + 25) * d, y = Math.sin(a) * (AY + 40) * d; if (Math.abs(x) < AX + 8 && Math.abs(y) < AY + GD + 8) continue; const s = 3 + rnd() * 6; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rock); m.position.copy(lv(x, y, 0)); S.add(m); }
  // the gale buoys
  L3.pads = [];
  for (const p of LG.pads.length ? LG.pads : lgPadsNew()) L3.pads.push(lg3dPad(p));
  // the ball and its shadow
  const ball = L3.ball = new THREE.Mesh(new THREE.SphereGeometry(LGC.R, 32, 20), new THREE.MeshPhongMaterial({ map: lg3dBallTex(), shininess: 50, emissive: 0x221a14 }));
  S.add(ball);
  const sh = L3.shadow = new THREE.Mesh(new THREE.CircleGeometry(LGC.R, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; S.add(sh);
  const bg = L3.ballGlow = lg3dGlow(0xfff0c8, LGC.R * 3.2, 0.25); S.add(bg);
}
function lg3dLamp(x, y, z) {
  const S = L3.scene, p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4, 6), lg3dLam(0x2a2620)); p.position.copy(lv(x, y, z + 2)); S.add(p);
  const g = lg3dGlow(0xffd08a, 4.5, 0.85); g.position.copy(lv(x, y, z + 4.3)); S.add(g);
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })); c.position.copy(g.position); S.add(c);
}
// the markings: the halfway line and centre circle, each half faintly in its side's colour, the boxes before the goals
function lg3dMarks() {
  const { AX, AY, GD, GW } = LGC, W = 512, H = Math.round(512 * (AY + GD) / AX), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), kx = W / (AX * 2 + 4), ky = H / ((AY + GD) * 2 + 4), X = v => (v + AX + 2) * kx, Y = v => H - (v + AY + GD + 2) * ky;
  x.fillStyle = '#2c5c78'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,140,58,0.30)'); g.addColorStop(0.45, 'rgba(255,140,58,0)'); g.addColorStop(0.55, 'rgba(74,168,255,0)'); g.addColorStop(1, 'rgba(74,168,255,0.30)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // ripples
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`; x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 8, 1); }
  x.strokeStyle = 'rgba(240,246,255,0.55)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(X(-AX), Y(0)); x.lineTo(X(AX), Y(0)); x.stroke();
  x.beginPath(); x.ellipse(X(0), Y(0), 26 * kx, 26 * ky, 0, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(X(0), Y(0), 4, 0, 7); x.fillStyle = 'rgba(240,246,255,0.7)'; x.fill();
  for (const sg of [1, -1]) {
    x.strokeRect(X(-GW / 2 - 18), Y(sg > 0 ? AY : -AY + 34), (GW + 36) * kx, 34 * ky);
    x.beginPath(); x.moveTo(X(-GW / 2), Y(AY * sg)); x.lineTo(X(GW / 2), Y(AY * sg)); x.lineWidth = 5; x.stroke(); x.lineWidth = 3;
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function lg3dBallTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f4efe2' : '#d8402c'; x.fillRect(i * 32, 0, 32, 128); }
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, 256, 14); x.fillRect(0, 114, 256, 14);
  x.fillStyle = '#20262e'; x.fillRect(0, 60, 256, 8);
  return new THREE.CanvasTexture(c);
}
function lg3dHouse(T) {
  const G = new THREE.Group(), white = lg3dLam(0xeeeae0), band = lg3dLam(T.hex, { emissive: new THREE.Color(T.hex).multiplyScalar(0.15) }), dark = lg3dLam(0x2a2a30);
  const rockb = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 8, 10), lg3dLam(0x4a4440)); rockb.position.y = 2; G.add(rockb);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 5.4, 40, 16), white); tw.position.y = 26; G.add(tw);
  for (const y of [14, 28]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(5.4 - (y - 6) * 0.045 + 0.05, 5.4 - (y - 10) * 0.045 + 0.05, 4, 16), band); b.position.y = y; G.add(b); }
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.8, 16), dark); gal.position.y = 46.4; G.add(gal);
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4, 12), new THREE.MeshBasicMaterial({ color: 0xffe8b0 })); lan.position.y = 49; G.add(lan);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3.4, 12), band); roof.position.y = 52.7; G.add(roof);
  const glow = lg3dGlow(0xffe0a0, 26, 0.75); glow.position.y = 49; G.add(glow);
  const flash = lg3dGlow(T.hex, 90, 0); flash.position.y = 49; G.add(flash);
  // the beam, turning
  const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 9, 220, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  bm.geometry.translate(0, 110, 0); bm.rotation.z = Math.PI / 2 - 0.06; const piv = new THREE.Group(); piv.position.y = 49; piv.add(bm); G.add(piv);
  G.userData = { glow, flash, piv, f: 0 };
  return G;
}
function lg3dPad(p) {
  const G = new THREE.Group(), s = p.big ? 1.7 : 1;
  const f = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * s, 1.4 * s, 1.2 * s, 10), lg3dLam(0xe8c040, { emissive: 0x3a2a00 })); f.position.y = 0.4; G.add(f);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3 * s, 3.8 * s, 28), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; G.add(ring);
  const glow = lg3dGlow(0xffe080, 6 * s, 0.5); glow.position.y = 2.2 * s; G.add(glow);
  G.position.copy(lv(p.x, p.y, 0)); L3.scene.add(G);
  return { G, ring, glow, f, p, s };
}

// ---------- the ships ----------
// her model, from her boat's own shape (src/crates.js BOATS: len, beam, masts) and her skin's colours; her sails and
// pennant in her side's colour
function lg3dShip(s) {
  const b = s.boat, sk = s.skin || {}, T = LG_TEAMS[s.team], G = new THREE.Group();
  const col = c => new THREE.Color(c || '#555'), team = new THREE.Color(T.hex);
  const hullC = col(sk.hull), railC = col(sk.rail), deckC = col((sk.deck && sk.deck[0]) || '#2a2016').lerp(new THREE.Color(0x8a7458), 0.5);
  const sailC = col(sk.sail || '#ddd').lerp(team, 0.55);
  const L = b.len / 2, B = b.beam * 1.25, Zd = b.id === 'cutter' ? 1.5 : b.id === 'barque' ? 2.6 : 2;
  if (b.id === 'carrier') {
    const grey = lg3dLam(hullC.clone().lerp(new THREE.Color(0x6a7078), 0.5)), deck = lg3dLam(0x3a3e44);
    const sh = new THREE.Shape(); sh.moveTo(0, -L); sh.lineTo(B * 1.6, -L + 7); sh.lineTo(B * 1.9, L - 2); sh.lineTo(-B * 1.9, L - 2); sh.lineTo(-B * 1.6, -L + 7); sh.lineTo(0, -L);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: 4.5, bevelEnabled: false }); hg.rotateX(Math.PI / 2); const hm = new THREE.Mesh(hg, grey); hm.position.y = 3.6; G.add(hm);
    const dg = new THREE.ShapeGeometry(sh); dg.rotateX(Math.PI / 2); const dm = new THREE.Mesh(dg, deck); dm.position.y = 3.65; G.add(dm);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, b.len * 0.85), new THREE.MeshBasicMaterial({ color: T.hex })); strip.rotation.x = -Math.PI / 2; strip.position.set(0, 3.7, 1); G.add(strip);
    const isl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5, 7), grey); isl.position.set(B * 1.3, 6.2, 3); G.add(isl);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6, 6), lg3dLam(0x2a2c30)); mast.position.set(B * 1.3, 11.5, 3); G.add(mast);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshBasicMaterial({ color: T.hex, side: THREE.DoubleSide })); fl.position.set(B * 1.3, 13.4, 4.3); fl.rotation.y = Math.PI / 2; G.add(fl); G.userData.flag = fl;
    for (const z of [-L + 9, -2, 8]) { const lt = lg3dGlow(0xfff4d0, 4, 0.8); lt.position.set(0, 4.4, z); G.add(lt); }
  } else {
    const hull = lg3dLam(hullC), rail = lg3dLam(railC), deck = lg3dLam(deckC), wood = lg3dLam(col(sk.wood || '#3a2c20').lerp(new THREE.Color(0x5a4630), 0.4));
    const sh = new THREE.Shape(), S0 = L * 0.92;
    sh.moveTo(0, -L); sh.bezierCurveTo(B * 0.9, -L + L * 0.5, B, -L * 0.15, B, L * 0.2); sh.bezierCurveTo(B, L * 0.6, B * 0.8, S0, B * 0.6, L); sh.lineTo(-B * 0.6, L); sh.bezierCurveTo(-B * 0.8, S0, -B, L * 0.6, -B, L * 0.2); sh.bezierCurveTo(-B, -L * 0.15, -B * 0.9, -L + L * 0.5, 0, -L);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: Zd + 1.4, bevelEnabled: false, curveSegments: 10 }); hg.rotateX(Math.PI / 2);
    const hm = new THREE.Mesh(hg, hull); hm.position.y = Zd; G.add(hm);
    const dg = new THREE.ShapeGeometry(sh, 10); dg.rotateX(Math.PI / 2); const dm = new THREE.Mesh(dg, deck); dm.position.y = Zd + 0.02; dm.scale.set(0.93, 1, 0.96); G.add(dm);
    // the rail, in the skin's colour, and a stripe of the side's colour below it
    const pts = sh.getPoints(30), rl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x * 1.01, Zd + 0.35, p.y))), new THREE.LineBasicMaterial({ color: railC })); G.add(rl);
    const tl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x * 1.015, Zd - 0.45, p.y))), new THREE.LineBasicMaterial({ color: T.hex })); G.add(tl);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(B * 0.9, 1.1, L * 0.32), rail); cab.position.set(0, Zd + 0.55, L * 0.55); G.add(cab);
    const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, L * 0.5, 6), wood); sprit.rotation.x = Math.PI / 2 - 0.12; sprit.position.set(0, Zd + 0.6, -L - L * 0.2); G.add(sprit);
    const sailM = lg3dLam(sailC, { side: THREE.DoubleSide, emissive: sailC.clone().multiplyScalar(0.12) });
    const masts = b.masts && b.masts.length ? b.masts : [0];
    const tall = b.len * (b.id === 'cutter' ? 1.05 : 0.85);
    masts.forEach((m, mi) => {
      const z = -m * b.len, mh = tall * (mi === masts.length - 1 && masts.length > 1 ? 0.92 : 1) * (masts.length === 3 && mi === 0 ? 0.88 : 1);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, mh, 7), wood); mast.position.set(0, Zd + mh / 2, z); G.add(mast);
      if (b.id === 'cutter') {
        // a gaff main and a jib
        const g = new THREE.Shape(); g.moveTo(0, 0); g.lineTo(L * 1.15, 0); g.lineTo(L * 0.85, mh * 0.62); g.lineTo(0, mh * 0.82); g.lineTo(0, 0);
        const sg = new THREE.ShapeGeometry(g); const sm = new THREE.Mesh(sg, sailM); sm.rotation.y = -Math.PI / 2; sm.position.set(0, Zd + 1.2, z + 0.3); G.add(sm); G.userData.main = sm;
        const j = new THREE.Shape(); j.moveTo(0, 0); j.lineTo(L * 0.95, 0); j.lineTo(0, mh * 0.75); j.lineTo(0, 0);
        const jm = new THREE.Mesh(new THREE.ShapeGeometry(j), sailM); jm.rotation.y = Math.PI / 2; jm.position.set(0, Zd + 0.9, z - 0.5); G.add(jm);
      } else {
        // square sails, stacked, each a little smaller, bellied forward
        const tiers = b.id === 'barque' ? 3 : 2;
        for (let t = 0; t < tiers; t++) {
          const w = B * 2.6 * (1 - t * 0.18), h = mh * 0.26 * (1 - t * 0.1), y = Zd + mh * (0.3 + t * 0.27);
          const pg = new THREE.PlaneGeometry(w, h, 6, 3), P = pg.attributes.position; for (let i = 0; i < P.count; i++) { const px = P.getX(i), py = P.getY(i); P.setZ(i, -Math.cos(px / w * Math.PI) * w * 0.12 * (0.7 + 0.3 * (py / h + 0.5))); } pg.computeVertexNormals();
          const sm = new THREE.Mesh(pg, sailM); sm.position.set(0, y + h / 2, z - 0.25); G.add(sm);
          const yd = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, w * 1.05, 5), wood); yd.rotation.z = Math.PI / 2; yd.position.set(0, y + h, z); G.add(yd);
        }
      }
      if (mi === 0 || mi === masts.length - 1) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ color: T.hex, side: THREE.DoubleSide })); fl.geometry.translate(1.8, 0, 0); fl.position.set(0, Zd + mh - 0.3, z); fl.rotation.y = -Math.PI / 2; G.add(fl); G.userData.flag = fl; }
    });
    const lan = lg3dGlow(sk.lantern || '#ffcf86', 3, 0.9); lan.position.set(0, Zd + 1.6, L * 0.95); G.add(lan);
  }
  // a ring on the water in her side's colour, so friend and foe show from anywhere
  const ring = new THREE.Mesh(new THREE.RingGeometry(b.len * 0.55, b.len * 0.55 + (s.me ? 1.6 : 1), 40), new THREE.MeshBasicMaterial({ color: T.hex, transparent: true, opacity: s.me ? 0.65 : 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; G.add(ring);
  return G;
}
// her wake (white foam) and the Gale's spray (her side's colour): two trails of points behind her
function lg3dTrail(col, n, size) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), cl = new Float32Array(n * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  const m = new THREE.PointsMaterial({ size, map: L3.soft, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData = { n, i: 0, age: new Float32Array(n).fill(9), col: new THREE.Color(col), vel: new Float32Array(n * 3) };
  L3.scene.add(p); return p;
}
function lg3dEmit(tr, x, y, z, vx, vy, vz) { const u = tr.userData, i = u.i; u.i = (i + 1) % u.n; const P = tr.geometry.attributes.position.array; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; u.vel[i * 3] = vx || 0; u.vel[i * 3 + 1] = vy || 0; u.vel[i * 3 + 2] = vz || 0; u.age[i] = 0; }
function lg3dTrailTick(tr, dt, life, grav) {
  const u = tr.userData, P = tr.geometry.attributes.position.array, C = tr.geometry.attributes.color.array;
  for (let i = 0; i < u.n; i++) {
    u.age[i] += dt; const f = Math.max(0, 1 - u.age[i] / life);
    if (f > 0) { P[i * 3] += u.vel[i * 3] * dt; P[i * 3 + 1] += u.vel[i * 3 + 1] * dt; P[i * 3 + 2] += u.vel[i * 3 + 2] * dt; if (grav) { u.vel[i * 3 + 1] -= grav * dt; if (P[i * 3 + 1] < 0.2) { P[i * 3 + 1] = 0.2; u.vel[i * 3 + 1] = 0; } } }
    C[i * 3] = u.col.r * f; C[i * 3 + 1] = u.col.g * f; C[i * 3 + 2] = u.col.b * f;
  }
  tr.geometry.attributes.position.needsUpdate = true; tr.geometry.attributes.color.needsUpdate = true;
}
// a new match: the ships built afresh
function lg3dMatch() {
  if (!L3.ok) return;
  for (const o of L3.ships) { L3.scene.remove(o.G); L3.scene.remove(o.wake); L3.scene.remove(o.spray); lg3dDispose(o.G); o.wake.geometry.dispose(); o.spray.geometry.dispose(); }
  L3.ships = LG.ships.map(s => { const G = lg3dShip(s); L3.scene.add(G); return { s, G, wake: lg3dTrail(0xd8e4ee, 90, 4.5), spray: lg3dTrail(LG_TEAMS[s.team].hex, 70, 3.4), et: 0 }; });
  for (const fx of L3.fx) L3.scene.remove(fx.p); L3.fx = [];
  L3.pads.forEach((q, i) => { if (LG.pads[i]) { q.p = LG.pads[i]; q.G.position.copy(lv(q.p.x, q.p.y, 0)); } });
  L3.camP = null;
}
function lg3dDispose(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) [].concat(c.material).forEach(m => m.dispose()); }); }
// a goal: a burst over the goal in the scorer's colour, and the lighthouse behind it flashes
function lg3dGoal(team) {
  if (!L3.ok) return;
  const B = LG.ball, p = lg3dTrail(LG_TEAMS[team].hex, 220, 3.2);
  for (let i = 0; i < 220; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 + 0.2, sp = 18 + Math.random() * 40; lg3dEmit(p, B.x, B.z, -B.y, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp); }
  const w = lg3dTrail(0x7a90a4, 70, 4); for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 10; lg3dEmit(w, B.x, 1, -B.y, Math.cos(a) * sp, 16 + Math.random() * 26, Math.sin(a) * sp); }
  L3.fx.push({ p, t: 0, life: 2.2, grav: 18 }, { p: w, t: 0, life: 1.8, grav: 30 });
  const H = L3.houses[1 - team]; if (H) H.userData.f = 1;
}

// ---------- every frame ----------
function lg3dDraw(dt) {
  if (!L3.ok || !LG.on) return;
  L3.wt += dt;
  // the water's swell
  const P = L3.water.geometry.attributes.position, A = P.array, B0 = L3.wbase, t = L3.wt;
  for (let i = 0; i < P.count; i++) { const x = B0[i * 3], y = B0[i * 3 + 1]; A[i * 3 + 2] = Math.sin(x * 0.07 + t * 1.3) * 0.22 + Math.sin(y * 0.05 - t * 0.9) * 0.28; }
  P.needsUpdate = true; if ((L3.nf = (L3.nf || 0) + 1) % 3 === 0) L3.water.geometry.computeVertexNormals();
  // the ships, their wakes and the Gale
  for (const o of L3.ships) {
    const s = o.s, G = o.G, V = s.v + s.bv;
    G.position.copy(lv(s.x, s.y, Math.sin(s.bob * 2.2) * 0.25));
    G.rotation.set(0, -s.h, 0); G.rotateZ(-s.rudder * 0.12 * Math.min(1, Math.abs(V) / 20) + Math.sin(s.bob * 1.3) * 0.02); G.rotateX(Math.sin(s.bob * 1.7) * 0.015);
    if (G.userData.flag) G.userData.flag.rotation.x = Math.sin(L3.wt * 8 + s.i) * 0.25;
    o.et += dt;
    const sh = Math.sin(s.h), ch = Math.cos(s.h), Ls = s.boat.len * 0.5, sx = s.x - sh * Ls, sy = s.y - ch * Ls;
    if (o.et > 0.04 && Math.abs(V) > 3) { o.et = 0; const w = s.boat.beam * 0.9; for (const k of [-1, 1]) lg3dEmit(o.wake, sx + ch * w * k, 0.35, -(sy - sh * w * k), ch * k * 1.2, 0, sh * k * 1.2); if (Math.abs(V) > 18) lg3dEmit(o.wake, s.x + sh * Ls, 0.4, -(s.y + ch * Ls), 0, 0.8, 0); }
    if (s.galeOn) for (let k = 0; k < 2; k++) lg3dEmit(o.spray, sx + (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, -sy, -sh * 18 + (Math.random() - 0.5) * 6, 3 + Math.random() * 4, ch * 18 + (Math.random() - 0.5) * 6);
    lg3dTrailTick(o.wake, dt, 2.4, 0); lg3dTrailTick(o.spray, dt, 0.7, 12);
  }
  // the ball
  const Bl = LG.ball, bm = L3.ball;
  bm.visible = !Bl.gone; L3.shadow.visible = !Bl.gone; L3.ballGlow.visible = !Bl.gone;
  if (!Bl.gone) {
    bm.position.copy(lv(Bl.x, Bl.y, Bl.z));
    const sp = Math.hypot(Bl.vx, Bl.vy); if (sp > 0.05) { const ax = new THREE.Vector3(-Bl.vy, 0, -Bl.vx).normalize(); bm.rotateOnWorldAxis(ax, sp * dt / LGC.R); }
    L3.shadow.position.copy(lv(Bl.x, Bl.y, 0.3)); const hz = Math.max(0, Bl.z - LGC.FLOAT); L3.shadow.scale.setScalar(Math.max(0.4, 1 - hz / 50)); L3.shadow.material.opacity = Math.max(0.1, 0.35 - hz / 150);
    L3.ballGlow.position.copy(bm.position);
  }
  // the gale buoys
  for (const q of L3.pads) { const up = q.p.t <= 0; q.glow.visible = up; q.ring.material.opacity = up ? 0.45 + 0.2 * Math.sin(L3.wt * 4 + q.p.x) : 0.08; q.f.position.y = 0.4 + Math.sin(L3.wt * 2 + q.p.y) * 0.2; q.f.rotation.y += dt * 0.8; }
  // the bursts
  for (const fx of L3.fx) { fx.t += dt; lg3dTrailTick(fx.p, dt, fx.life, fx.grav); }
  for (const fx of L3.fx.filter(f => f.t > f.life + 0.2)) { L3.scene.remove(fx.p); fx.p.geometry.dispose(); }
  L3.fx = L3.fx.filter(f => f.t <= f.life + 0.2);
  // the lighthouses: the beam turns, and the one behind a goal just scored flashes in the scorer's colour
  L3.houses.forEach((H, i) => { const u = H.userData; u.piv.rotation.y = L3.wt * 0.7 + i * Math.PI; if (u.f > 0) u.f = Math.max(0, u.f - dt * 0.45); u.flash.material.opacity = u.f > 0 ? u.f * (0.6 + 0.4 * Math.sin(L3.wt * 22)) : 0; if (u.f > 0) u.flash.material.color.set(LG_TEAMS[1 - i].hex); });
  lg3dCamera(dt);
  L3.r.render(L3.scene, L3.cam);
}
// the camera: behind your ship, looking at the ball (Ball cam) or the way she's heading (Ship cam); at the end of a
// match, round the pool from above
function lg3dCamera(dt) {
  const s = lgMeShip(), B = LG.ball; if (!s) return;
  let pos, look;
  if (LG.ph === 'end') {
    const a = L3.wt * 0.12; pos = lv(Math.sin(a) * 230, Math.cos(a) * 300, 150); look = lv(0, 0, 0);
  } else {
    const back = 30 + s.boat.len * 1.05, up = 15 + s.boat.len * 0.62;
    let dx = Math.sin(s.h), dy = Math.cos(s.h);
    const ballCam = LG.cam === 'ball' && !B.gone;
    if (ballCam) { const bx = B.x - s.x, by = B.y - s.y, d = Math.hypot(bx, by); if (d > 4) { dx = bx / d; dy = by / d; } }
    pos = lv(s.x - dx * back, s.y - dy * back, up);
    // (looking at the ball itself, from high enough that it shows over her sails; close in, a little past her bow)
    look = ballCam ? lv(B.x, B.y, Math.min(B.z, 30) * 0.6 + 2) : lv(s.x + dx * 40, s.y + dy * 40, 6);
    if (ballCam) { const d = Math.hypot(B.x - s.x, B.y - s.y); if (d < 40) look.lerp(lv(s.x + dx * 40, s.y + dy * 40, 3), 1 - d / 40); }
  }
  // inside the walls, so a ship backed against one doesn't put a wall between you and her
  if (LG.ph !== 'end') { pos.x = lgClamp(pos.x, -LGC.AX + 3, LGC.AX - 3); pos.z = lgClamp(pos.z, -LGC.AY - LGC.GD + 2, LGC.AY + LGC.GD - 2); }
  if (!L3.camP) { L3.camP = pos.clone(); L3.camL = look.clone(); }
  const k = 1 - Math.exp(-dt * (LG.ph === 'end' ? 1.5 : 6)), kl = 1 - Math.exp(-dt * 9);
  L3.camP.lerp(pos, k); L3.camL.lerp(look, kl);
  if (L3.camP.y < 3) L3.camP.y = 3;
  L3.cam.position.copy(L3.camP); L3.cam.lookAt(L3.camL);
}
