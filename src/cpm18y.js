'use strict';
// The Chronicle of the Light, mission 18: Slack Water, its 3D and its cinematics (the Race is src/cpm18.js, the parts
// src/cpm18x.js).
// The world (C18W, built by c18Build3D into the stage's own group, drawn each frame by c18Draw3D on every screen):
//  - the two rocks, each one solid piece cut from the rocks' own outline (c18Outline) and standing a few feet out of
//    the sea, with boulders all round their edges and weed at the waterline;
//  - the two causeways, flagstones on a bank, that sink and rise with the tide (RAID.st.tide; a cinematic may set
//    C18W.cTide), with iron perches along them so they can be seen when they're under; the Race running white between
//    the rocks at high water and nearly still at slack;
//  - the six towers, Skerry Clash's own (src/rlcrates.js rlTowerMesh, three times its size): yours whitewash and red,
//    his granite; each lamp lit or dark, the Great Lights' beams turning, his towers' red aim lines when they lay on
//    someone, your towers' shots, and each tower's fall into rubble (C18W.fallAt, the moment it fell);
//  - his birds (Skerry Clash's gull), the powder kegs set and burning, his hands' rings where they're being set down,
//    the thing you carry, and the grey seal on the skerry in the middle of the Race.
// The cinematics: m18_intro, m18_second (the far light kindles), m18_turn (the first slack water over, and every one
// after), m18_cross (the next slack water), m18_champ (Plimsoll out of the surf), m18_yield (he looks from one light
// to the other) and m18_outro. Their own actors are in C18W.cineGrp, out of the cinematics' group, since Skerry Clash's
// models share materials with the game itself.

var C18W = { on: false, lampZ: [0, 0], fallAt: {}, litAt: {}, cineGrp: null, cTide: null, cLit: null, cUp: null, tex: null };

// ---------- textures (made once, kept) ----------
function c18Tex(kind) {
  C18W.tex = C18W.tex || {};
  if (C18W.tex[kind]) return C18W.tex[kind];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), r = seeded(kind === 'rock' ? 0x18a : 0x18b);
  if (kind === 'rock') {
    x.fillStyle = '#4a4c4c'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { const s = 4 + r() * 22, v = 50 + r() * 40 | 0, gg = v + (r() < 0.25 ? 8 : 0); x.fillStyle = `rgba(${v},${gg},${v - 2},${0.25 + r() * 0.4})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, s, s * (0.4 + r() * 0.6), r() * 3, 0, 6.3); x.fill(); }
    for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(20,22,24,${0.3 + r() * 0.4})`; x.lineWidth = 1 + r() * 2; x.beginPath(); let px = r() * 256, py = r() * 256; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(${150 + r() * 40},${150 + r() * 40},${120 + r() * 30},${0.12 + r() * 0.15})`; x.beginPath(); x.arc(r() * 256, r() * 256, 1 + r() * 4, 0, 6.3); x.fill(); }   // (lichen)
  } else {
    x.fillStyle = '#3a3a36'; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) { let px = -r() * 30; while (px < 256) { const w = 26 + r() * 30, v = 70 + r() * 30 | 0; x.fillStyle = `rgb(${v},${v - 2},${v - 8})`; x.fillRect(px + 2, row * 32 + 2, w - 4, 28); x.fillStyle = 'rgba(40,70,40,0.25)'; x.fillRect(px + 2, row * 32 + 22, w - 4, 8); px += w; } }
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(30,50,30,${r() * 0.3})`; x.fillRect(r() * 256, r() * 256, 2 + r() * 6, 2 + r() * 4); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.keep = true;
  return (C18W.tex[kind] = t);
}
const c18Glow = (c0, c1) => new THREE.SpriteMaterial({ map: z3Soft(c0, c1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });

// =====================================================================================================================
// built (every screen, as the stage's world is made)
// =====================================================================================================================
function c18Build3D(grp) {
  C18W.on = false;
  const G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, r = seeded(0x18e);
  const W = new THREE.Group(); grp.add(W); C18W.grp = W;
  // ---- the rocks ----
  const rockM = new THREE.MeshLambertMaterial({ color: 0x9a9a96, map: c18Tex('rock') });
  for (const s of [-1, 1]) {
    const P = c18Outline(s, 1.4), sh = new THREE.Shape();
    P.forEach(([x, y], i) => i ? sh.lineTo(CX + x, CY + y) : sh.moveTo(CX + x, CY + y));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, G0 - 3.4, 0);
    const T = rockM.map; T.repeat.set(1 / 7, 1 / 7);
    W.add(new THREE.Mesh(geo, rockM));
  }
  // ---- boulders round the edges, and weed at the waterline ----
  {
    const bg = new THREE.IcosahedronGeometry(1, 0), bm = new THREE.MeshLambertMaterial({ color: 0x55575a, flatShading: true });
    const wg = new THREE.IcosahedronGeometry(1, 0), wm = new THREE.MeshLambertMaterial({ color: 0x2c3a24, flatShading: true });
    const pts = []; for (const s of [-1, 1]) for (const [x, y] of c18Outline(s, 2.6)) { if (Math.abs(y) < C18.RY && Math.min(Math.abs(x - C18.CW), Math.abs(x + C18.CW)) < C18.CWH + 1.2) continue; pts.push([x, y, s]); }
    const B = new THREE.InstancedMesh(bg, bm, pts.length * 2), Wd = new THREE.InstancedMesh(wg, wm, pts.length), o = new THREE.Object3D();
    let n = 0;
    pts.forEach(([x, y, s], i) => {
      for (let k = 0; k < 2; k++) { const dx = x / C18.RX, dy = (Math.abs(y) - C18.RY) / C18.RD, L = Math.hypot(dx, dy) || 1, out = (k ? 1.4 : 0.3) + r() * 0.8, sc = (k ? 0.8 : 1.2) + r() * 0.9;
        o.position.copy(z3v(CX + x + dx / L * out, CY + y + s * dy / L * out, G0 - (k ? 1.0 : 0.35) - r() * 0.4)); o.rotation.set(r() * 3, r() * 3, r() * 3); o.scale.set(sc, sc * (0.5 + r() * 0.4), sc * (0.8 + r() * 0.4)); o.updateMatrix(); B.setMatrixAt(n++, o.matrix); }
      const dx = x / C18.RX, dy = (Math.abs(y) - C18.RY) / C18.RD, L = Math.hypot(dx, dy) || 1;
      o.position.copy(z3v(CX + x + dx / L * 1.6, CY + y + s * dy / L * 1.6, -0.15)); o.rotation.set(0, r() * 3, 0); o.scale.set(1.4 + r(), 0.25, 1.2 + r()); o.updateMatrix(); Wd.setMatrixAt(i, o.matrix);
    });
    B.count = n; W.add(B); W.add(Wd);
  }
  // ---- the causeways, and their perches ----
  C18W.cw = [];
  const flagM = new THREE.MeshLambertMaterial({ color: 0xa8a49a, map: c18Tex('flag') }), bankM = new THREE.MeshLambertMaterial({ color: 0x3e3c38 }), ironM = z3Lam('#2a2a2c'), capM = z3Lam('#8a3a26');
  for (const cx of [-C18.CW, C18.CW]) {
    const f = c18Front(cx) + 2, g2 = new THREE.Group(); W.add(g2);
    const top = new THREE.Mesh(new THREE.BoxGeometry(C18.CWH * 2, 0.3, f * 2), flagM); top.position.y = -0.15; g2.add(top);
    const tg = top.geometry, uv = tg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * C18.CWH * 2 / 8, uv.getY(k) * f * 2 / 8); uv.needsUpdate = true;
    const bank = new THREE.Mesh(new THREE.BoxGeometry(C18.CWH * 2 + 1.4, 3, f * 2), bankM); bank.position.y = -1.8; g2.add(bank);
    for (let y = -C18.RY + C18.RD - 1; y <= C18.RY - C18.RD + 1; y += 5) for (const sd of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), ironM); p.position.set(sd * (C18.CWH + 0.35), 0.6, -y); g2.add(p);
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), capM); c.position.set(sd * (C18.CWH + 0.35), 2.3, -y); g2.add(c);
    }
    g2.position.copy(z3v(CX + cx, CY, G0)); C18W.cw.push(g2);
  }
  // ---- the Race running between: white streaks, faster and thicker at high water ----
  C18W.foam = [];
  {
    const fm = new THREE.MeshBasicMaterial({ map: z3Soft('rgba(230,240,245,0.9)', 'rgba(230,240,245,0)'), transparent: true, depthWrite: false, opacity: 0.4, fog: true });
    for (let i = 0; i < 44; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fm.clone()); m.rotation.x = -Math.PI / 2; W.add(m); C18W.foam.push({ m, x: (r() - 0.5) * 120, y: (r() - 0.5) * 20, l: 6 + r() * 12, w: 0.4 + r() * 0.8, k: 0.6 + r() * 0.8 }); }
    // (and white water broken on the causeways as they come up)
    C18W.brk = [];
    for (const cx of [-C18.CW, C18.CW]) for (let k = 0; k < 6; k++) { const s = new THREE.Sprite(c18Glow('rgba(220,235,240,0.55)', 'rgba(220,235,240,0)')); s.material.blending = THREE.NormalBlending; W.add(s); C18W.brk.push({ s, x: cx + (k % 2 ? 1 : -1) * (C18.CWH + 0.4), y: -12 + (k >> 1) * 12 + r() * 4, ph: r() * 6 }); }
  }
  // ---- the skerry in the middle of the Race, and the grey seal on it ----
  {
    const sk = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x4e5052, flatShading: true })); sk.scale.set(3.2, 1.1, 2.4); sk.position.copy(z3v(CX, CY, -0.2)); W.add(sk);
    const seal = C18W.seal = new THREE.Group(), sm = z3Lam('#7a8088'), dk = z3Lam('#3a3e44');
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), sm); body.scale.set(0.9, 0.75, 2.1); body.position.y = 0.4; seal.add(body);
    const head = C18W.sealHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), sm); head.position.set(0, 0.85, 0.95); seal.add(head);
    for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), dk); e.position.set(sd * 0.13, 0.95, 1.22); seal.add(e); }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 6), sm); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0.3, -1.2); seal.add(tail);
    seal.position.copy(z3v(CX + 0.4, CY - 0.2, 0.75)); seal.rotation.y = 0.6; W.add(seal);
  }
  // ---- the towers ----
  C18W.tw = [];
  for (let i = 0; i < 6; i++) {
    const [x, y] = c18TwAt(i), great = c18Great(i), ours = i < 3, root = new THREE.Group(); W.add(root);
    let m = null;
    try { m = typeof rlTowerMesh === 'function' ? rlTowerMesh(ours ? 't_redband' : 't_granite', great ? 'great' : 'lamp', ours ? 0 : 1) : null; } catch (e) { console.warn('c18 tower', e); }
    if (!m) try { m = rl3dTowerPlain(great ? 'great' : 'lamp', ours ? 0 : 1); } catch (e) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, great ? 5 : 3.5, 12), z3Lam(ours ? '#e8e4dc' : '#8e8c88')); m.position.y = great ? 2.5 : 1.75; }
    const S = C18.S; m.scale.setScalar(S); root.add(m);
    root.position.copy(z3v(CX + x, CY + y, G0)); root.rotation.y = ours ? 0 : Math.PI;
    const lamp = m.userData && m.userData.lamp, lz = lamp ? lamp.position.y * S : (great ? 12.5 : 8.8);
    C18W.lampZ[great ? 1 : 0] = lz;
    const glow = new THREE.Sprite(c18Glow(ours ? 'rgba(255,240,200,0.95)' : 'rgba(255,215,190,0.95)', 'rgba(255,200,150,0)')); glow.position.set(0, lz, 0); glow.scale.setScalar(great ? 7 : 4.5); root.add(glow);
    const red = new THREE.Sprite(c18Glow('rgba(255,80,50,0.95)', 'rgba(255,40,20,0)')); red.position.set(0, lz, 0); red.scale.setScalar(great ? 6 : 4); red.visible = false; root.add(red);
    let beam = null, L = null;
    if (great) {
      beam = new THREE.Group(); beam.position.set(0, lz, 0); root.add(beam);
      const bm = new THREE.MeshBasicMaterial({ color: ours ? 0xfff0c8 : 0xffd8c0, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      for (const d of [1, -1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 46, 14, 1, true), bm); c.rotation.z = d * Math.PI / 2; c.position.x = -d * 23; beam.add(c); }
      L = new THREE.PointLight(ours ? 0xffe8c0 : 0xffc8b0, 0, 40, 1.4); L.position.set(0, lz, 0); root.add(L);
    }
    // (its rubble, once it has fallen)
    const rub = new THREE.Group(); rub.visible = false; root.add(rub);
    const rm = z3Lam(ours ? '#cfcac0' : '#7e7c78'), rg = new THREE.IcosahedronGeometry(1, 0);
    for (let k = 0; k < 14; k++) { const a = r() * 6.283, d = r() * (great ? 3.6 : 2.6), sc = 0.4 + r() * 0.9, q = new THREE.Mesh(rg, k % 4 ? rm : z3Lam(ours ? '#c0302a' : '#4a4a48')); q.position.set(Math.cos(a) * d, sc * 0.4, Math.sin(a) * d); q.scale.set(sc, sc * 0.7, sc); q.rotation.set(r() * 3, r() * 3, r() * 3); rub.add(q); }
    const stump = new THREE.Mesh(new THREE.CylinderGeometry((great ? 1.6 : 1.2) * S * 0.7, (great ? 1.6 : 1.2) * S * 0.95, 1.6, 12), rm); stump.position.y = 0.8; rub.add(stump);
    C18W.tw.push({ halo: m.children.filter(c => c.isSprite), glass: m.userData && m.userData.glass, root, m, glow, red, beam, L, rub, lz, great, ours, ph: r() * 6, gone: false, smoke: 0 });
  }
  // ---- his towers' aim lines (one each) ----
  C18W.aim = [3, 4, 5].map(() => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff4a30, transparent: true, opacity: 0.7, depthWrite: false, fog: false })); l.frustumCulled = false; l.visible = false; W.add(l); return l; });
  C18W.seq = [0, 0, 0];
  // ---- kegs set, the rings where his hands are set down, the thing you carry ----
  const kegG = new THREE.CylinderGeometry(0.34, 0.34, 0.8, 10), kegM = z3Lam('#5a4028'), hoopM = z3Lam('#2a2a2c');
  const mkKeg = () => { const k = new THREE.Group(); const b = new THREE.Mesh(kegG, kegM); b.position.y = 0.4; k.add(b); for (const h of [0.15, 0.65]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 4, 14), hoopM); t.rotation.x = Math.PI / 2; t.position.y = h; k.add(t); } const sp = new THREE.Sprite(c18Glow('rgba(255,220,140,1)', 'rgba(255,120,40,0)')); sp.position.y = 0.95; sp.scale.setScalar(0.6); k.add(sp); k.userData.sp = sp; k.visible = false; W.add(k); return k; };
  C18W.kegs = [0, 1, 2, 3, 4, 5].map(mkKeg);
  C18W.rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 32), new THREE.MeshBasicMaterial({ color: 0xff4a30, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.visible = false; W.add(m); return m; });
  {
    const h = C18W.held = new THREE.Group(); h.visible = false; W.add(h);
    const keg = C18W.heldKeg = new THREE.Group(); const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 10), kegM); keg.add(kb); h.add(keg);
    const can = C18W.heldCan = new THREE.Group(); const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.32, 10), z3Lam('#8a6a2a')); can.add(cb); const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.22, 6), z3Lam('#8a6a2a')); sp.rotation.z = 0.9; sp.position.set(0.12, 0.12, 0); can.add(sp); h.add(can);
  }
  // ---- his birds ----
  C18W.birds = []; C18W.birdN = 0;
  // ---- two lights of the rocks' own (the Great Lights light the rocks about them) ----
  C18W.on = true;
}
// a bird's model (Skerry Clash's gull, in his colour), from the pool
function c18BirdMdl(j) {
  while (C18W.birds.length <= j) {
    let g2 = null;
    try { if (typeof rl3dBuild === 'function') { g2 = rl3dBuild('gulls', typeof RL_THEIRS !== 'undefined' ? RL_THEIRS : 0xe8453c); g2.scale.setScalar(1.7); } } catch (e) { g2 = null; }
    if (!g2) { g2 = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), z3Lam('#f2f2ee')); b.scale.set(1, 0.8, 2); g2.add(b); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.3), z3Lam('#9aa4ae')); w.position.x = sd * 0.5; w.name = sd < 0 ? 'wingL' : 'wingR'; g2.add(w); } }
    const W2 = new THREE.Group(); W2.add(g2); C18W.grp.add(W2); W2.visible = false;
    C18W.birds.push({ g: W2, P: typeof rl3dParts === 'function' ? rl3dParts(g2) : {}, inner: g2 });
  }
  return C18W.birds[j];
}

// =====================================================================================================================
// each frame (every screen)
// =====================================================================================================================
function c18Draw3D(dt) {
  if (!C18W.on || !C18W.grp) return;
  const S = c18S(), G0 = FPSC.GROUND, CX = FPSC.CX, CY = FPSC.CY, t = g.t, m = FPS.me;
  const tide = C18W.cTide != null ? C18W.cTide : S ? S.tide : 0;
  // the sky: dusk while the Lamp Towers are trimmed, night after
  if (typeof c9Sky === 'function') { const dusk = S && (S.ph === 'trim' || S.ph === 'high') ? 1 : 0; c9Sky(dusk ? 0.72 : 1, dusk ? 0.45 : 0, 0); }
  // the causeways
  const cy = G0 - 1.45 * (1 - tide) - 0.02;
  for (const g2 of C18W.cw) g2.position.y = cy;
  // the Race
  const run = 1 - tide;
  for (const F of C18W.foam) {
    F.x += dt * (4 + 14 * run) * F.k; if (F.x > 60) F.x -= 120;
    F.m.position.copy(z3v(CX + F.x, CY + F.y, 0.04)); F.m.scale.set(F.l * (0.5 + run), F.w, 1);
    F.m.material.opacity = (0.06 + 0.4 * run) * clamp(1 - Math.abs(F.x) / 60, 0, 1) * 1.4;
    F.m.visible = !(Math.abs(Math.abs(F.x) - C18.CW) < C18.CWH && tide > 0.85);
  }
  const brk = tide > 0.25 && tide < 0.95 ? Math.sin((tide - 0.25) / 0.7 * Math.PI) : 0;
  for (const B of C18W.brk) { B.s.visible = brk > 0.02; if (!B.s.visible) continue; const p = 0.5 + 0.5 * Math.sin(t * 3 + B.ph); B.s.position.copy(z3v(CX + B.x, CY + B.y, 0.4 + p * 0.5)); B.s.scale.set(3 + p * 2, 1.2 + p, 1); B.s.material.opacity = brk * (0.4 + 0.4 * p); }
  // the seal: lifts its head now and then
  if (C18W.seal) { const up = Math.max(0, Math.sin(t * 0.4)); C18W.sealHead.position.y = 0.85 + 0.25 * up; C18W.sealHead.rotation.y = Math.sin(t * 0.7) * 0.6; C18W.seal.position.y = 0.75 + Math.sin(t * 1.3) * 0.03; }
  // the towers
  for (let i = 0; i < 6; i++) {
    const T = C18W.tw[i]; if (!T) continue;
    const up = C18W.cUp && C18W.cUp[i] != null ? !!C18W.cUp[i] : S ? (i < 3 ? !(S.ow[i] && S.ow[i].dead) : c18HisUp(i)) : true;
    const lit = C18W.cLit && C18W.cLit[i] != null ? C18W.cLit[i] : !S ? true : i < 3 ? !!(S.ow[i] && S.ow[i].lit) : !!S.tl;
    const fa = C18W.fallAt[i];
    if (!up) {
      // (falling: it settles and leans over, then it's rubble and smoke)
      const k = fa != null ? clamp((t - fa) / 1.6, 0, 1) : 1;
      T.m.visible = k < 1; T.rub.visible = k > 0.55;
      if (k < 1) { T.m.position.y = -k * k * T.lz * 0.6; T.m.rotation.z = k * k * 0.9 * (i % 2 ? 1 : -1); T.m.rotation.x = k * 0.2; if (Math.random() < dt * 30) fpsPuff(...c18W(...c18TwAt(i)), G0 + 1 + Math.random() * 4, '120,116,110', 8); }
      if (fa != null && t - fa < 6 && Math.random() < dt * 4) { const [x, y] = c18W(...c18TwAt(i)); fpsPuff(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3, G0 + 1, '70,68,64', 6); }
      T.glow.visible = false; T.red.visible = false; if (T.beam) T.beam.visible = false; if (T.L) T.L.intensity = 0;
      continue;
    }
    T.m.visible = true; T.rub.visible = false; T.m.position.y = 0; T.m.rotation.set(0, 0, 0);
    if (T.m.userData && T.m.userData.tick) try { T.m.userData.tick(t); } catch (e) {}
    const lamp = T.m.userData && T.m.userData.lamp;
    if (lamp && lamp.material) lamp.visible = !!lit;
    for (const h of T.halo) h.visible = !!lit; if (T.glass && T.glass.material) T.glass.material.opacity = lit ? 0.45 : 0.1;
    // (lit: the glow breathes; a Lamp Tower just lit flares)
    const la = C18W.litAt[i], fl = la != null ? clamp(1 - (t - la) / 1.2, 0, 1) : 0;
    T.glow.visible = !!lit; T.glow.scale.setScalar((T.great ? 7 : 4.5) * (1 + 0.06 * Math.sin(t * 2 + T.ph) + fl * 1.2));
    // (a Great Light's beam: always for yours; his once it's awake)
    if (T.beam) { const on = lit && (T.ours || (S && (S.gw || S.ph === 'champ' || S.ph === 'great'))) ; T.beam.visible = !!on; T.beam.rotation.y = t * (T.ours ? 0.55 : -0.55) + T.ph; if (T.L) T.L.intensity = lit ? 1.4 : 0; }
    // (his: the lamp reddens while it lays on someone)
    if (i >= 3) {
      const z = S ? c18TwZ(i) : null, aim = z && !z.dead && z.act === 'c18aim', A = c18Great(i) ? C18.AIM_G : C18.AIM, L = C18W.aim[i - 3];
      T.red.visible = !!aim;
      if (aim) {
        const held = (z.at || 0) >= A * 0.7, pulse = held ? 0.6 + 0.4 * Math.sin(t * 30) : 0.5;
        T.red.scale.setScalar((T.great ? 6 : 4) * (0.7 + pulse * 0.6)); T.red.material.opacity = pulse;
        const a = z3v(CX + c18TwAt(i)[0], CY + c18TwAt(i)[1], G0 + T.lz), b = z3v(z.ax, z.ay, G0 + 1.2), p = L.geometry.attributes.position;
        p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; L.visible = true; L.material.opacity = held ? 0.95 : 0.45; L.material.color.setHex(held ? 0xff3018 : 0xff8a60);
      } else L.visible = false;
    } else if (S && S.ow[i] && S.ow[i].seq !== C18W.seq[i]) {
      // (yours: a shot at whatever it fired at)
      C18W.seq[i] = S.ow[i].seq; const o = S.ow[i], [lx, ly] = c18W(...c18TwAt(i)), [tx, ty] = c18W(o.tx, o.ty);
      if (o.tx || o.ty) { FPS.tracers.push({ a: [lx, ly, G0 + T.lz], b: [tx, ty, G0 + o.tz], t: 0.12, k: 'l' }); c18Snd('longarm', lx, ly, 0.35); }
    }
  }
  // kegs
  const K = S ? S.kg : [];
  C18W.kegs.forEach((k, j) => { const q = K[j]; k.visible = !!q; if (!q) return; k.position.copy(z3v(CX + q.x, CY + q.y, G0)); const s = k.userData.sp; s.scale.setScalar(0.4 + 0.3 * Math.abs(Math.sin(t * 18 + j))); s.position.y = 0.9 + 0.1 * Math.sin(t * 9); if (Math.random() < dt * 10) fpsPuff(CX + q.x, CY + q.y, G0 + 1.1, '200,180,150', 2); });
  // rings
  const D = S ? S.dp : [];
  C18W.rings.forEach((rg, j) => { const q = D[j]; rg.visible = !!q; if (!q) return; rg.position.copy(z3v(CX + q.x, CY + q.y, G0 + 0.06)); const k = clamp(1 - q.t / 1.1, 0, 1); rg.scale.setScalar(0.6 + k * 0.8); rg.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 10)); rg.material.color.setHex(q.k === 'gulls' ? 0xffb090 : 0xff4a30); });
  // what you carry: low in front of you
  const mine = S && S.cy ? S.cy[m.id] || '' : '';
  const hv = !!mine && !(m.dead > 0) && !c18Cine() && !(typeof fpsThird === 'function' && fpsThird());
  C18W.held.visible = hv;
  if (hv) { const h = m.h, fx = Math.sin(h), fy = Math.cos(h), bob = Math.sin(t * 6) * 0.02; C18W.held.position.copy(z3v(m.x + fx * 0.55 + fy * 0.18, m.y + fy * 0.55 - fx * 0.18, G0 + (m.jz || 0) + 1.05 + bob)); C18W.held.rotation.y = Math.PI - h; C18W.heldKeg.visible = mine === 'keg'; C18W.heldCan.visible = mine === 'can'; }
  // his birds
  const Bd = S ? S.bd : [];
  let j = 0;
  for (const b of Bd) {
    const M = c18BirdMdl(j++); M.g.visible = true;
    const dead = b.hp <= 0, dz = dead ? Math.max(-1, b.z - (b.dT || 0) * 6) : b.z;
    b.dx = b.x; b.dy = b.y; b.dz = dz;
    M.g.position.copy(z3v(b.x, b.y, G0 + dz)); M.g.rotation.set(0, Math.PI - b.h, 0); M.inner.rotation.x = b.st === 1 ? 0.6 : b.st === 2 ? -0.4 : 0; M.inner.rotation.z = dead ? (b.dT || 0) * 6 : 0;
    const fl = Math.sin(t * 14 + (b.ph || 0)) * (b.st === 1 ? 0.15 : 0.7); if (M.P.wingL) { M.P.wingL.rotation.z = fl; M.P.wingR.rotation.z = -fl; }
    if (dead && dz <= -0.9) M.g.visible = false;
  }
  for (; j < C18W.birds.length; j++) C18W.birds[j].g.visible = false;
  void m;
}

// =====================================================================================================================
// the cinematics
// =====================================================================================================================
// (their own group in the scene; taken away on exit)
function c18CineGrp() { if (C18W.cineGrp && C18W.cineGrp.parent) C18W.cineGrp.parent.remove(C18W.cineGrp); C18W.cineGrp = new THREE.Group(); if (typeof GL3D !== 'undefined' && GL3D.scene) GL3D.scene.add(C18W.cineGrp); return C18W.cineGrp; }
function c18CineEnd() { if (C18W.cineGrp && C18W.cineGrp.parent) C18W.cineGrp.parent.remove(C18W.cineGrp); C18W.cineGrp = null; C18W.cTide = null; C18W.cLit = null; C18W.cUp = null; }
// a keeper of the Race, by his Great Light (the stage's own stands hidden meanwhile)
function c18CineKeeper(k, x, y, h) { const F = typeof c9Fig === 'function' ? c9Fig(C18_COLS[k], x, y, 0, h) : null; return F; }
function c18HideNpc(on) { const S = c18S(); if (S && S.npc) for (const n of S.npc) n.hide = on ? 1 : 0; }
// Plimsoll for a cinematic: Skerry Clash's own model of him, in a group of ours
function c18CinePlim() {
  const G = new THREE.Group(); c18CineGrp().add(G);
  try { if (typeof rlChampModel === 'function') { const m = rlChampModel('plimsoll', typeof RL_THEIRS !== 'undefined' ? RL_THEIRS : 0xe8453c); m.scale.setScalar(C18P.SCALE); G.add(m); G.userData.P = rl3dParts(m); } } catch (e) { console.warn('c18 plim cine', e); }
  const gl = new THREE.Sprite(c18Glow('rgba(95,170,255,0.5)', 'rgba(95,170,255,0)')); gl.scale.set(2.6, 1, 1); gl.position.y = 0.2; G.add(gl);
  return G;
}
// pose him: at local (x, y), up out of the water by jz, facing h; walking at spd (0 to 1)
function c18PlimPose(G, x, y, jz, h, spd, t) {
  if (!G) return; const [wx, wy] = c18W(x, y); G.position.copy(z3v(wx, wy, FPSC.GROUND + jz)); G.rotation.y = Math.PI - h;
  const P = G.userData.P || {}, ph = t * 9 * (spd || 0), A = 0.6 * (spd || 0);
  if (P.legL) { P.legL.rotation.x = Math.sin(ph) * A; P.legR.rotation.x = -Math.sin(ph) * A; }
  if (P.armL) { P.armL.rotation.x = -Math.sin(ph) * A * 0.6; P.armR.rotation.x = Math.sin(ph) * A * 0.6; }
  if (P.tail) P.tail.rotation.y = Math.sin(t * 4) * 0.35;
}
const C18Y = { NG: [0, -46], FG: [0, 46] };

cpCineDef('m18_intro', { music: 'cpm18dusk',
  b3(grp, C) { C18W.cLit = { 3: false, 4: false, 5: false, 0: false, 1: false }; c18HideNpc(true); C.k = c18CineKeeper('c18near', -2.5, -40, 0.2); },
  exit(C) { if (C.k) cpkNpcFree(C.k); c18HideNpc(false); c18CineEnd(); },
  shots: [
    cpTitleShot(CP_BY.m18),
    { d: 7, cam: [-46, -78, 26], to: [-30, -64, 18], look: [0, 0, 2], lookTo: [0, 12, 4], fade: [1, 0],
      lines: [[0.5, 'log', 'The years after. Out past the charts, two rocks stand close enough to shout across a race of fast water.', 'cp_m18_01']], sfx: [[0.2, 'sea', 0.6], [2.5, 'gull', 0.3], [4, 'wind', 0.3]] },
    { d: 5.5, cam: [3.5, -35.5, 2.2], to: [2.2, -36.6, 2.0], look: [-2.5, -40, 1.6],
      lines: [[0.4, 'c18near', 'One light on one rock. That was how it was, and how it ought to be.', 'cp_m18_02']],
      f(t, k, C) { if (C.k) c9FigPose(C.k); } },
    { d: 6, cam: [C18.CW + 9, -10, 5], to: [C18.CW + 7, 6, 4], look: [C18.CW, 0, -0.5], lookTo: [C18.CW, 12, 0],
      lines: [[0.4, 'log', 'The old causeways lie under the Race. At slack water they come up dry, and nobody crosses. Nobody has had cause.', 'cp_m18_03']], sfx: [[0.3, 'sea', 0.6]] },
  ] });

cpCineDef('m18_second', { music: 'cpm18second',
  b3(grp, C) {
    C18W.cLit = { 3: false, 4: false, 5: false }; C18W.cTide = 0; c18HideNpc(true);
    C.n = c18CineKeeper('c18near', -2.5, -40, 0.1); C.f = c18CineKeeper('c18far', 3, 40.5, Math.PI + 0.2);
    C.a = typeof c9Act === 'function' ? [[-C18.CW - 1.5, 32], [-C18.CW + 1.5, 33.5], [C18.CW - 1, 32.5], [C18.CW + 1.2, 34]].map(([x, y], i) => c9Act(i % 2 ? 'walk' : 'jog', x, y, -1.8, Math.PI, 30 + i)) : [];
  },
  exit(C) { if (C.n) cpkNpcFree(C.n); if (C.f) cpkNpcFree(C.f); if (typeof c9ActFree === 'function') c9ActFree(C.a); c18HideNpc(false); c18CineEnd(); const S = c18S(); if (S && ZM.net !== 'client') S.tide = Math.max(S.tide, 0.35); },
  shots: [
    { d: 5, cam: [-3, -33, 3.2], to: [-2, -31, 3.6], look: [0, 46, 4], lookTo: [0, 46, 9], fade: [0.5, 0],
      lines: [[0.6, 'log', 'That first night, a light was kindled on the rock across the Race, where no light had ever been.', 'cp_m18_08']], sfx: [[0.5, 'wind', 0.4]],
      f(t, k, C) { C18W.cLit = { 3: false, 4: false, 5: t > 2.4 }; if (t > 2.4 && !C.lc) { C.lc = 1; C18W.litAt[5] = g.t; c18Snd('lampcatch', ...c18W(0, 46), 1); } if (C.n) c9FigPose(C.n); } },
    { d: 5.5, cam: [6, 33, 3], to: [5.2, 34.5, 2.6], look: [3, 40.5, 1.6],
      lines: [[0.3, 'c18far', 'Ahoy, the near rock!', 'cp_m18_09'], [2.2, 'c18near', 'Who is that? There was never a light on that rock.', 'cp_m18_10']],
      f(t, k, C) { C18W.cLit = { 3: t > 1.5, 4: t > 2.1, 5: true }; if (C.f) c9FigPose(C.f); } },
    { d: 6, cam: [-1.5, 37, 2.2], to: [-0.6, 37.6, 2.1], look: [3, 40.5, 1.7],
      lines: [[0.3, 'c18far', 'There is now. And it is the honest one. Yours has been putting ships on the reef for years.', 'cp_m18_11']],
      f(t, k, C) { C18W.cLit = null; if (C.f) c9FigPose(C.f); } },
    { d: 5, cam: [1.5, -37.2, 1.9], to: [1, -38, 1.9], look: [-2.5, -40, 1.6],
      lines: [[0.3, 'c18near', 'Mine? Mine is the light the charts are drawn by!', 'cp_m18_12']],
      f(t, k, C) { if (C.n) c9FigPose(C.n); } },
    { d: 7, cam: [-C18.CW - 12, -14, 8], to: [-C18.CW - 8, -4, 6], look: [-C18.CW, 26, 0], lookTo: [-C18.CW, 30, 1], fade: [0, 0.4],
      lines: [[0.3, 'c18far', 'Then the charts are wrong. At slack water I will come over and put it out.', 'cp_m18_13'], [3.8, 'log', 'The tide fell. The causeways came up out of the Race, and his hands came down to meet them.', 'cp_m18_25']],
      sfx: [[0.4, 'floodrush', 0.6], [3.4, 'moan', 0.5]],
      f(t, k, C) { C18W.cTide = clamp(k * 1.2, 0, 0.7); C.a.forEach((z, i) => { const q = clamp((t - i * 0.6) / 3, 0, 1), [x, y] = [[-C18.CW - 1.5, 32], [-C18.CW + 1.5, 33.5], [C18.CW - 1, 32.5], [C18.CW + 1.2, 34]][i]; c9ActAt(z, x, y - q * 6, -1.8 + 1.8 * Math.min(1, q * 1.5), Math.PI, q > 0 && q < 1); c9ActPose(z); }); } },
  ] });

cpCineDef('m18_turn', { music: 'cpm18turn',
  b3(grp, C) { C18W.cTide = 1; c18HideNpc(true); C.n = c18CineKeeper('c18near', -2.5, -40, 0.1); },
  exit(C) { if (C.n) cpkNpcFree(C.n); c18HideNpc(false); c18CineEnd(); },
  shots: [
    { d: 6, cam: [C18.CW + 10, -16, 5], to: [C18.CW + 8, -6, 4], look: [C18.CW, 0, 0], fade: [0.5, 0],
      sfx: [[0.3, 'floodrush', 0.7], [2.5, 'sea', 0.5]],
      lines: [[0.5, 'log', 'Three minutes, and the Race came back over the causeways as if they had never been.', 'cp_m18_23']],
      f(t, k, C) { C18W.cTide = 1 - k; } },
    { d: 5, cam: [1.5, -37.2, 1.9], to: [0.9, -37.8, 2.0], look: [-2.5, -40, 1.7],
      lines: [[0.3, 'c18near', 'He will be back at the next slack water. And we will be back to him.', 'cp_m18_24']],
      f(t, k, C) { C18W.cTide = 0; if (C.n) c9FigPose(C.n); } },
    { d: 4.8, card: { eye: 'The years after', t: 'Every slack water after', sub: 'Twice a day the tide fell, and twice a day the two keepers fought it out.' } },
  ] });

cpCineDef('m18_cross', { music: 'cpm18cross',
  b3(grp, C) { C18W.cTide = 0; },
  exit(C) { c18CineEnd(); },
  shots: [
    { d: 5.5, cam: [0, -60, 30], to: [0, -44, 24], look: [0, 10, 0], lookTo: [0, 30, 4], fade: [0.6, 0],
      lines: [[0.5, 'log', 'No captain could steer by both lights, and neither keeper would put his out.', 'cp_m18_40']], sfx: [[0.3, 'wind', 0.5]],
      f(t, k, C) { C18W.cTide = k * 0.5; } },
    { d: 5.5, cam: [-C18.CW, -21, 1.8], to: [-C18.CW, -18.5, 1.7], look: [-C18.CW, 26, 4],
      lines: [[0.3, 'c18near', 'Slack water again. This time we go to him. Fell both his Lamp Towers, and his Great Light stands bare.', 'cp_m18_41']], sfx: [[0.6, 'floodrush', 0.4]],
      f(t, k, C) { C18W.cTide = 0.5 + k * 0.3; } },
    { d: 4.5, cam: [-C18.CW + 6, 18, 5], to: [-C18.CW + 4, 20, 6], look: [-C18.CW, 26, 8],
      lines: [[0.3, 'c18far', 'Come on, then! My towers have been waiting for you!', 'cp_m18_42']],
      f(t, k, C) { C18W.cTide = 0.8; } },
  ] });

cpCineDef('m18_champ', { music: 'cpm18champ',
  b3(grp, C) { c18HideNpc(true); C.f = c18CineKeeper('c18far', 3, 40.5, Math.PI + 0.2); C.p = c18CinePlim(); C18W.cTide = 1; C18W.cUp = { 3: false, 4: false }; },
  exit(C) { if (C.f) cpkNpcFree(C.f); c18HideNpc(false); c18CineEnd(); },
  shots: [
    { d: 5, cam: [-1.5, 37, 2.2], to: [-0.8, 37.6, 2.2], look: [3, 40.5, 1.7], fade: [0.4, 0],
      lines: [[0.3, 'c18far', 'Nooo… Then I will call the one who knows. Plimsoll! Walk for the honest light!', 'cp_m18_43']],
      f(t, k, C) { if (C.f) c9FigPose(C.f); c18PlimPose(C.p, C18C.RX, C18C.RY, -3.5, Math.PI, 0, t); } },
    { d: 6.5, cam: [C18.CW - 7, 5, 2.6], to: [C18.CW - 6, 7, 2.2], look: [C18C.RX, C18C.RY, 0.6], lookTo: [C18.CW + 1, C18C.RY, 2.0], shake: 0.08,
      sfx: [[0.4, 'splash', 0.9], [1.4, 'floodrush', 0.5], [3.6, 'snarl', 0.6]],
      lines: [[2.6, 'log', 'The champion came up out of the surf beside the east causeway, and turned for the near rock.', 'cp_m18_49']],
      f(t, k, C) { const q = clamp(t / 3, 0, 1), w = clamp((t - 3) / 1.6, 0, 1); c18PlimPose(C.p, C18C.RX - (C18C.RX - C18.CW) * w, C18C.RY, -3.5 + 3.5 * Math.min(1, q * 1.1), t < 3 ? Math.PI : Math.PI + 0.5 * Math.sin(w * Math.PI), w > 0 && w < 1 ? 0.7 : 0, t); if (Math.random() < 0.3 && t < 3.2) fpsPuff(...c18W(C18C.RX, C18C.RY), FPSC.GROUND + 0.1, '220,235,240', 6); } },
    { d: 5, cam: [C18.CW - 1, 3, 1.8], to: [C18.CW - 1, 2, 1.6], look: [C18.CW, 12, 1.9],
      lines: [[0.3, 'c18near', 'Plimsoll. He walks the causeway for whichever keeper he thinks is in the right.', 'cp_m18_44']],
      f(t, k, C) { c18PlimPose(C.p, C18.CW, C18C.RY - t * 1.4, 0, Math.PI, 0.8, t); } },
  ] });

cpCineDef('m18_yield', { music: 'cpm18turn',
  b3(grp, C) { C.p = c18CinePlim(); C.x = C18.CW; C.y = 0; C18W.cUp = { 3: false, 4: false }; },
  exit(C) { c18CineEnd(); },
  shots: [
    { d: 5.5, cam: [C18.CW + 5, -6, 2.0], to: [C18.CW + 4, -5, 2.1], look: [C18.CW, 0, 1.8], fade: [0.3, 0],
      lines: [[0.4, 'c18near', 'He has stopped. He is looking from my light to his.', 'cp_m18_50']], sfx: [[0.3, 'wind', 0.5]],
      f(t, k, C) { const h = t < 2.5 ? Math.PI : 0; c18PlimPose(C.p, C.x, C.y, 0, h + Math.sin(t * 1.3) * 0.15, 0, t); } },
    { d: 6.5, cam: [C18.CW - 9, 2, 3], to: [C18.CW - 10, 0, 4], look: [C18.CW, 0, 1.2], fade: [0, 0.5],
      lines: [[0.4, 'log', 'He looked a long while from one light to the other. Then he stepped off the causeway, and walked into the sea.', 'cp_m18_51']], sfx: [[3.4, 'splash', 0.8]],
      f(t, k, C) { const q = clamp((t - 2.4) / 3.5, 0, 1); c18PlimPose(C.p, C.x + q * 5, C.y, -q * 3, Math.PI / 2, q > 0 && q < 1 ? 0.6 : 0, t); if (q > 0.35 && q < 0.6 && Math.random() < 0.3) fpsPuff(...c18W(C.x + q * 5, C.y), FPSC.GROUND, '220,235,240', 6); } },
  ] });

cpCineDef('m18_outro', { music: 'cpm18end',
  b3(grp, C) {
    c18HideNpc(true); C18W.cTide = 1;
    C.n = c18CineKeeper('c18near', -2.5, -40, 0.1); C.f = c18CineKeeper('c18far', 3, 40.5, Math.PI + 0.2);
    C.m = typeof c9Fig === 'function' ? c9Fig(['#2a3a44', '#d8d0bc', '#5a7a8a', '#ffd88a'], 0.8, 1.2, 0.6, -Math.PI / 2) : null;
    C.lan = new THREE.Sprite(c18Glow('rgba(255,226,160,0.9)', 'rgba(255,226,160,0)')); C.lan.scale.setScalar(2.2); c18CineGrp().add(C.lan);
  },
  exit(C) { for (const F of [C.n, C.f, C.m]) if (F) cpkNpcFree(F); c18HideNpc(false); c18CineEnd(); },
  shots: [
    { d: 6, cam: [-C18.CW - 11, -12, 6], to: [-C18.CW - 9, -2, 5], look: [-C18.CW, 0, 0], fade: [0.5, 0],
      lines: [[0.5, 'log', 'The tide came back over the causeways, and the night was the near rock\u2019s.', 'cp_m18_60']], sfx: [[0.3, 'floodrush', 0.7]],
      f(t, k, C) { C18W.cTide = 1 - k; } },
    { d: 5, cam: [-1.5, 37, 2.2], to: [-0.8, 37.6, 2.2], look: [3, 40.5, 1.7],
      lines: [[0.3, 'c18far', 'Well played, near rock. I will have it lit again by the next slack water.', 'cp_m18_61']],
      f(t, k, C) { C18W.cTide = 0; if (C.f) c9FigPose(C.f); } },
    { d: 5, cam: [1.5, -37.2, 1.9], to: [0.9, -37.8, 2.0], look: [-2.5, -40, 1.7],
      lines: [[0.3, 'c18near', 'Then I will be waiting. Somebody has to keep the honest one.', 'cp_m18_62']],
      f(t, k, C) { if (C.n) c9FigPose(C.n); } },
    { d: 7, cam: [-8, -7, 2.6], to: [-6, -4, 2.2], look: [0.8, 1.2, 1.8], lookTo: [0, 30, 6],
      lines: [[0.4, 'maren', 'Two lights, close enough to shout across. They cannot both be honest. The ships will have to choose.', 'cp_m18_63']],
      sfx: [[0.3, 'sea', 0.5], [4.4, 'lampcatch', 0.5]],
      f(t, k, C) { if (C.m) c9FigPose(C.m); C.lan.position.copy(z3v(...c18W(0.5, 1.6), FPSC.GROUND + 0.6 + 1.1)); C18W.cUp = { 5: true }; C18W.cLit = { 5: t > 4.4 }; if (t > 4.4 && !C.lc) { C.lc = 1; C18W.litAt[5] = g.t; } } },
    { d: 5, card: { eye: 'Mission complete', t: 'Slack Water', sub: 'Nobody has settled which of the two is the false light. They fight it out at every slack water still.' }, lines: [[0.4, 'log', 'Nobody has ever settled which light was the false one. They fight it out at every slack water still.', 'cp_m18_64']] },
  ] });
