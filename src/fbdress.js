// Freebooters' Sea: the sea's looks (the design's polish), nothing that plays: all of it hangs off the stages' hooks
// (fbHook, src/fbsea.js) and only adds to what src/fbsail.js and src/fbisle.js already draw.
//  - Out on the water (fbHook 'sail' b3/f3, after fbs3dBuild has drawn each island's hump, beach and mark, in the sea's
//    group GW3.SG, in the sea's frame): each island's silhouette made more of, by its look (FB_ISLES[i].look):
//    the cliffs (Beacon Knoll, Crowsnest Rock) get a ring of tall crags round most of their shore and their hump
//    raised, so they stand up against the sky from far off; every island gets a pale beach on the side facing
//    Saltcote and a line of surf round its shore that glints in the dark; the coves (Saltcote, Tallow Cove, Gilt
//    Strand) get palms, leaning seaward; the shingle holms and reefs a few more boulders; the marshes a low fringe.
//    Saltcote gets its lighthouse on the point (white, with two red bands, a gallery and a lantern room, its beam
//    turning slowly over the water: a warm cone, not the Light's, and harmless), lamp posts along its quay and lit
//    windows in its huts, so it reads as the one lived-in place on the Wide Water from a long way off.
//  - Ashore (fbHook 'isle' and 'port' b3/f3): the cutter, lying at anchor where you left her (FB.ship), drawn offshore
//    on the side of the island she's anchored off, at about the distance she lies (the island stage is smaller than
//    the island on the water, so it's scaled to sit just past the surf): her black hull, deck, mast, furled mainsail on
//    its boom, bowsprit, her anchor cable down into the water, a riding light in the forestay and a lantern aft, riding
//    gently at her cable. Her head as she was anchored.
// The strip's label not overlapping BOW is src/gwsail.js's own fix (marked [fbsea]).

const FBD = { CLIFF: 2.1, SURF: 0.22, PALMS: 7, BEAM: 0.32 };

// ---------- out on the water ----------
const fbdLam = (c, o) => z3Lam(c, o);
function fbdPalm(par, x, z, y, s, lean, R) {
  const trunk = fbdLam('#3e3226'), frond = fbdLam('#26361e', { side: THREE.DoubleSide }), g0 = new THREE.Group(); g0.position.set(x, y, z); g0.rotation.y = R() * 6.28; par.add(g0);
  let px = 0, py = 0;
  for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.5 * s, 6), trunk); px += lean * 0.28 * s * (k + 1) * 0.35; py += 1.45 * s; m.position.set(px, py - 0.7 * s, 0); m.rotation.z = -lean * 0.2 * (k + 1) * 0.5; g0.add(m); }
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + R() * 0.3, f = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 3.4 * s, 4, 1), frond); f.scale.set(1, 1, 0.18); f.position.set(px + Math.cos(a) * 1.3 * s, py + 0.1 * s, Math.sin(a) * 1.3 * s); f.rotation.set(0, -a, Math.PI / 2 + 0.45); f.rotation.order = 'YZX'; g0.add(f); }
  return g0;
}
function fbdDressSea() {
  const G = typeof GW3 !== 'undefined' ? GW3 : null; if (!G || !G.fbI || !G.SG) return;
  const rk = fbdLam('#45474a'), rk2 = fbdLam('#36383a'), sand = fbdLam('#9a8a68'), white = fbdLam('#d8d4c8'), red = fbdLam('#8a2a22'), iron = fbdLam('#2a2a2c'), wood = fbdLam('#3a2e22'), reed = fbdLam('#5a6438');
  G.fbd = { surf: [], beam: null, lamp: null, win: [] };
  const P0 = FB_ISLES[0];
  for (const o of G.fbI) {
    const I = o.I, g0 = o.g, R = seeded(I.seed ^ 0xd2e55), mound = o.mound || g0.children[0], hi0 = mound ? mound.scale.y : 4;
    // the beach, on the side facing Saltcote (the way most come at it), and the surf round the shore
    const toP = I.port ? Math.PI * 0.6 : Math.atan2(-(P0.y - I.y), P0.x - I.x);
    const bch = new THREE.Mesh(new THREE.RingGeometry(I.r - 7, I.r + 3.5, 28, 1, -toP - 1.1, 2.2), sand); bch.rotation.x = -Math.PI / 2; bch.position.y = 0.32; g0.add(bch);
    const surf = new THREE.Mesh(new THREE.RingGeometry(I.r + 4.5, I.r + 7.5, 48), new THREE.MeshBasicMaterial({ color: 0xcfe0e8, transparent: true, opacity: FBD.SURF, depthWrite: false, side: THREE.DoubleSide }));
    surf.rotation.x = -Math.PI / 2; surf.position.y = 0.12; g0.add(surf); G.fbd.surf.push({ m: surf, ph: R() * 6.28 });
    if (I.look === 'cliff') {
      // higher: the hump raised, and crags round most of the shore (open on the beach's side)
      if (mound) mound.scale.y = hi0 * FBD.CLIFF;
      for (let k = 0; k < 26; k++) {
        const a = k / 26 * 6.283 + R() * 0.12; if (Math.abs(angDiff(a, -toP)) < 0.75) continue;
        const h = 10 + R() * 12, w = 4 + R() * 4, d = I.r - 3 - R() * 4, m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55, w, h, 5), k % 3 ? rk : rk2);
        m.position.set(Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d); m.rotation.y = R() * 3; g0.add(m);
      }
    } else if (I.look === 'chapel') { if (mound) mound.scale.y = hi0 * 1.3; }
    else if (I.look === 'reef' || I.look === 'shingle') {
      for (let k = 0; k < 9; k++) { const a = R() * 6.283, d = I.r * (0.75 + R() * 0.3), r = 2 + R() * 3.5, m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), k % 2 ? rk : rk2); m.position.set(Math.cos(a) * d, r * 0.35, Math.sin(a) * d); m.rotation.set(R() * 3, R() * 3, R() * 3); g0.add(m); }
    } else if (I.look === 'marsh') {
      for (let k = 0; k < 30; k++) { const a = R() * 6.283, d = I.r * (0.85 + R() * 0.15), m = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.8 + R() * 1.4, 4), reed); m.position.set(Math.cos(a) * d, 0.9, Math.sin(a) * d); g0.add(m); }
    }
    if (I.look === 'cove') {
      // palms, leaning out to sea round the beach
      for (let k = 0; k < FBD.PALMS + (I.port ? 3 : 0); k++) {
        const a = -toP + (R() - 0.5) * 2.6, d = I.r - 9 - R() * 12, y = Math.max(0.4, hi0 * (1 - d / I.r) * 0.8);
        fbdPalm(g0, Math.cos(a) * d, Math.sin(a) * d, y - 0.6, 0.9 + R() * 0.5, 1, R);
      }
    }
    if (I.port) {
      const top = hi0 - 0.6;
      // the lighthouse on the point, across the cove from the quay
      const a = Math.PI * 0.6 + 1.25, px = Math.cos(a) * (I.r - 6), pz = Math.sin(a) * (I.r - 6), base = Math.max(0.5, top * 0.35), L = new THREE.Group(); L.position.set(px, base, pz); g0.add(L);
      const rock = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 3, 9), rk); rock.position.y = -0.5; L.add(rock);
      const H = 15;
      for (let k = 0; k < 5; k++) { const y0 = k * H / 5, r0 = 2.6 - 0.9 * k / 5, r1 = 2.6 - 0.9 * (k + 1) / 5, m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H / 5, 14), k === 1 || k === 3 ? red : white); m.position.y = y0 + H / 10 + 0.8; L.add(m); }
      const gal = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 14), iron); gal.position.y = H + 0.9; L.add(gal);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.8, 10), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.85 })); glass.position.y = H + 2; L.add(glass);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.3, 10), red); cap.position.y = H + 3.5; L.add(cap);
      const lamp = G.glowSp(0xffd890, 26, { opacity: 0.85 }); lamp.position.y = H + 2; L.add(lamp); G.fbd.lamp = lamp;
      // its beam, a warm cone turning slowly
      const bm = new THREE.Mesh(new THREE.ConeGeometry(6, 130, 16, 1, true).translate(0, -70, 0).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      const piv = new THREE.Group(); piv.position.y = H + 2; piv.add(bm); L.add(piv); G.fbd.beam = piv;
      // lamp posts along the quay, and windows lit in the huts
      for (let k = 0; k < 7; k++) {
        const qa = Math.PI * 0.6 + (k - 3) * 0.2, qx = Math.cos(qa) * (I.r - 1.5), qz = Math.sin(qa) * (I.r - 1.5), y0 = Math.max(0.5, top * 0.15);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.4, 5), iron); post.position.set(qx, y0 + 1.7, qz); g0.add(post);
        const s = G.glowSp(0xffc070, 5, { opacity: 0.8 }); s.position.set(qx, y0 + 3.6, qz); g0.add(s); G.fbd.win.push({ s, ph: R() * 6.28, o: 0.8 });
      }
      for (let k = 0; k < 4; k++) {
        const ha = Math.PI * 0.6 + (k - 1.5) * 0.45, d = I.r - 22 + 3.1, hx = Math.cos(ha) * d, hz = Math.sin(ha) * d;
        for (const off of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xffc878, transparent: true, opacity: 0.9 })); w.position.set(hx + Math.sin(ha) * off, top * 0.6 + 2.3, hz - Math.cos(ha) * off); w.rotation.y = -ha + Math.PI / 2; g0.add(w); }
        const s = G.glowSp(0xffb860, 6, { opacity: 0.5 }); s.position.set(hx, top * 0.6 + 2.3, hz); g0.add(s); G.fbd.win.push({ s, ph: R() * 6.28, o: 0.5 });
      }
      // a boathouse roof and a salt pan's low walls, for shape
      const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), wood); roof.rotation.y = Math.PI / 4; roof.position.set(Math.cos(Math.PI * 0.6 - 0.7) * (I.r - 18), top * 0.5 + 5, Math.sin(Math.PI * 0.6 - 0.7) * (I.r - 18)); g0.add(roof);
    }
  }
}
function fbdSeaTick() {
  const G = typeof GW3 !== 'undefined' ? GW3 : null; if (!G || !G.fbd) return;
  const t = g.t;
  for (const s of G.fbd.surf) s.m.material.opacity = FBD.SURF * (0.7 + 0.3 * Math.sin(t * 0.9 + s.ph));
  if (G.fbd.beam) G.fbd.beam.rotation.y = reduceMotion ? 0.6 : t * FBD.BEAM;
  for (const w of G.fbd.win) w.s.material.opacity = w.o * (0.85 + 0.15 * Math.sin(t * 3.1 + w.ph));
}
fbHook('sail', { b3() { fbdDressSea(); }, f3() { fbdSeaTick(); } });

// ---------- ashore: the cutter, lying at anchor ----------
const FBD3 = { g: null, base: null };
function fbdCutter() {
  const g0 = new THREE.Group(), lam = c => fbdLam(c), hull = lam('#2c2622'), deck = lam('#5a4632'), wood = lam('#3a2e22'), canvas = lam('#b8ac90'), stripe = lam('#8a6a2c');
  // her hull: a deck outline with a fine bow, extruded down to the keel (bow to -z)
  const sh = new THREE.Shape(), L = 11.4, S = -11, B = 3.3;
  sh.moveTo(0, -L); sh.bezierCurveTo(B * 0.9, -L + 3, B, -2, B, 2); sh.bezierCurveTo(B, 6, B * 0.8, S + 21, B * 0.55, -S); sh.lineTo(-B * 0.55, -S); sh.bezierCurveTo(-B * 0.8, S + 21, -B, 6, -B, 2); sh.bezierCurveTo(-B, -2, -B * 0.9, -L + 3, 0, -L);
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: false, curveSegments: 10 }); hg.rotateX(Math.PI / 2);   // (the shape's y is her length: rotated flat, depth downward)
  const hm = new THREE.Mesh(hg, hull); hm.position.y = 1.4; hm.scale.set(1, 1, 1); g0.add(hm);
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 20), hull); keel.position.set(0, -1.2, 0.2); g0.add(keel);
  const dg = new THREE.ShapeGeometry(sh, 10); dg.rotateX(Math.PI / 2); const dm = new THREE.Mesh(dg, deck); dm.position.y = 1.42; dm.scale.set(0.95, 1, 0.97); g0.add(dm);
  // a gold sheer stripe, the bulwark's rail
  { const pts = sh.getPoints(24).map(p => new THREE.Vector3(p.x * 1.01, 1.2, p.y)); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8a6a2c })); g0.add(ln); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 16, 8), wood); mast.position.set(0, 1.4 + 8, -2.2); g0.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 10.5, 6), wood); boom.rotation.x = Math.PI / 2; boom.position.set(0.15, 3.6, 3); g0.add(boom);
  const furl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 9.6, 8), canvas); furl.rotation.x = Math.PI / 2; furl.position.set(0.15, 4.05, 3); g0.add(furl);
  const gaff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.5, 6), wood); gaff.rotation.x = Math.PI / 2 - 0.35; gaff.position.set(0.15, 4.9, 1); g0.add(gaff);
  const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 6, 6), wood); sprit.rotation.x = Math.PI / 2 - 0.08; sprit.position.set(0, 1.9, -L - 2.4); g0.add(sprit);
  const rope = new THREE.LineBasicMaterial({ color: 0x4a4236, transparent: true, opacity: 0.8 }), line = (a, b) => g0.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), rope));
  const mt = new THREE.Vector3(0, 17.2, -2.2);
  line(mt, new THREE.Vector3(0, 2.1, -L - 5.2)); line(mt, new THREE.Vector3(0, 1.6, -S - 0.4)); line(mt, new THREE.Vector3(B, 1.5, -1)); line(mt, new THREE.Vector3(-B, 1.5, -1));
  // the anchor cable, from the bow down into the water ahead of her
  line(new THREE.Vector3(0.4, 1.5, -L + 0.6), new THREE.Vector3(0.8, -2, -L - 7));
  // a lantern aft, the riding light in the forestay
  const glow = (c, s, x, y, z) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(s); sp.position.set(x, y, z); g0.add(sp); return sp; };
  const riding = glow(0xfff0c8, 3.2, 0, 7.5, -6.8), aft = glow(0xffc070, 2.2, 0, 3.2, -S + 0.6);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff4d8 })); core.position.copy(riding.position); g0.add(core);
  g0.userData.lights = [riding, aft];
  return g0;
}
function fbdAshoreBuild(grp) {
  FBD3.g = null; const I = typeof fbIsleNow === 'function' ? fbIsleNow() : null, Sh = FB.ship; if (!I || !Sh || typeof THREE === 'undefined') return;
  const a = Math.atan2(Sh.y - I.y, Sh.x - I.x), off = Math.hypot(Sh.x - I.x, Sh.y - I.y) - I.r, d = FPSC.R + clamp(off * 0.8, 20, 48);
  const x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d, c = fbdCutter();
  c.position.copy(z3v(x, y, -0.1)); c.rotation.y = -(Sh.h || 0); grp.add(c);
  FBD3.g = c; FBD3.base = c.position.y;
}
function fbdAshoreTick() {
  const c = FBD3.g; if (!c || !c.parent) return;
  const t = g.t, m = reduceMotion ? 0.3 : 1;
  c.position.y = FBD3.base + Math.sin(t * 0.8) * 0.18 * m; c.rotation.x = Math.sin(t * 0.7 + 1) * 0.025 * m; c.rotation.z = Math.sin(t * 0.55) * 0.04 * m;
  const [rl, al] = c.userData.lights; rl.material.opacity = 0.85 + 0.15 * Math.sin(t * 2.3); al.material.opacity = 0.7 + 0.2 * Math.sin(t * 3.7 + 2);
}
const fbdAshore = { b3: fbdAshoreBuild, f3: fbdAshoreTick, exit() { FBD3.g = null; } };
fbHook('isle', fbdAshore); fbHook('port', fbdAshore);
