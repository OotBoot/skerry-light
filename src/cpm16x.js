'use strict';
// The Chronicle of the Light, mission 16 (The Harbour Pool): its world in 3D, every screen. All of it lies in gwsail's
// sea group (GW3.SG: the sea's frame, placed each frame by the inverse of the cutter's pose), built by the leg's b3
// (m16Build) and moved by its f3 (m16F3); a little more on the cutter's own deck (m16Deck3d: the Gale cask).
//  - The Harbour Pool: its sea walls (src/cpm16.js m16Pool) with a walk along the top and lamps every thirty yards, the
//    crowd along the top, the two goals (posts, crossbar, net, a glow on the water in each side's colour), the two
//    little lighthouses behind them (Skerry League's own, src/league3d.js lg3dHouse: one banded blue, one orange,
//    flashing when a goal goes into the mouth in front of it), the yellow gale buoys, the boom across the gap (the
//    match only), and the great striped buoy itself (lg3dBallTex).
//  - The Patience: Skerry League's brig (src/league3d.js lg3dShip) in Orange's colours.
//  - Out in the fog: the Hound's mooring spar and its ring, the packet Sorrel's lamps, Kittow's gigs and their lines,
//    and his lugger the Rook (src/cpm03.js cplBrig, a lugger, her sails tarred black).
// The fog and the light: the match's evening dimming as it goes (and darker once the fog stands off), the fog itself in
// II and III (src/cpm01.js cpaNight, its dome too).
// Frame to three.js: the sea's (x, y, z up) is (x, z, -y) in the sea group (gsv); a heading h is rotation.y = -h for a
// model whose bow is -z (lg3dShip), and PI / 2 - h for one whose bow is +x (cplBrig).

var M16G = { on: false };
function m16x3dExit() { M16G.on = false; M16G.k = null; }
// (Skerry League's soft glow texture, which its houses and ships are drawn with, made here if the League hasn't been played)
function m16Soft() { if (typeof L3 !== 'undefined' && !L3.soft && typeof lg3dSoftTex === 'function') L3.soft = lg3dSoftTex(); }
// the crowd: little figures in a row along the wall tops, instanced
function m16Crowd(SG, P) {
  const spots = [];
  const R = seeded(0x16c);
  for (const s of P.segs) { if (s.kind !== 'wall') continue; const n = Math.floor(s.L / 3.2); for (let i = 1; i < n; i++) { if (R() < 0.35) continue; const t = i / n, x = s.ax + (s.bx - s.ax) * t - s.nx * (1.2 + R() * 2.6), y = s.ay + (s.by - s.ay) * t - s.ny * (1.2 + R() * 2.6); if (Math.abs(x - C16.PC[0]) < 30 && y > C16.PC[1]) continue; spots.push([x, y, R()]); } }
  const n = spots.length, body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.36, 1.35, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), n), head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
  const coats = ['#3a2c22', '#2e3440', '#4a3a2a', '#5a2a22', '#283848', '#5a5040', '#3a4a5a', '#6a3a2a', '#d8c8a8', '#4aa8ff', '#ff8c3a'], skin = ['#d8b090', '#c89878', '#e8c8a8'], m = new THREE.Matrix4(), col = new THREE.Color();
  spots.forEach(([x, y, r], i) => { const top = C16.WALLH + 0.8; m.makeTranslation(x, top + 0.68, -y); body.setMatrixAt(i, m); col.set(coats[(r * 97 | 0) % coats.length]).multiplyScalar(0.7); body.setColorAt(i, col); m.makeTranslation(x, top + 1.56, -y); head.setMatrixAt(i, m); col.set(skin[(r * 13 | 0) % 3]).multiplyScalar(0.7); head.setColorAt(i, col); });
  SG.add(body); SG.add(head); return { body, head, spots };
}
// the markings on the water: the halfway line, the centre ring, a box before each goal, faint
function m16Marks() {
  const { AL, AW } = C16, W2 = 512, H2 = Math.round(512 * AW / AL), c = document.createElement('canvas'); c.width = W2; c.height = H2;
  const x = c.getContext('2d'), kx = W2 / (AL * 2), ky = H2 / (AW * 2), X = v => (v + AL) * kx, Y = v => H2 - (v + AW) * ky;
  x.clearRect(0, 0, W2, H2); x.strokeStyle = 'rgba(240,246,255,0.9)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(X(0), Y(-AW)); x.lineTo(X(0), Y(AW)); x.stroke();
  x.beginPath(); x.ellipse(X(0), Y(0), 24 * kx, 24 * ky, 0, 0, 6.283); x.stroke();
  for (const sg of [-1, 1]) x.strokeRect(X(sg > 0 ? AL - 30 : -AL), Y(C16.GW / 2 + 16), 30 * kx, (C16.GW + 32) * ky);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(AL * 2, AW * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.28, depthWrite: false, fog: true }));
  m.rotation.x = -Math.PI / 2; m.position.set(C16.PC[0], 0.34, -C16.PC[1]); return m;
}
// a gale buoy: a squat yellow can with a ring of light on the water round it
function m16Pad(SG, P, G) {
  const g0 = new THREE.Group(), s = P.big ? 1.7 : 1.05; g0.position.set(P.x, 0, -P.y); SG.add(g0);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(1.0 * s, 1.3 * s, 1.4 * s, 10), z3Lam('#f0c840', { emissive: 0x4a3400 })); can.position.y = 0.45 * s; g0.add(can);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 1.0 * s, 8), z3Lam('#2a2a2c')); cap.position.y = 1.6 * s; g0.add(cap);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3 * s, 3.7 * s, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); ring.position.y = 0.38; g0.add(ring);
  const glow = G.glowSp(0xffe080, 6 * s, { opacity: 0.45 }); glow.position.y = 2.2 * s; g0.add(glow);
  return { g: g0, can, ring, glow, s };
}
// a gig of Kittow's: a long low pulling boat, four at the oars and one at the tiller, her oars working
function m16GigMesh() {
  const g0 = new THREE.Group(), hull = z3Lam('#2a2018'), trim = z3Lam('#5a4630'), coat = z3Lam('#2a2622'), face = z3Lam('#c89878');
  const sh = new THREE.Shape(), L = 4.2, B = 1.05; sh.moveTo(0, -L); sh.quadraticCurveTo(B * 1.1, -L * 0.3, B, L * 0.55); sh.lineTo(B * 0.7, L); sh.lineTo(-B * 0.7, L); sh.lineTo(-B, L * 0.55); sh.quadraticCurveTo(-B * 1.1, -L * 0.3, 0, -L);
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false }); hg.rotateX(Math.PI / 2); const hm = new THREE.Mesh(hg, hull); hm.position.y = 0.55; g0.add(hm);
  const rl = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 4, 20), trim); rl.scale.set(B, L * 0.95, 1); rl.rotation.x = Math.PI / 2; rl.position.y = 0.58; g0.add(rl);
  const oars = [];
  for (let i = 0; i < 4; i++) { const z = -1.8 + i * 1.2, s = i % 2 ? 1 : -1;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.8, 6), coat); b.position.set(0, 0.95, z); g0.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), face); h.position.set(0, 1.5, z); g0.add(h);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 6), coat); cap.position.set(0, 1.66, z); g0.add(cap);
    const oar = new THREE.Group(); oar.position.set(s * 0.9, 0.7, z); g0.add(oar);
    const sh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 4).rotateZ(Math.PI / 2), trim); sh2.position.x = s * 1.5; oar.add(sh2); oars.push({ g: oar, s, ph: i * 0.4 }); }
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.9, 6), coat); helm.position.set(0, 1.0, 3.3); g0.add(helm);
  const lan = new THREE.Sprite(new THREE.SpriteMaterial({ map: GW3.soft, color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); lan.scale.setScalar(2.4); lan.position.set(0.4, 1.6, 3.4); g0.add(lan);
  return { g: g0, oars, lan };
}
// a line from a boat to the buoy
function m16Line3() { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6 * 3), 3)); const L = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x8a7a5a })); L.frustumCulled = false; return L; }
function m16LineSet(L, a, b, sag) { const P = L.geometry.attributes.position; for (let i = 0; i < 6; i++) { const t = i / 5; P.setXYZ(i, a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t - Math.sin(t * Math.PI) * (sag || 0.6), -(a[1] + (b[1] - a[1]) * t)); } P.needsUpdate = true; }

// ---------- building it all (the leg's b3) ----------
function m16Build(SG, G, k) {
  m16Soft();
  const Q = M16G; Q.on = true; Q.k = k; Q.SG = SG;
  const P = m16Pool(), stone = z3Lam('#7a766e'), stone2 = z3Lam('#5e5a54'), capM = z3Lam('#a49c8c'), iron = z3Lam('#2a2826');
  // the sea walls: a block along every run, a walk along the top, and its lamps
  Q.lamps = [];
  for (const s of P.segs) {
    if (s.kind !== 'wall') continue;
    const TH = C16.TH, h = C16.WALLH + 6, mx = (s.ax + s.bx) / 2 - s.nx * TH / 2, my = (s.ay + s.by) / 2 - s.ny * TH / 2, a = Math.atan2(s.by - s.ay, s.bx - s.ax);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.L + TH * 0.9, h, TH), stone); m.position.set(mx, h / 2 - 6, -my); m.rotation.y = a; SG.add(m);
    const cp = new THREE.Mesh(new THREE.BoxGeometry(s.L + TH, 0.7, TH + 1), capM); cp.position.set(mx, C16.WALLH + 0.35, -my); cp.rotation.y = a; SG.add(cp);
    // (a band of weed and wet stone at the waterline)
    const wl = new THREE.Mesh(new THREE.BoxGeometry(s.L + TH * 0.9, 1.4, 0.3), z3Lam('#2a3a2a')); wl.position.set(mx + s.nx * (TH / 2 + 0.05), 0.4, -(my + s.ny * (TH / 2 + 0.05))); wl.rotation.y = a; SG.add(wl);
    const n = Math.max(1, Math.round(s.L / 28));
    for (let i = 0; i <= n; i++) { if (s.L < 24 && i) continue; const t = n ? i / n : 0.5, x = s.ax + (s.bx - s.ax) * t - s.nx * 1.2, y = s.ay + (s.by - s.ay) * t - s.ny * 1.2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.4, 6), iron); post.position.set(x, C16.WALLH + 2.4, -y); SG.add(post);
      const gl = G.glowSp(0xffd08a, 4.2, { opacity: 0.85 }); gl.position.set(x, C16.WALLH + 4.3, -y); SG.add(gl);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })); bulb.position.copy(gl.position); SG.add(bulb); Q.lamps.push({ gl, bulb }); }
  }
  // the ends of the gap: the wall's dressed ends, and the stumps where the gates' pintles were set and never used
  for (const x of C16.GAP) { const e = new THREE.Mesh(new THREE.BoxGeometry(1.2, C16.WALLH + 6.8, C16.TH + 1.4), stone2); e.position.set(x, (C16.WALLH + 6.8) / 2 - 6, -(m16Y1() + C16.TH / 2)); SG.add(e);
    for (const z of [1.5, 4.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6).rotateZ(Math.PI / 2), iron); p.position.set(x + (x < C16.PC[0] ? 0.8 : -0.8), z, -(m16Y1() + 0.2)); SG.add(p); } }
  // the goals: the posts and crossbar, the net over the box, a glow on the water in the side's colour; the lighthouse behind
  Q.houses = [];
  const T = [{ hex: 0x4aa8ff }, { hex: 0xff8c3a }];
  for (const tm of [0, 1]) {
    const sg = tm ? 1 : -1, x0 = tm ? m16X1() : m16X0(), gw = C16.GW / 2, BAR = C16.BAR, GD = C16.GD, post = z3Lam('#f2efe6', { emissive: 0x302820 }), y0 = C16.PC[1];
    for (const py of [y0 - gw, y0 + gw]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, BAR + 3, 10), post); p.position.set(x0, (BAR + 3) / 2 - 3, -py); SG.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, C16.GW, 10).rotateX(Math.PI / 2), post); bar.position.set(x0, BAR, -y0); SG.add(bar);
    const L = [], st = 3.2, v = (x, y, z) => new THREE.Vector3(x, z, -y);
    for (let y = y0 - gw; y <= y0 + gw + 0.01; y += st) L.push(v(x0, y, BAR), v(x0 + sg * GD, y, BAR), v(x0 + sg * GD, y, BAR), v(x0 + sg * GD, y, 0));
    for (let z = 0; z <= BAR + 0.01; z += st) L.push(v(x0 + sg * GD, y0 - gw, z), v(x0 + sg * GD, y0 + gw, z));
    for (let d = 0; d <= GD + 0.01; d += st) { L.push(v(x0 + sg * d, y0 - gw, BAR), v(x0 + sg * d, y0 + gw, BAR)); for (const y of [y0 - gw, y0 + gw]) L.push(v(x0 + sg * d, y, 0), v(x0 + sg * d, y, BAR)); }
    for (let z = 0; z <= BAR + 0.01; z += st) for (const y of [y0 - gw, y0 + gw]) L.push(v(x0, y, z), v(x0 + sg * GD, y, z));
    SG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(L), new THREE.LineBasicMaterial({ color: T[tm].hex, transparent: true, opacity: 0.6 })));
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(GD, C16.GW).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: T[tm].hex, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); gl.position.set(x0 + sg * GD / 2, 0.4, -y0); SG.add(gl);
    // (a lintel over the mouth, to carry the wall's walk across)
    const lint = new THREE.Mesh(new THREE.BoxGeometry(C16.TH, 3.4, C16.GW + 6), stone2); lint.position.set(x0 + sg * (GD + C16.TH / 2), C16.WALLH + 0.2, -y0); SG.add(lint);
    let H = null;
    try { if (typeof lg3dHouse === 'function') { H = lg3dHouse({ hex: T[tm].hex }); const [hx, hy] = P.houses[tm]; H.position.set(hx, 0, -hy); H.scale.setScalar(0.62); SG.add(H); } } catch (e) { H = null; }
    Q.houses[tm] = H;
  }
  SG.add(m16Marks());
  Q.crowd = m16Crowd(SG, P);
  // the gale buoys
  Q.pads = C16_PADS.map(p => m16Pad(SG, p, G));
  // the boom across the gap (the match only): spars chained end to end on the water
  Q.boom = null;
  if (k === 'match') { const B0 = Q.boom = new THREE.Group(); SG.add(B0); const w = C16.GAP[1] - C16.GAP[0];
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, w / 4 + 0.4, 8).rotateZ(Math.PI / 2), z3Lam('#4a3a28')); l.position.set(C16.GAP[0] + w * (i + 0.5) / 4, 0.3, -(m16Y1() - 0.6)); l.rotation.y = (i % 2 ? 0.04 : -0.04); B0.add(l); } }
  // the ball, its shadow on the water, and a glow so it shows at dusk
  { const tex = typeof lg3dBallTex === 'function' ? lg3dBallTex() : null;
    Q.ball = new THREE.Mesh(new THREE.SphereGeometry(C16.R, 32, 20), new THREE.MeshPhongMaterial({ map: tex, color: tex ? 0xffffff : 0xd8402c, shininess: 50, emissive: 0x2a2018 })); SG.add(Q.ball);
    Q.shadow = new THREE.Mesh(new THREE.CircleGeometry(C16.R, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })); Q.shadow.position.y = 0.36; SG.add(Q.shadow);
    Q.ballGlow = G.glowSp(0xfff0c8, C16.R * 3, { opacity: 0.18 }); SG.add(Q.ballGlow);
    // (the old marker's iron cage on top, and the eye its chain shackles to)
    Q.cage = new THREE.Group(); Q.ball.add(Q.cage);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 5), iron); const a = i / 4 * 6.283; r.position.set(Math.cos(a) * 0.9, C16.R + 1.4, Math.sin(a) * 0.9); r.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); Q.cage.add(r); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.1, 5, 14).rotateX(Math.PI / 2), iron); rim.position.y = C16.R + 3; Q.cage.add(rim);
    Q.cageLamp = G.glowSp(0xffd890, 5, { opacity: 0 }); Q.cageLamp.position.y = C16.R + 2.6; Q.cage.add(Q.cageLamp); }
  // the ships: the Patience (Orange's), and in the last part the Rook
  Q.ships = [];
  try { if (typeof lg3dShip === 'function' && typeof BOAT_BY_ID !== 'undefined') { const S = lg3dShip({ boat: BOAT_BY_ID.brig, skin: typeof lgSkinOf === 'function' ? lgSkinOf('brig', false) : {}, team: 1, me: false }); S.scale.setScalar(1.35); S.traverse(o => { if (o.geometry && o.geometry.parameters && o.geometry.parameters.phiSegments != null && o.material) o.material.opacity = 0.12; }); SG.add(S); Q.ships[0] = S; } } catch (e) { console.warn('m16 patience', e); }
  if (k === 'rook') { try { const R0 = cplBrig({ lug: true }); R0.scale.setScalar(1.25); R0.traverse(o => { if (o.material && o.material.color && o.material.side === THREE.DoubleSide) o.material.color.set(0x2a2622); }); SG.add(R0); Q.ships[1] = R0; Q.rookFire = []; for (let i = 0; i < 4; i++) { const f = G.glowSp(0xffc070, 3, { opacity: 0 }); SG.add(f); Q.rookFire.push(f); } Q.rookLan = G.glowSp(0xff9050, 5, { opacity: 0.8 }); SG.add(Q.rookLan); Q.rookLine = m16Line3(); SG.add(Q.rookLine); } catch (e) { console.warn('m16 rook', e); } }
  // out in the fog: the Hound's spar and its ring, the packet's lamps, Kittow's gigs
  Q.moor = null; Q.gigs = []; Q.sorrel = null;
  if (k !== 'match') {
    const [mx, my] = C16.MOOR, g0 = Q.moor = new THREE.Group(); g0.position.set(mx, 0, -my); SG.add(g0);
    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 9, 7), z3Lam('#3a3026')); spar.position.set(-C16.MOOR_R - 3, 3.5, 0); spar.rotation.z = 0.08; g0.add(spar);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), z3Lam('#c8c0a8')); tip.position.set(-C16.MOOR_R - 2.6, 8.2, 0); g0.add(tip);
    Q.moorRing = new THREE.Mesh(new THREE.RingGeometry(C16.MOOR_R - 0.8, C16.MOOR_R, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); Q.moorRing.position.y = 0.4; g0.add(Q.moorRing);
    Q.chain = m16Line3(); SG.add(Q.chain);
    // the packet: her masthead light and her red and green, and the loom of her
    const so = Q.sorrel = new THREE.Group(); SG.add(so);
    for (const [x, y, c, s] of [[0, 14, 0xfff4e0, 3.2], [-3.4, 4, 0xff4030, 2.2], [3.4, 4, 0x40ff70, 2.2], [0, 9, 0xffd8a0, 1.6]]) { const L = G.glowSp(c, s, { opacity: 0 }); L.position.set(x, y, 0); so.add(L); }
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 36), z3Lam('#14161a', { transparent: true, opacity: 0 })); hull.position.y = 1.4; so.add(hull);
    for (let i = 0; i < 4; i++) { const G2 = m16GigMesh(); G2.g.visible = false; SG.add(G2.g); G2.line = m16Line3(); G2.line.visible = false; SG.add(G2.line); Q.gigs.push(G2); }
  }
}
// ---------- each frame (the leg's f3) ----------
function m16F3(dt, V, k) {
  const Q = M16G, S = RAID.st, M = S.m16; if (!Q.on || !M) return;
  const t = g.t, b = M.ball;
  // the ball: floating and rolling with its way, its glow, its shadow under it
  if (Q.ball) { Q.ball.position.set(b.x, b.z - (reduceMotion ? 0 : Math.sin(t * 1.3 + b.x) * 0.12), -b.y); Q.ball.rotation.set(-b.rx, 0, b.ry); Q.cage.rotation.set(b.rx, 0, -b.ry);
    Q.shadow.position.set(b.x, 0.36, -b.y); const up = clamp((b.z - C16.FLOAT) / 20, 0, 1); Q.shadow.scale.setScalar(1 - up * 0.5); Q.shadow.material.opacity = 0.32 * (1 - up);
    Q.ballGlow.position.set(b.x, b.z + 1, -b.y); Q.ballGlow.material.opacity = k === 'match' ? 0.12 : 0.28;
    Q.cageLamp.material.opacity = b.moor || k !== 'match' ? 0.7 + 0.25 * Math.sin(t * 2) : 0; }
  // the gale buoys: shown while they're there to take, flickering back as they come again
  if (Q.pads) Q.pads.forEach((p, i) => { const off = M.galeOn ? (M.pads[i] > 0) : true; const s = off ? 0.25 : 1; p.can.visible = M.galeOn; p.ring.visible = !off; p.glow.material.opacity = off ? 0 : 0.35 + 0.15 * Math.sin(t * 3 + i); p.ring.material.opacity = 0.35 + 0.2 * Math.sin(t * 2.4 + i); p.ring.scale.setScalar(1 + 0.06 * Math.sin(t * 2 + i)); p.can.scale.setScalar(s * 0.4 + 0.6); p.g.position.y = reduceMotion ? 0 : Math.sin(t * 1.5 + i) * 0.1;
    if (M.padFx && M.padFx[0] === i && t - M.padFx[1] < 0.6) p.glow.material.opacity = 1 - (t - M.padFx[1]) / 0.6; });
  // the lighthouses: their beams going round; the one behind the mouth a goal went into, flashing
  if (Q.houses) Q.houses.forEach((H, tm) => { if (!H || !H.userData) return; const U = H.userData; U.piv.rotation.y = t * 0.8 + tm * 2; const fx = M.goalFx && (1 - M.goalFx[0]) === tm ? t - M.goalFx[1] : 99, on = fx < 3.2;
    U.flash.material.opacity = on ? (Math.sin(fx * 14) > 0 ? 0.85 : 0.1) * (1 - fx / 3.2) : 0; U.glow.material.opacity = 0.75 + (on ? 0.25 : 0); });
  // the crowd stirring: on its feet for a goal
  if (Q.crowd && M.goalFx && t - M.goalFx[1] < 3) { const C = Q.crowd, m4 = new THREE.Matrix4(), top = C16.WALLH + 0.8; C.spots.forEach(([x, y, r], i) => { const j = Math.max(0, Math.sin((t - M.goalFx[1]) * 9 + r * 30)) * 0.4; m4.makeTranslation(x, top + 0.68 + j, -y); C.body.setMatrixAt(i, m4); m4.makeTranslation(x, top + 1.56 + j, -y); C.head.setMatrixAt(i, m4); }); C.body.instanceMatrix.needsUpdate = true; C.head.instanceMatrix.needsUpdate = true; }
  // the boom: there until it's hauled aside
  if (Q.boom) Q.boom.visible = !M.boomOff;
  // the ships
  (M.ships || []).forEach((N, i) => { const o = Q.ships[i]; if (!o) return; o.visible = !!N && !N.gone && N.show !== 0; if (!o.visible) return;
    o.position.set(N.x, reduceMotion ? 0 : Math.sin(t * 0.9 + i) * 0.15, -N.y); o.rotation.set(reduceMotion ? 0 : Math.sin(t * 0.7 + i) * 0.02, i === 1 ? Math.PI / 2 - N.h : -N.h, (reduceMotion ? 0 : Math.sin(t * 0.8 + i) * 0.025) - clamp(N.w, -1, 1) * 0.06); });
  if (Q.ships[0] && M.ships[0] && Q.ships[0].userData.flag) Q.ships[0].userData.flag.rotation.y = -Math.PI / 2 + Math.sin(t * 6) * 0.25;
  // the light: the evening in the match, wearing on, and the fog standing off once Blue has two
  if (k === 'match') {
    const L = GWS_LEG, dusk = clamp(M.t / 420, 0, 1), fogOff = M.score[0] >= 2 ? clamp((M.t - (M.f1T || M.t)) / 30, 0, 1) : 0;
    if (L) L.amb = [0.86 - 0.22 * dusk - 0.12 * fogOff, 0.5 - 0.15 * dusk];
    const F = GL3D.scene && GL3D.scene.fog; if (F) { F.color.setRGB(0.36 - 0.1 * dusk, 0.3 - 0.06 * dusk, 0.38 - 0.06 * dusk); F.far = 1400 - 700 * fogOff; if (cpCineOn() && CPN.on) { const Sh = CPN.on.shots[CPN.shot] || {}, ff = Sh.fogFar != null ? Sh.fogFar : CPN.on.fogFar; if (ff != null) F.far = ff; } F.near = F.far * 0.22; }
    if (GL3D.amb) GL3D.amb.color.setRGB(1, 0.9 - 0.05 * dusk, 0.82);
  } else { cpaNight(C16_LOOK[k].far, C16_LOOK[k].fog, null, dt); if (GL3D.amb) GL3D.amb.color.setRGB(0.85, 0.9, 1); }
  m16Deck3dTick(M);
  if (typeof m16F3More === 'function') m16F3More(dt, V, k, Q, S, M);
}
// ---------- the Gale cask on the cutter's deck (and her pennant in Blue) ----------
function m16Deck3d() {
  if (!GW3.DG) return;
  const DG = GW3.DG, D = GWS.D, [u, v] = C16.CASK, c0 = new THREE.Group(); c0.position.copy(gdv(u, v, D)); DG.add(c0);
  const wood = z3Lam('#7a5a34'), hoop = z3Lam('#e8c040', { emissive: 0x3a2a00 }), brass = z3Lam('#9a7a34', { emissive: 0x1a1206 });
  const cask = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 12).rotateZ(Math.PI / 2), wood); cask.position.y = 0.62; c0.add(cask);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.47, 12, 8), wood); belly.scale.set(1, 0.92, 0.92); belly.position.y = 0.62; c0.add(belly);
  for (const x of [-0.36, 0, 0.36]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 5, 16).rotateY(Math.PI / 2), hoop); h.position.set(x, 0.62, 0); c0.add(h); }
  for (const x of [-0.3, 0.3]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.9), z3Lam('#3a2a1a')); ch.position.set(x, 0.15, 0); c0.add(ch); }
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6).rotateX(Math.PI / 2), brass); tap.position.set(0, 0.62, 0.52); c0.add(tap);
  M16G.caskGlow = GW3.glowSp(0xffe080, 1.6, { opacity: 0 }); M16G.caskGlow.position.set(0, 0.9, 0.3); c0.add(M16G.caskGlow);
  // (the gust: streaks of spray driven forward past her when it's let go)
  M16G.gust = []; for (let i = 0; i < 14; i++) { const s = GW3.glowSp(0xe8f4ff, 1.4, { opacity: 0 }); DG.add(s); M16G.gust.push({ s, u: (Math.random() - 0.5) * 6, z: 1 + Math.random() * 6, ph: Math.random() }); }
  if (GW3.pen && GW3.pen.material) GW3.pen.material.color.set(0x4aa8ff);
  M16G.deck = true;
}
// (each frame, from m16F3More's caller too) the cask glowing while it's full enough, the gust while it blows
function m16Deck3dTick(M) {
  if (!M16G.deck || !M) return;
  const t = g.t;
  if (M16G.caskGlow) M16G.caskGlow.material.opacity = M.galeOn && M.gale >= C16.GALE_COST ? 0.35 + 0.2 * Math.sin(t * 3) : 0;
  const blow = M.galeT > 0 ? Math.min(1, M.galeT / 0.4) : 0;
  for (const G of M16G.gust || []) { const k = (t * 1.6 + G.ph) % 1; G.s.position.copy(gdv(G.u, -14 + k * 32, GWS.D + G.z)); G.s.scale.set(0.6, 0.6, 1); G.s.material.opacity = blow * 0.5 * Math.sin(k * Math.PI); }
}
