'use strict';
// Skerry Links: the golfer, the ball and the clubs dressed in what you play with (src/gfcrates.js), in the 3D view
// (src/golf3d.js).
//
// The golfer wears your outfit from the Tailor's Crate (src/ocrates.js): the long coat open over the waistcoat, its trim
// and lapels, the sash, the buttons, the breeches and boots, and the outfit's own hat (the same hats as the wreckers',
// fbHat in src/fpsbody.js), stooped over the ball. The finer outfits shimmer and glow as they do on the island, the
// Admirals' carry their own living light (src/ocadmiral.js), and Verity's own outfit puts his head on your shoulders
// (src/verityfx.js). Without an outfit it's the plain golfer in your player's colour, as before.
// The clubs are made from a ship's gear (gdClub): an oar, a belaying pin, a boat-hook, an anchor, whalebone, a harpoon,
// a narwhal's tusk, a hanging lantern, a kraken's arm, a little lighthouse with its beam turning, or a trident with the
// drowned sea's green fire and bubbles. The ball wears its paint (gkPaintBall), turns as it rolls and flies, trails its
// colour, throws sparks on the Mate grades and up, glows on the Captain grades, and the Admirals' are alive: the Skerry
// Light's beam sweeps round it, the Maelstrom swirls, and Verity's Grin is his own face, blinking.
// Who wears what: on one screen, the first player plays with your things and the others as before, in their colours;
// online, everyone plays with their own (sent with their name, src/golfnet.js gfnBase).
// It's put on by wrapping the view's own frame (gf3dDraw: the right golfer and ball before it draws them) and its
// camera (gf3dCamera: the light and the movement, once the camera is set for the frame).

var GD = { cache: new Map(), ballKey: null, core: null, tex: null, cv: null, spin: null, last: null, sp: null, spI: 0, soft: null, look: null, t: 0 };

function gdSoft() {
  if (GD.soft) return GD.soft;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (GD.soft = new THREE.CanvasTexture(c));
}
// a beam of light: a cone from its apex, fading out along its length, and its fainter twin the other way
function gdBeam(len, rad, op) {
  if (!GD.fade) { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#555555'); gr.addColorStop(1, '#000000'); x.fillStyle = gr; x.fillRect(0, 0, 4, 64); GD.fade = new THREE.CanvasTexture(c); }
  const beam = new THREE.Group();
  for (const [s, o] of [[1, op], [-1, op * 0.5]]) { const cg = new THREE.ConeGeometry(rad, len, 16, 1, true); cg.translate(0, -len / 2, 0); cg.rotateZ(s * Math.PI / 2); const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: '#fff0b8', map: GD.fade, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.userData.keep = false; beam.add(m); }
  return beam;
}
const gdAdd = c => new THREE.MeshBasicMaterial({ color: c, map: gdSoft(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
function gdLam(c, x) { const m = new THREE.MeshLambertMaterial(Object.assign({ color: c }, x || {})); m.userData.base = m.color.clone(); return m; }

// who's on the tee plays with what: { oc, ball, club }
function gdLookFor(p) {
  const none = { oc: '', ball: '', club: '' };
  if (!p || typeof gkMine !== 'function') return none;
  const i = GF.P.indexOf(p);
  if (GF.mode !== 'net') return i === 0 ? gkMine() : none;
  if (i === GF.me) return gkMine();
  if (typeof NET === 'undefined' || !NET.peers || typeof gfnOf !== 'function') return none;
  const q = NET.peers.find(x => { const z = gfnOf(x); return z && z.sid === p.sid; }), lk = q && gfnOf(q).lk;
  if (!Array.isArray(lk)) return none;
  return { oc: typeof ocOutfit === 'function' && ocOutfit(lk[0]) ? lk[0] : '', ball: gkBall(lk[1]) ? lk[1] : '', club: gkClub(lk[2]) ? lk[2] : '' };
}

// ---------- the clubs: along the club's own -y from the hands (y -0.58) to the head (y -len), the toe out along +x ----------
function gdBetween(r1, r2, y0, y1, mat, seg) { const g = new THREE.CylinderGeometry(r1, r2, y0 - y1, seg || 7); const m = new THREE.Mesh(g, mat); m.position.y = (y0 + y1) / 2; return m; }
function gdClub(k, len) {
  const grp = new THREE.Group(), fx = { glow: [], beam: null, bubbles: null, k };
  const L = len, o = k || { style: 'plain', shaft: '#c9c9c9', head: '#8a8a8a', accent: '#2a2420' };
  const gl = o.fx === 'glow' || o.fx === 'aura' || o.fx === 'shimmer';
  const shaft = gdLam(o.shaft, o.glass ? { transparent: true, opacity: 0.7 } : null), head = gdLam(o.head, o.glass ? { transparent: true, opacity: 0.78 } : null), acc = gdLam(o.accent);
  if (gl) { for (const m of [head, acc]) { m.emissive = new THREE.Color(o.glow); m.emissiveIntensity = 0; fx.glow.push(m); } }
  const add = (m, x, y, z) => { if (x != null) m.position.set(x, y, z || 0); grp.add(m); return m; };
  const top = -0.56, yH = -L;
  // the grip
  add(gdBetween(0.017, 0.016, top + 0.02, top - 0.2, o.style === 'plain' ? gdLam(0x2a2420) : acc, 8));
  switch (o.style) {
    case 'oar': {
      add(gdBetween(0.014, 0.015, top, yH + 0.26, shaft));
      const b = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), head)); b.scale.set(0.052, 0.14, 0.014); b.position.set(0.01, yH + 0.13, 0);
      add(gdBetween(0.017, 0.017, yH + 0.29, yH + 0.25, acc, 8));
      break; }
    case 'pin': {
      add(gdBetween(0.012, 0.02, top, yH + 0.15, shaft, 9));
      add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), shaft), 0, top + 0.03, 0);
      const b = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), head)); b.scale.set(0.048, 0.08, 0.044); b.position.set(0.0, yH + 0.075, 0);
      for (const y of [yH + 0.15, yH + 0.005]) add(gdBetween(0.03, 0.03, y + 0.01, y - 0.01, acc, 10));
      break; }
    case 'hook': {
      add(gdBetween(0.014, 0.014, top, yH + 0.14, shaft));
      const iron = gdLam('#4a4a52'); add(gdBetween(0.02, 0.02, yH + 0.17, yH + 0.1, iron));
      add(gdBetween(0.018, 0.002, yH + 0.1, yH, iron));
      const h = add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 6, 14, Math.PI * 1.25), iron)); h.position.set(0.045, yH + 0.12, 0); h.rotation.z = -Math.PI * 0.35;
      for (let i = 0; i < 5; i++) add(gdBetween(0.016, 0.016, top - 0.24 - i * 0.025, top - 0.25 - i * 0.025, acc, 8));
      break; }
    case 'anchor': {
      add(gdBetween(0.012, 0.014, top, yH + 0.08, shaft));
      const c = add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 18, Math.PI), head)); c.position.set(0, yH + 0.1, 0); c.rotation.z = Math.PI;
      for (const s of [-1, 1]) { const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.06, 4), head)); f.position.set(s * 0.085, yH + 0.115, 0); f.rotation.z = -s * 0.5; f.scale.z = 0.4; }
      const st = add(gdBetween(0.009, 0.009, 0.09, -0.09, head, 6)); st.rotation.x = Math.PI / 2; st.position.y = top - 0.32;
      add(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 5, 10), head), 0, yH + 0.02, 0);
      for (let i = 0; i < 6; i++) add(gdBetween(0.017, 0.017, top - 0.22 - i * 0.022, top - 0.233 - i * 0.022, acc, 8));
      break; }
    case 'bone': {
      add(gdBetween(0.015, 0.012, top, yH + 0.12, shaft, 9));
      for (let i = 0; i < 6; i++) add(gdBetween(0.0155, 0.0155, top - 0.25 - i * 0.09, top - 0.255 - i * 0.09, acc, 9));
      const cu = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, yH + 0.13, 0), new THREE.Vector3(0.0, yH, 0), new THREE.Vector3(0.15, yH + 0.03, 0));
      add(new THREE.Mesh(new THREE.TubeGeometry(cu, 12, 0.02, 7), head));
      for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.008), acc), 0.04 + i * 0.026, yH + 0.025 + i * 0.003, 0.014);
      break; }
    case 'harpoon': {
      add(gdBetween(0.014, 0.014, top, yH + 0.16, shaft));
      add(gdBetween(0.019, 0.016, yH + 0.18, yH + 0.12, head));
      add(gdBetween(0.036, 0.001, yH + 0.12, yH - 0.03, head, 4));
      for (const s of [-1, 1]) { const b = add(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), head)); b.position.set(s * 0.035, yH + 0.11, 0); b.rotation.z = s * 0.6; }
      if (o.fx === 'glow') { const h = add(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), gdAdd(o.glow)), 0, yH + 0.06, 0); fx.halo = h; }
      break; }
    case 'tusk': {
      const g = new THREE.CylinderGeometry(0.009, 0.019, top - yH - 0.04, 5, 36), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = y * 30, x = p.getX(i), z = p.getZ(i); p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)); }
      g.computeVertexNormals(); const m = add(new THREE.Mesh(g, gdLam(o.shaft, { flatShading: true }))); m.position.y = (top + yH + 0.04) / 2; fx.glow.push(m.material); m.material.emissive = new THREE.Color(o.glow); m.material.emissiveIntensity = 0;
      const tip = add(new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.16, 7), head)); tip.rotation.z = -Math.PI / 2 - 0.25; tip.position.set(0.07, yH + 0.03, 0);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), head), 0, yH + 0.04, 0);
      break; }
    case 'lantern': {
      add(gdBetween(0.012, 0.012, top, yH + 0.17, shaft));
      const iron = gdLam('#3a3a3e'); add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 12, Math.PI), iron), 0, yH + 0.17, 0);
      add(gdBetween(0.006, 0.05, yH + 0.17, yH + 0.135, iron, 6));
      const glass = new THREE.MeshBasicMaterial({ color: o.accent, transparent: true, opacity: 0.9 }); fx.lamp = glass;
      add(gdBetween(0.04, 0.04, yH + 0.135, yH + 0.03, glass, 6));
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.105, 0.006), iron), Math.sin(a) * 0.042, yH + 0.083, Math.cos(a) * 0.042); }
      add(gdBetween(0.05, 0.052, yH + 0.03, yH, iron, 6));
      fx.halo = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), gdAdd(o.glow)), 0, yH + 0.08, 0);
      break; }
    case 'tentacle': {
      const pts = []; for (let i = 0; i <= 12; i++) { const f = i / 12; pts.push(new THREE.Vector3(Math.sin(f * 7) * 0.025, top + (yH + 0.06 - top) * f, Math.cos(f * 5) * 0.012)); }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.017, 7), shaft));
      for (let i = 1; i < 12; i++) { const q = pts[i]; add(new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), acc), q.x + 0.016, q.y, q.z); }
      const curl = add(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 6, 14, Math.PI * 1.5), head)); curl.position.set(0.04, yH + 0.04, 0); curl.rotation.z = Math.PI * 0.6;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), head), pts[12].x, pts[12].y, pts[12].z);
      fx.halo = add(new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), gdAdd(o.glow)), 0.03, yH + 0.05, 0);
      break; }
    case 'lighthouse': {
      add(gdBetween(0.013, 0.013, top, yH + 0.2, shaft));
      const red = gdLam(o.accent), white = gdLam('#f4ecd0'), gold = gdLam('#e0b050'); gold.emissive = new THREE.Color('#5a3a08');
      for (let i = 0; i < 5; i++) add(gdBetween(0.0145, 0.0145, top - 0.25 - i * 0.11, top - 0.3 - i * 0.11, red, 8));
      add(gdBetween(0.012, 0.045, yH + 0.2, yH + 0.155, gold, 10));                     // the dome
      const glass = new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.95 }); fx.lamp = glass;
      add(gdBetween(0.036, 0.036, yH + 0.155, yH + 0.105, glass, 10));                  // the lamp room
      add(new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.005, 5, 16), gold), 0, yH + 0.105, 0).rotation.x = Math.PI / 2;
      add(gdBetween(0.042, 0.055, yH + 0.105, yH + 0.04, white, 10));                   // the tower
      add(gdBetween(0.047, 0.055, yH + 0.075, yH + 0.055, red, 10));
      add(gdBetween(0.058, 0.06, yH + 0.04, yH, white, 10));
      // the beam, and its fainter twin, turning
      const beam = gdBeam(2.2, 0.22, 0.35); beam.position.y = yH + 0.13; grp.add(beam); fx.beam = beam;
      fx.halo = add(new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), gdAdd('#ffd88a')), 0, yH + 0.13, 0);
      break; }
    case 'trident': {
      add(gdBetween(0.013, 0.013, top, yH + 0.14, shaft));
      add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.02, 0.02), head), 0, yH + 0.135, 0);
      add(gdBetween(0.02, 0.016, yH + 0.17, yH + 0.135, head, 8));
      for (const x of [-0.075, 0, 0.075]) {
        add(gdBetween(0.009, 0.009, yH + 0.135, yH + (x ? 0.05 : 0.03), head, 5), x, 0, 0).position.y = yH + (x ? 0.092 : 0.082);
        const pr = add(new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 4), head)); pr.rotation.z = Math.PI; pr.position.set(x, yH + (x ? 0.03 : 0.008), 0);
      }
      fx.halo = add(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), gdAdd(o.glow)), 0, yH + 0.08, 0);
      fx.bubbles = true;
      break; }
    default: {
      add(gdBetween(0.008, 0.008, top, yH + 0.05, shaft, 5));
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.06), head), 0, yH + 0.03, 0);
    }
  }
  if (fx.halo) fx.halo.userData.face = true;
  return { grp, fx };
}

// ---------- the golfer ----------
function gdGolfer(ocId, clubId) {
  const oc = typeof ocOutfit === 'function' ? ocOutfit(ocId) : null, k = gkClub(clubId);
  let g, sw, toBall;
  if (!oc) {
    g = gf3dGolfer(); sw = g.userData.sw;
    const club = sw.children[0], keep = club.children.filter(c => (g.userData.arms || []).includes(c));
    for (const c of club.children.slice()) if (!keep.includes(c)) club.remove(c);
    toBall = new THREE.Vector3(0.62, -1.3, 0);
    const C = gdClub(k, toBall.length()); club.add(C.grp); g.userData.club = C.fx;
    return g;
  }
  g = new THREE.Group();
  const dark = s => new THREE.Color(s).multiplyScalar(0.55);
  const M = {
    coat: gdLam(oc.coat, { side: THREE.DoubleSide }), lining: gdLam(dark(oc.coat), { side: THREE.DoubleSide }), trim: gdLam(oc.trim), sash: gdLam(oc.sash, { side: THREE.DoubleSide }),
    waist: gdLam(oc.waist || new THREE.Color(oc.sash).lerp(new THREE.Color('#2a2018'), 0.6)), breeches: gdLam(oc.breeches || '#4a3f33'), hat: gdLam(oc.hat || '#1b1713', { side: THREE.DoubleSide }),
    brass: gdLam(oc.brass || '#b8913c'), shirt: gdLam('#d6cfbd'), stocking: gdLam('#c9c0aa'), leather: gdLam('#2a1c14'), tan: gdLam('#5c4028'), flesh: gdLam('#e0b48c'), hair: gdLam('#2a1e16'),
  };
  const F = { oc, M, root: g, halo: null, head: null, mats: Object.values(M), fx: oc.fx || '' };
  // legs, apart and a little flexed, the boots pointing at the ball
  for (const z of [-0.13, 0.13]) {
    const leg = new THREE.Group(); leg.position.set(-0.04, 0.9, z); leg.rotation.z = -0.12; g.add(leg);
    leg.add(fbDown(0.085, 0.066, 0.45, M.breeches, 9));
    fbMesh(new THREE.CylinderGeometry(0.068, 0.068, 0.03, 9), M.breeches, 0, -0.44, 0, leg);
    const knee = new THREE.Group(); knee.position.y = -0.45; knee.rotation.z = 0.14; leg.add(knee);
    knee.add(fbDown(0.06, 0.052, 0.12, M.stocking, 9));
    const sh = fbDown(0.068, 0.062, 0.3, M.leather, 10); sh.position.y = -0.12; knee.add(sh);
    const cuff = fbDown(0.083, 0.076, 0.06, M.tan, 10); cuff.position.y = -0.1; knee.add(cuff);
    fbMesh(new THREE.BoxGeometry(0.25, 0.075, 0.1), M.leather, 0.05, -0.41, 0, knee);
    fbMesh(new THREE.BoxGeometry(0.27, 0.022, 0.11), M.tan, 0.05, -0.452, 0, knee);
  }
  // stooped from the hips; the body built facing -z as the wreckers are (src/fpsbody.js), turned to face the ball (+x)
  const hips = new THREE.Group(); hips.position.set(0, 0.92, 0); hips.rotation.z = -0.32; g.add(hips);
  const body = new THREE.Group(); body.rotation.y = -Math.PI / 2; hips.add(body);
  fbMesh(new THREE.SphereGeometry(0.17, 10, 8), M.breeches, 0, -0.04, 0, body).scale.set(1.05, 0.7, 0.75);
  // the coat's skirt hangs straight down
  const hang = new THREE.Group(); hang.position.y = 0.06; hang.rotation.x = 0.0; body.add(hang);
  const hz = new THREE.Group(); hz.rotation.x = -0.26; hang.add(hz);   // (back against the stoop: the body's -z is its front)
  const sk = fbDown(0.2, 0.3, 0.42, M.coat, 14, 1.0); sk.scale.z = 0.8; hz.add(sk);
  const skl = fbDown(0.195, 0.295, 0.42, M.lining, 14, 1.0); skl.scale.z = 0.78; hz.add(skl);
  const hem = fbDown(0.298, 0.302, 0.035, M.trim, 14, 1.0); hem.position.y = -0.39; hem.scale.z = 0.81; hz.add(hem);
  const spine = new THREE.Group(); spine.position.y = 0.06; body.add(spine);
  const waist = fbUp(0.165, 0.185, 0.52, M.waist, 12); waist.scale.z = 0.72; spine.add(waist);
  for (let i = 0; i < 5; i++) fbMesh(new THREE.SphereGeometry(0.01, 6, 4), M.brass, 0, 0.1 + i * 0.075, -0.135, spine);
  fbMesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), M.shirt, 0, 0.5, -0.12, spine).rotation.x = -0.15;
  fbMesh(new THREE.ConeGeometry(0.04, 0.1, 6), M.shirt, 0, 0.49, -0.14, spine).rotation.x = Math.PI;
  const coatU = fbUp(0.2, 0.225, 0.55, M.coat, 14, 0.95); coatU.scale.z = 0.8; spine.add(coatU);
  const coatL = fbUp(0.195, 0.22, 0.55, M.lining, 14, 0.95); coatL.scale.z = 0.78; spine.add(coatL);
  for (const s of [-1, 1]) {
    const lap = fbMesh(new THREE.BoxGeometry(0.07, 0.28, 0.012), M.trim, s * 0.1, 0.4, -0.152, spine); lap.rotation.set(-0.12, s * 0.5, s * 0.08);
    for (let i = 0; i < 3; i++) fbMesh(new THREE.SphereGeometry(0.012, 6, 4), M.brass, s * (0.105 + i * 0.004), 0.31 + i * 0.075, -0.17, spine);
  }
  const collar = fbUp(0.13, 0.12, 0.08, M.coat, 12, 1.3); collar.position.y = 0.53; collar.scale.z = 0.85; spine.add(collar);
  const belt = fbUp(0.19, 0.19, 0.055, M.leather, 14); belt.position.y = -0.01; belt.scale.z = 0.76; spine.add(belt);
  fbMesh(new THREE.BoxGeometry(0.065, 0.05, 0.015), M.brass, 0, 0.017, -0.148, spine);
  const sash = fbUp(0.195, 0.2, 0.07, M.sash, 14); sash.position.y = 0.045; sash.scale.z = 0.78; spine.add(sash);
  fbMesh(new THREE.SphereGeometry(0.03, 8, 6), M.sash, -0.17, 0.07, -0.07, spine).scale.set(1, 0.8, 0.8);
  for (const k2 of [0, 1]) fbMesh(new THREE.BoxGeometry(0.035, 0.18, 0.012), M.sash, -0.18 - k2 * 0.02, -0.04, -0.07 + k2 * 0.03, spine).rotation.z = 0.15 + k2 * 0.12;
  for (const x of [-0.215, 0.215]) fbMesh(new THREE.SphereGeometry(0.088, 10, 8), M.coat, x, 0.47, 0, spine).scale.set(1, 0.85, 0.95);
  // the head, looking down at the ball
  const head = F.head = new THREE.Group(); head.position.y = 0.58; head.rotation.x = -0.42; spine.add(head);
  fbMesh(new THREE.CylinderGeometry(0.05, 0.058, 0.08, 8), M.flesh, 0, 0.02, 0, head);
  fbMesh(new THREE.SphereGeometry(0.105, 14, 10), M.flesh, 0, 0.14, 0, head).scale.set(0.9, 1.05, 1);
  fbMesh(new THREE.SphereGeometry(0.111, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.hair, 0, 0.145, 0.008, head).scale.set(0.92, 1.05, 1.02);
  const queue = fbDown(0.022, 0.012, 0.16, M.hair, 6); queue.position.set(0, 0.1, 0.1); queue.rotation.x = 0.25; head.add(queue);
  for (const s of [-1, 1]) fbMesh(new THREE.SphereGeometry(0.022, 6, 5), M.flesh, s * 0.095, 0.13, 0.005, head).scale.set(0.5, 1, 0.8);
  fbMesh(new THREE.ConeGeometry(0.018, 0.045, 5), M.flesh, 0, 0.13, -0.105, head).rotation.x = -Math.PI / 2;
  fbMesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), M.hair, 0, 0.065, -0.095, head);
  if (oc.eyes) { F.eyeMat = new THREE.MeshBasicMaterial({ color: oc.eyes, transparent: true }); for (const s of [-1, 1]) fbMesh(new THREE.SphereGeometry(0.014, 6, 4), F.eyeMat, s * 0.036, 0.16, -0.098, head); }
  else for (const s of [-1, 1]) fbMesh(new THREE.SphereGeometry(0.01, 5, 4), M.leather, s * 0.035, 0.16, -0.093, head);
  if (typeof fbHat === 'function') fbHat(head, M, oc.style);
  // the arms and the club swing together from the shoulders, as the plain golfer's do
  sw = new THREE.Group(); sw.position.set(0.167, 1.4, 0); g.add(sw);
  toBall = new THREE.Vector3(0.78 - 0.167, 0.03 - 1.4, 0);
  const club = new THREE.Group(); club.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), toBall.clone().normalize()); sw.add(club);
  for (const z of [-0.2, 0.2]) {
    const arm = new THREE.Group(); club.add(arm);
    const a = new THREE.Vector3(0, 0, z), b = new THREE.Vector3(0, -0.56, z * 0.12), d = b.clone().sub(a), l = d.length();
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, l, 8), M.coat); up.position.copy(a).add(b).multiplyScalar(0.5); up.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); arm.add(up);
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.066, 0.08, 8), M.trim); cf.position.copy(a).lerp(b, 0.86); cf.quaternion.copy(up.quaternion); arm.add(cf);
    fbMesh(new THREE.SphereGeometry(0.04, 8, 6), M.flesh, b.x, b.y - 0.02, b.z, arm).scale.set(0.9, 1.2, 0.8);
  }
  const C = gdClub(k, toBall.length()); club.add(C.grp);
  g.userData = { sw, body: { material: { color: new THREE.Color() } }, club: C.fx, F };
  // the finer outfits: a halo behind the head; the Admirals' living light; Verity's head
  if (oc.halo && !oc.adm) { F.halo = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), gdAdd(oc.halo)); F.halo.material.opacity = 0.45; F.halo.position.set(0.22, 1.6, 0); g.add(F.halo); }
  if (oc.adm && typeof ocaDress === 'function') F.adm = ocaDress(F);
  if (oc.vy && typeof vyDress === 'function') F.vy = vyDress(F);
  if (oc.fx && !oc.adm) for (const m of [M.trim, M.sash].concat(oc.fx === 'aura' ? [M.coat] : [])) { m.emissive = new THREE.Color(oc.glow || oc.trim); m.emissiveIntensity = 0; }
  return g;
}
// each frame: the golfer's light (and the club's)
function gdGolferFrame(g, t) {
  const F = g.userData.F, C = g.userData.club, cam = G3.cam;
  if (F) {
    const o = F.oc, pulse = o.fx === 'shimmer' ? 0.18 + 0.14 * Math.sin(t * 2.2) : o.fx === 'glow' ? 0.45 + 0.3 * Math.sin(t * 1.8) : o.fx === 'aura' ? 0.55 + 0.25 * Math.sin(t * 2.6) : 0;
    if (o.fx && !o.adm) { F.M.trim.emissiveIntensity = pulse; F.M.sash.emissiveIntensity = o.fx === 'shimmer' ? 0 : pulse * 0.7; if (o.fx === 'aura') F.M.coat.emissiveIntensity = pulse * 0.35; }
    if (F.eyeMat) F.eyeMat.opacity = 0.75 + 0.25 * Math.sin(t * 3);
    if (F.adm && typeof OCA !== 'undefined' && OCA.T) {
      OCA.T.value = reduceMotion ? 0 : (performance.now() / 1000) % 600; OCA.H.value = G3.r.domElement.height * 0.5;
      g.updateMatrixWorld(); F.ocaR.value.copy(g.matrixWorld).invert(); F.ocaO.value = 1;
      const v = OCA.v.set(cam.position.x - g.position.x, 0, cam.position.z - g.position.z), l = v.length() || 1;
      v.multiplyScalar(-0.22 / l).applyQuaternion(OCA.q.copy(g.quaternion).invert());
      F.halo.position.set(0.22 + v.x, 1.66, v.z); F.halo.quaternion.copy(OCA.q).multiply(cam.quaternion);
    } else if (F.halo) { g.updateMatrixWorld(); F.halo.quaternion.copy(g.quaternion).invert().multiply(cam.quaternion); F.halo.material.opacity = 0.3 + 0.2 * Math.sin(t * 1.6); }
    if (F.vy && typeof vyPose === 'function') vyPose(F, { t, op: 1 });
  }
  if (C) {
    const o = C.k, pulse = !o ? 0 : o.fx === 'shimmer' ? 0.2 + 0.15 * Math.sin(t * 2.4) : o.fx === 'glow' ? 0.55 + 0.35 * Math.sin(t * 2) : o.fx === 'aura' ? 0.7 + 0.25 * Math.sin(t * 2.6) : 0;
    for (const m of C.glow) m.emissiveIntensity = pulse;
    if (C.lamp) C.lamp.opacity = 0.75 + 0.25 * Math.sin(t * (o.style === 'lantern' ? 7 : 3)) * (o.style === 'lantern' ? Math.sin(t * 2.3) : 1);
    if (C.beam) C.beam.rotation.y = reduceMotion ? 0.6 : t * 1.4;
    if (C.halo) { C.halo.parent.updateMatrixWorld(); const q = new THREE.Quaternion(); C.halo.parent.getWorldQuaternion(q); C.halo.quaternion.copy(q.invert().multiply(cam.quaternion)); C.halo.material.opacity = 0.35 + 0.35 * pulse; }
    if (C.bubbles && g.visible && C.halo && !reduceMotion && Math.random() < 0.5) { const p = C.halo.getWorldPosition(new THREE.Vector3()); gdSpark(p.x + (Math.random() - 0.5) * 0.12, p.y, p.z + (Math.random() - 0.5) * 0.12, 0, 0.35 + Math.random() * 0.3, 0, '#9affe6', 1.4); }
  }
}

// ---------- sparks: a few points of light that drift and fade (the ball's sparks, the trident's bubbles) ----------
function gdSparks() {
  if (GD.sp) return GD.sp;
  const N = 90, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, map: gdSoft(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false; G3.scene.add(pts);
  GD.sp = { pts, N, p: [], c: new THREE.Color() };
  for (let i = 0; i < N; i++) GD.sp.p.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, col: new THREE.Color() });
  return GD.sp;
}
function gdSpark(x, y, z, vx, vy, vz, col, life) {
  const S = gdSparks(), q = S.p[GD.spI = (GD.spI + 1) % S.N];
  Object.assign(q, { x, y, z, vx, vy, vz, life: life || 0.8, max: life || 0.8 }); q.col.set(col);
}
function gdSparksFrame(dt) {
  const S = GD.sp; if (!S) return;
  const pa = S.pts.geometry.attributes.position, ca = S.pts.geometry.attributes.color;
  S.p.forEach((q, i) => {
    if (q.life > 0) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vy -= dt * 0.2; }
    const f = Math.max(0, q.life / q.max);
    pa.setXYZ(i, q.x, q.life > 0 ? q.y : -999, q.z); ca.setXYZ(i, q.col.r * f, q.col.g * f, q.col.b * f);
  });
  pa.needsUpdate = ca.needsUpdate = true;
}

// ---------- the ball ----------
function gdBallLook(id) {
  const b = gkBall(id), B = G3.ball;
  for (const c of B.children.slice()) { B.remove(c); c.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); if (o.material && o.material.map && o.material.map !== GD.soft) o.material.map.dispose(); if (o.material) o.material.dispose(); }); }
  GD.core = null; GD.orb = null; GD.bhalo = null; GD.bbeam = null; GD.cv = null; GD.tex = null;
  B.material.visible = !b;
  G3.trail.material.color.set(b && b.trail ? b.trail : '#ffffff'); G3.trail.material.opacity = b && b.trail ? 0.8 : 0.55;
  GD.ball = b; GD.ballKey = id;
  if (!b) return;
  if (b.adm === 'verity' && typeof rvGeo === 'function') {
    const Q = rvGeo(), yellow = new THREE.MeshPhongMaterial({ color: 0xe8d41a, emissive: 0x4a4000, specular: 0x605010, shininess: 28 });
    const orb = rvOrb(Q, yellow, new THREE.MeshBasicMaterial({ color: 0x060504, side: THREE.DoubleSide }), new THREE.MeshLambertMaterial({ color: 0xf0e070, emissive: 0x302808, side: THREE.DoubleSide }));
    const s = 0.1; orb.o.scale.setScalar(s); orb.o.position.y = -RVO.Y * s; orb.o.traverse(o => { if (o.geometry) o.userData.keep = true; });
    B.add(orb.o); GD.orb = orb; GD.orbY = yellow;
  } else {
    const cv = GD.cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; gkPaintBall(cv.getContext('2d'), b, 256, 128, 0);
    const tex = GD.tex = new THREE.CanvasTexture(cv); if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    const glow = b.fx === 'glow' || b.fx === 'aura';
    const m = new THREE.MeshPhongMaterial({ map: tex, shininess: 60, specular: 0x444444, emissive: glow ? 0xffffff : 0x333333, emissiveMap: glow ? tex : null, emissiveIntensity: glow ? 0.6 : 0.25 });
    if (!glow) { m.emissiveMap = tex; m.emissive.set(0x555555); }
    GD.core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 22, 16), m); B.add(GD.core);
  }
  if (b.fx === 'glow' || b.fx === 'aura') { GD.bhalo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), gdAdd(b.glow)); GD.bhalo.material.opacity = 0.6; B.add(GD.bhalo); }
  if (b.adm === 'light') {
    const beam = GD.bbeam = gdBeam(2.6, 0.26, 0.35); B.add(beam);
  }
}
function gdBallFrame(dt, t) {
  const B = G3.ball, b = GD.ball, cam = G3.cam;
  const p = B.position, last = GD.last || (GD.last = p.clone()), d = p.clone().sub(last), m = d.length(); GD.last.copy(p);
  if (!b) return;
  // it turns as it goes (not leaping across a new hole's start)
  if (GD.core && m > 1e-4 && m < 5) { const ax = new THREE.Vector3(d.z, 0, -d.x); if (ax.lengthSq() > 1e-10) { ax.normalize(); GD.core.rotateOnWorldAxis(ax, m / 0.07); } }
  if (GD.core && GD.cv && (b.fx === 'shimmer' || b.adm || b.pat === 'wisp') && !reduceMotion && (GD.tick = (GD.tick || 0) + 1) % 2 === 0) { gkPaintBall(GD.cv.getContext('2d'), b, 256, 128, t); GD.tex.needsUpdate = true; }
  const pulse = b.fx === 'shimmer' ? 0.3 + 0.15 * Math.sin(t * 2.2) : b.fx === 'glow' ? 0.6 + 0.35 * Math.sin(t * 2) : b.fx === 'aura' ? 0.75 + 0.25 * Math.sin(t * 2.6) : 0.25;
  if (GD.core && (b.fx === 'glow' || b.fx === 'aura')) GD.core.material.emissiveIntensity = pulse;
  if (GD.bhalo) { GD.bhalo.quaternion.copy(cam.quaternion); GD.bhalo.material.opacity = 0.35 + 0.35 * pulse; }
  if (GD.bbeam) GD.bbeam.rotation.y = reduceMotion ? 0.6 : t * 1.3;
  if (GD.orb) {
    const o = GD.orb; o.o.rotation.y = Math.atan2(-(cam.position.x - p.x), -(cam.position.z - p.z));
    const bl = typeof vyBlink === 'function' ? vyBlink(t, 0) : 1; for (const e of o.eyes) e.scale.y = 0.1 * bl;
    o.face.scale.x = 1 + 0.08 * Math.sin(t * 1.7); o.body.rotation.z = Math.sin(t * 0.9) * 0.1;
    GD.orbY.emissive.setRGB(0.24 + 0.08 * Math.sin(t * 2.2), 0.2 + 0.07 * Math.sin(t * 2.2), 0);
  }
  // sparks off it as it flies, on the Mate grades and up (and a few round it at rest on the Admirals')
  if (B.visible && !reduceMotion && (b.fx || b.adm)) {
    const moving = m > 0.02 && m < 5, n = moving ? (b.adm ? 3 : b.fx === 'glow' ? 2 : 1) : (b.adm && Math.random() < 0.25 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = 0.05 + Math.random() * 0.06; gdSpark(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.6, p.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.4, 0.15 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4, Math.random() < 0.5 ? b.glow || b.trail : '#ffffff', moving ? 0.9 : 1.2); }
  }
}

// ---------- each frame, put onto the view's own ----------
function gdApply() {
  const p = gfPlayer(), lk = GD.look = gdLookFor(p), key = lk.oc + '|' + lk.club;
  if (!G3.golfer.userData.gdKey) { G3.golfer.userData.gdKey = '|plain'; GD.cache.set('|plain', G3.golfer); }
  const want = key === '|' ? '|plain' : key;
  if (G3.golfer.userData.gdKey !== want) {
    let g = GD.cache.get(want);
    if (!g) { g = gdGolfer(lk.oc, lk.club); g.userData.gdKey = want; GD.cache.set(want, g); if (GD.cache.size > 10) { const [k0, g0] = GD.cache.entries().next().value; if (k0 !== '|plain') { GD.cache.delete(k0); if (g0 !== G3.golfer) gf3dDispose(g0); } } }
    g.visible = G3.golfer.visible; G3.scene.remove(G3.golfer); G3.scene.add(g); G3.golfer = g;
  }
  if (GD.ballKey !== lk.ball) gdBallLook(lk.ball);
}
function gdFrame(dt) {
  const t = reduceMotion ? 0 : (GD.t += dt);
  if (G3.golfer.visible) gdGolferFrame(G3.golfer, t);
  gdBallFrame(dt, t);
  gdSparksFrame(dt);
}
if (typeof gf3dDraw === 'function') {
  const o = gf3dDraw; gf3dDraw = function () { try { if (G3.ok && GF.H) gdApply(); } catch (e) { console.error(e); } return o.apply(this, arguments); };
  const c = gf3dCamera; gf3dCamera = function (dt) { const r = c.apply(this, arguments); try { if (G3.ok) gdFrame(dt || 0); } catch (e) { console.error(e); } return r; };
}
