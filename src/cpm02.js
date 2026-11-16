'use strict';
// The Chronicle of the Light, mission 2: The Mooncussers (the 1600s, the wrecking years). A garrison's tale: the
// soldiers of the Spanish sea fort on the headland (src/raidfort.js's fort, here from the outside and above) go down
// to the rocks below it on a moonless night, when the Mooncussers have hung their false lights on the point.
//  I.   The False Lights (cp_m02lights): the point under the fort's cliff, a rocky promontory in the reef's look with
//       the hulks of earlier ships on it. Five false lights burn on poles along its seaward rocks, red and green as a
//       harbour's lamps, and a merchantman out at sea has seen them: she stands in, her course bending toward them,
//       nearer for every light that burns (RAID.st.c, 0 to 1; at 1 she strikes and the mission is lost). Hold Use at
//       a light to put it out. The gang stands guard by the lights with lanterns (src/cpm02g.js: they wake when you
//       come within sight, or fire near them), more come down the cliff stair, and some of them come to light the
//       ones you've put out again. All five dark: she bears away (a cutscene), and the part is done.
//  II.  The Wreckers' Landing (cp_m02cove): the same point. The gang's boats are drawn up in the cove on its east
//       side: stave them in (hold Use at each) while the gang comes at you; then their master, Black Jago, comes
//       down with his men. Take him alive: knock the fight out of him (at a tenth of his strength he gives up).
//  III. The Sea Wall (cp_m02wall, src/cpm02b.js): three nights later, the top of the fort's sea wall east of the Sea
//       Battery, where the governors hang the wreckers in chains. Jago's gang come up the wall on lines to cut him
//       down; keep them off his gibbet. Then the tide turns and he comes back: the Mooncusser (src/zmboss2.js's,
//       his own fight): his false lights burn on the gibbets, and while any burns no shot touches him.
// Cinematics (src/cpm02c.js): the intro, the merchantman bearing away (after I), Jago taken (after II), the
// hanging (as III begins), his return (in III), and the outro.
// Together it's host-authoritative: the host runs the lights, the ship, the boats and the gang, and sends them in
// the stage's word (m2: phase, which lights burn, how near she is, which boats are holed, Jago's state); a joined
// player asks the host to put out a light or hole a boat (raidAsk 'douse' / 'hole').

cpCast('sarg', { n: 'Sergeant Ybarra', c: '#e8c27a' });
cpCast('gov', { n: 'The Governor', c: '#d8c8a8' });
cpCast('jago', { n: 'Black Jago', c: '#d8a060' });
cpCast('look', { n: 'A Lookout', c: '#c8d0d8' });
Object.assign(CP_MUSIC_FALL, { cpm02lights: 'gwhold', cpm02cove: 'frisle', cpm02wall: 'raidfort', cpm02boss: 'frboss', cpm02sad: 'raidpier' });

cpMission({ id: 'm02', act: 1, n: 'The Mooncussers', when: 'The 1600s', where: 'The point below the sea fort',
  blurb: 'The wrecking years. Mooncussers hang false lights on the rocks to draw ships in. Put the lights out before the merchantman strikes, take their master alive, and see him hanged in chains on the sea wall. Some of them came back.',
  stages: ['cp_m02lights', 'cp_m02cove', 'cp_m02wall'], intro: 'm02_intro', outro: 'm02_outro',
  after: { 0: 'm02_bear', 1: 'm02_taken' }, cut: { 2: 'm02_hanged' }, music: { default: 'cpm02lights' }, lives: 2,
  begin() { cplReset(); CPG.sees = null; CPG.lit = null; CPG.atGoal = null; cpgMoonless(true); },
  stop() { cplReset(); CPG.sees = null; CPG.lit = null; CPG.atGoal = null; cpgMoonless(false); if (typeof GL3D !== 'undefined' && GL3D.sea) GL3D.sea.visible = true; },
});

const CPM2 = { R: 66, LIGHTS: 5, DOUSE: 1.6, HOLE: 2.4, STRIKE: 165, AWAY: 4, START: [-22, 40], SHIP0: [240, -330], SHIPX: [-6, -78] };
const CPM2_COL = ['#ff4a32', '#46ff78'];   // (red and green, like a harbour's pier lamps)

// ---------- the look: the reef's dark wet rock under the fort's cliff ----------
FPS_ISLES.cpm02 = Object.assign({}, FPS_ISLES.reef, { name: 'the point', wrecks: [3, 6, 9], rocks: [7, 3, 6, 1.1], birds: ['bat', 0], tufts: ['#3e5a3a', 30],
  fog: ['#070b10', 30, 380], sky: '50,60,90', skyA: 0.05, mist: '40,50,60', mistA: 0.12, nLights: 6, indoor: false, keep: false, arena: false, pools: 8, wrack: 80 });
// a false light: a spar stepped in a cairn, leaning out to sea, with a ship's lantern on a gallows arm
FPI_K.cp2pole = {
  col: FPI_C.wood3,
  sol(p) { return [fpiCirc(p, 0, 0, 0.7, 1.0), fpiCirc(p, 0, 0, 0.16, 4.2)]; },
  b3(p, A) {
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + A.r() * 0.4; A.part('ico', i % 2 ? FPI_C.stone : FPI_C.stone2, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.25 + A.r() * 0.3, 0.5, 0.45, 0.5, A.r() * 3); }
    A.cyl(FPI_C.wood3, 0, 0, 0, 0.11, 4.3, 0, 0.06, 0, 'cyl6');
    A.box(FPI_C.wood3, 0.55, 0, 3.95, 1.25, 0.09, 0.09);
    A.box(FPI_C.wood3, 0.3, 0, 3.5, 0.75, 0.06, 0.06, 0, 0, 0.7);
    A.box(FPI_C.rope, 1.08, 0, 3.55, 0.03, 0.03, 0.42);
    A.box(FPI_C.iron, 1.08, 0, 3.12, 0.26, 0.26, 0.04); A.box(FPI_C.iron, 1.08, 0, 3.5, 0.28, 0.28, 0.05); A.part('cone', FPI_C.iron, 1.08, 0, 3.6, 0.3, 0.14, 0.3);
    for (const [du, dv] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) A.box(FPI_C.iron, 1.08 + du, dv, 3.14, 0.025, 0.025, 0.38);
  },
};
// the gang's boats, drawn up the right way up on the shingle, oars across the thwarts
FPI_K.cp2boat = {
  col: '#3a3024',
  sol(p) { return [fpiBox(p, 0, 0, p.len / 2, p.beam / 2, 0.85)]; },
  b3(p, A) {
    const c = p.paint || '#34465a';
    A.part('half', c, 0, 0, 0.55, p.beam, p.len, 1.1, -Math.PI / 2, 0, -Math.PI / 2);
    A.part('cone', c, p.len / 2 + 0.25, 0, 0.55, p.beam * 0.95, 0.9, 1.0, 0, 0, -Math.PI / 2);
    for (const u of [-1.2, 0, 1.2]) A.box(FPI_C.wood3, u, 0, 0.55, 0.25, p.beam * 0.92, 0.06);
    A.log(FPI_C.wood2, 0.1, 0.25, 0.68, 0.035, p.len * 0.85, 0.06);
    A.log(FPI_C.wood2, -0.1, -0.25, 0.68, 0.035, p.len * 0.85, -0.05);
    A.box(FPI_C.rope, -p.len / 2 - 0.6, 0, 0, 1.2, 0.05, 0.05);
  },
};
FPI_GEN.cpm02 = {
  built: true,
  set(H) {
    const { R, IR } = H, a0 = Math.PI / 2;
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    const rel = (x, y) => [x - H.CX, y - H.CY];
    // the cliff under the fort, all along the north: great crags, sheer and dark
    for (let i = -7; i <= 7; i++) {
      const a = a0 + i * 0.105 + R(-0.02, 0.02), d = IR + R(3, 5) + Math.abs(i) * 0.45, r = R(9, 11) - Math.abs(i) * 0.3;
      const [x, y] = H.polar(a, d), prof = []; for (let k = 0; k < 7; k++) prof.push(R(0.7, 1)); prof[0] = R(0.4, 0.6); prof[6] = R(0.4, 0.6);
      H.rocks.push({ x, y, r, prof, ph: R(0, 6.28), rk: { h: 2.2 - Math.abs(i) * 0.07, tint: ['#2a2a26', 0.4] }, crag: true });
    }
    // the cliff path down from the fort: a stair cut in the rock at the foot of it
    const sa = a0 + 0.55, [sx, sy] = H.polar(sa, IR - 7);
    H.put('stair', sx, sy, sa, { n: 9, tread: 0.95, rise: 0.42, w: 2.1 });
    // the false lights: five spars along the seaward rocks, from the west round to the east
    const fl = [];
    for (let i = 0; i < CPM2.LIGHTS; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.56 + R(-0.05, 0.05), [x, y] = H.polar(a, IR - 6.5);
      H.put('cp2pole', x, y, a, {});
      const ux = Math.cos(a) * 1.08, uy = Math.sin(a) * 1.08;
      fl.push([...rel(x, y), ...rel(x + ux, y + uy), a]);
    }
    // the gang's landing: a shingle cove on the east side, three boats drawn up, their plunder, their fire
    const boats = [];
    for (const [k, da] of [[0, -0.2], [1, 0.02], [2, 0.24]]) {
      const a = 0.05 + da, [x, y] = H.polar(a, IR - 6.5);
      H.put('cp2boat', x, y, a + Math.PI / 2 + R(-0.15, 0.15), { len: 5.4, beam: 1.7, paint: FPI_C.paint[k] });
      boats.push(rel(x, y));
    }
    { const [x, y] = H.polar(0.05, IR - 15); fpiCrates(H, x, y, true); const [bx, by] = H.polar(0.32, IR - 14); fpiBarrels(H, bx, by); const [cx, cy] = H.polar(-0.25, IR - 13); fpiCrates(H, cx, cy, false); }
    const [fx, fy] = H.polar(0.05, IR - 20); { const p = H.put('fire', fx, fy, 0, {}); H.light(fx, fy, 0.5, '#ff8a3a', 11, 'fire'); H.I.lights[H.I.lights.length - 1].p = p; }
    Z.cp2 = { fl, boats, stair: rel(sx - Math.cos(sa) * 2, sy - Math.sin(sa) * 2), fire: rel(fx, fy) };
    H.track([H.polar(sa, IR - 8), H.polar(sa - 0.8, 30), [H.CX, H.CY - 10], H.polar(-Math.PI / 2, IR - 10)]);
    H.track([[H.CX, H.CY], H.polar(0.05, IR - 18)]);
  },
  props(H) {
    const { R, IR, TAU, wrecks } = H;
    for (const w of wrecks) for (let i = 0; i < 3; i++) { const at = H.near(w.x, w.y, 2, w.r * 0.8 + 3, w.r * 0.8 + 11, 2.4); if (at) H.put('plank', at[0], at[1], R(0, TAU), { len: R(2.5, 5), w: R(0.35, 0.6) }, true); }
    fpiScatter(H, 3, 1.5, 12, IR - 12, 2.6, (x, y) => fpiCrates(H, x, y, H.rng() < 0.3));
    fpiScatter(H, 2, 1.2, 12, IR - 12, 2.6, (x, y) => fpiBarrels(H, x, y));
    fpiScatter(H, 2, 1.6, 10, IR - 12, 2.6, (x, y) => H.put('cannon', x, y, R(0, TAU), { len: R(2.2, 2.8) }, true));
    fpiScatter(H, 1, 1.2, 10, IR - 12, 2.6, (x, y) => H.put('anchor', x, y, R(0, TAU), {}, true));
    fpiScatter(H, 1, 5.5, 12, IR - 16, 2.6, (x, y) => H.put('log', x, y, R(0, TAU), { len: R(9, 12), rad: 0.3, mast: true }, true));
    fpiScatter(H, 5, 2.4, 15, IR - 6, 2.6, (x, y) => H.put('plank', x, y, R(0, TAU), { len: R(2.5, 4.5), w: R(0.35, 0.6) }, true));
    fpiScatter(H, 3, 1, 12, IR - 15, 3, (x, y) => H.put('cairn', x, y, 0, { r: R(0.7, 1), hh: R(1.1, 1.7) }, true));
  },
  decor() {},
};
const CPM2_MAP = { start: CPM2.START, top: 0, R: CPM2.R, isle: 'cpm02', seed: 0x2c0de, shore: () => -999, nav: [-CPM2.R, CPM2.R, -CPM2.R, CPM2.R], zones: { pt: { n: 'the point', r: [-CPM2.R, CPM2.R, -CPM2.R, CPM2.R], sky: true } } };
const cp2Z = () => (FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.cp2) || { fl: [], boats: [], stair: [0, 50], fire: [50, 0] };
const cp2N = () => Math.max(1, ZM.hum.length);
const cp2Nick = sid => !ZM.net ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
function cp2Feed(text) { fpsFeed(text); if (ZM.net === 'host' && typeof zmnEvent === 'function') zmnEvent('feed', text); }

// ---------- the merchantman, and the fort over the cliff (built in each part's 3D on the point) ----------
// a merchantman of the period: a deep black hull with a pale strake, a high stern, three masts of square sail, a
// lantern at her stern and one at the masthead; pos and heading set by the caller (yaw: her bow's bearing)
function cp2Ship() {
  const S = new THREE.Group(), L = c => z3Lam(c), add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); S.add(m); return m; };
  const hull = L('#1a1612'), strake = L('#6a5a3c'), sail = new THREE.MeshLambertMaterial({ color: 0x9a9284, side: THREE.DoubleSide }), wood = L('#3a2a1c');
  // the hull: a long box, pinched at the bow, a raised poop aft (bow toward -z)
  { const g = new THREE.BoxGeometry(6.4, 3.4, 26); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const z = P.getZ(i), y = P.getY(i); if (z < -6) { const k = (-6 - z) / 7; P.setX(i, P.getX(i) * (1 - 0.8 * k)); } if (y < 0) P.setX(i, P.getX(i) * 0.75); } g.computeVertexNormals(); add(g, hull, 0, 0.4, 0); }
  add(new THREE.BoxGeometry(6.5, 0.45, 18), strake, 0, 1.2, 1.5);
  add(new THREE.BoxGeometry(6.0, 2.2, 6), hull, 0, 2.9, 9.5);
  add(new THREE.BoxGeometry(0.5, 0.5, 9), wood, 0, 2.6, -16.5).rotation.x = -0.25;
  for (const [z, h, w] of [[-7, 20, 11], [1, 23, 13], [8.5, 16, 8]]) {
    add(new THREE.CylinderGeometry(0.22, 0.32, h, 6), wood, 0, 2 + h / 2, z);
    for (let k = 0; k < 3; k++) { const sh = h * 0.24, sw = w * (1 - k * 0.2), y = 4.5 + k * h * 0.28; const s = add(new THREE.PlaneGeometry(sw, sh, 4, 2), sail, 0, y + sh / 2, z + 0.3); const P = s.geometry.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, -Math.abs(P.getX(i)) * 0.06 + 0.4 * (1 - Math.pow(P.getX(i) / (sw / 2), 2))); s.geometry.computeVertexNormals(); add(new THREE.BoxGeometry(sw + 0.6, 0.18, 0.18), wood, 0, y + sh, z + 0.3); }
  }
  // her lanterns: at the stern and the masthead
  const glow = c => new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(c, c.replace(/[\d.]+\)$/, '0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  for (const [x, y, z, s] of [[0, 4.8, 12.6, 5], [0, 25.5, 1, 4], [2.6, 3.8, 6, 2.5], [-2.6, 3.8, 6, 2.5]]) { const g = glow('rgba(255,214,140,0.95)'); g.scale.setScalar(s); g.position.set(x, y, z); S.add(g); }
  return S;
}
function cp2ShipPose(G, x, y, yaw, t, list) { G.position.copy(z3v(x, y, FPSC.GROUND - 1.8)); G.rotation.set(0, -yaw + Math.PI, 0); G.rotateZ(Math.sin(t * 0.7) * 0.03 + (list || 0)); G.rotateX(Math.sin(t * 0.53) * 0.02); }
// the fort on the headland: its sea wall and bastion along the cliff top to the north, the Sea Battery's lamp, a lit
// window or two, and the gibbets along the wall where the governors hang wreckers in chains
function cp2Fort(grp) {
  const G = new THREE.Group(), st = z3Lam('#5a5246'), st2 = z3Lam('#4a4438'), dk = z3Lam('#1a1714'), CX = FPSC.CX, CY = FPSC.CY, IR = CPM2.R;
  const box = (m, x, y, z0, w, d, h) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.copy(z3v(CX + x, CY + y, FPSC.GROUND + z0 + h / 2)); G.add(b); return b; };
  const top = 13;
  box(st2, 0, IR + 22, -2, 150, 22, top + 2);   // (the headland's top, the fort's footing)
  box(st, -6, IR + 15, top, 96, 3, 8);   // (the sea wall)
  for (let x = -52; x <= 40; x += 2.6) box(st, x, IR + 14, top + 8, 1.4, 1.2, 1.1);   // (its merlons)
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 12, 14), st); c.position.copy(z3v(CX + 48, CY + IR + 16, FPSC.GROUND + top + 6)); G.add(c); }
  box(st2, -10, IR + 26, top, 40, 14, 14); box(st2, 22, IR + 28, top, 18, 12, 18);   // (the ranges inside, and the chapel's tower)
  for (const [x, z] of [[-18, 5], [-4, 6], [20, 9], [26, 13]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshBasicMaterial({ color: 0xffb860, fog: false })); w.position.copy(z3v(CX + x, CY + IR + 18.9 + (x > 10 ? 3 : 0), FPSC.GROUND + top + z)); G.add(w); }
  // the gibbets along the wall: a post, an arm, a cage
  for (const x of [-34, -22, -10, 14]) {
    box(dk, x, IR + 13.6, top + 8, 0.25, 0.25, 4.5); box(dk, x + 0.9, IR + 13.6, top + 12.3, 1.9, 0.2, 0.2);
    const cg = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 6, 1, true), new THREE.MeshLambertMaterial({ color: 0x141210, wireframe: true })); cg.position.copy(z3v(CX + x + 1.7, CY + IR + 13.6, FPSC.GROUND + top + 10.8)); G.add(cg);
  }
  // the Sea Battery's lamp, and Lantern Rock's fire far out on the water (the only true light on this coast)
  const glow = (c, s, x, y, z) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(c, c.replace(/[\d.]+\)$/, '0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); g.scale.setScalar(s); g.position.copy(z3v(CX + x, CY + y, FPSC.GROUND + z)); G.add(g); return g; };
  glow('rgba(255,200,120,0.9)', 3, -40, IR + 13.5, top + 10);
  const rock = glow('rgba(255,150,70,0.95)', 26, -900, -1400, 6);
  grp.add(G);
  return { G, rock };
}

// ---------- Part I: the False Lights ----------
const CP2L = { ph: ['lights', 'away'] };
function cp2LitN() { return (RAID.st.lit || []).filter(Boolean).length; }
// where the ship is: from far out to the south-east (c 0) to on the rocks below the point (c 1)
function cp2ShipAt(c) { const k = c * c * 0.4 + c * 0.6, a = CPM2.SHIP0, b = CPM2.SHIPX; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
function cp2Lamps() { cplReset(); for (const [, , lx, ly, a] of cp2Z().fl) cplAdd(lx, ly, 3.3, CPM2_COL[cplLamps().length % 2], 15, { s: 1.2 }); }
const cplLamps = () => CPL.list;
// one of the gang, on the host: at a light (a guard), or down the cliff stair (sent somewhere, or to fight)
function cp2Guard(i, aware) { const f = cp2Z().fl[i]; if (!f) return null; const a = f[4] + Math.PI + (Math.random() - 0.5) * 1.2, d = 3 + Math.random() * 3; return cpgSpawn(f[0] + Math.cos(a) * d, f[1] + Math.sin(a) * d, { h: bearingOf(-Math.cos(f[4]), -Math.sin(f[4])), aware, gun: Math.random() < 0.75 }); }
function cp2FromStair(o) { const s = cp2Z().stair; return cpgSpawn(s[0] + (Math.random() - 0.5) * 3, s[1] + (Math.random() - 0.5) * 3, Object.assign({ aware: 1, gun: Math.random() < 0.7 }, o || {})); }

cpStage('m02lights', {
  n: 'The False Lights',
  map: CPM2_MAP,
  set(H, K, Z) {},
  banner: () => ({ text: 'The False Lights', t: 4, sub: 'Part I' }),
  music: () => RAID.st.c > 0.72 && RAID.st.ph === 'lights' ? 'cpfight' : 'cpm02lights',
  enter() {
    const S = RAID.st;
    Object.assign(S, { ph: 'lights', lit: [1, 1, 1, 1, 1], c: 0, awayT: 0, spT: 14, said: {}, rl: [0, 0, 0, 0, 0], seen: -1 });
    cp2Lamps();
    // (a moonless night: they'll see you within a stone's throw of their lanterns, or hear your shots)
    CPG.sees = (z, p, d) => d < 20; CPG.lit = null; CPG.atGoal = cp2AtGoal;
    if (ZM.net === 'client') return;
    cpObjective('Put out the false lights before the merchantman strikes');
    cp2Way();
    const n = cp2N();
    for (let i = 0; i < CPM2.LIGHTS; i++) cp2Guard(i, false);
    for (let k = 1; k < n; k++) cp2Guard((Math.random() * CPM2.LIGHTS) | 0, false);
    setTimeout(() => { if (RAID.st === S && !ZM.over) cpSay('sarg', 'Down the cliff path, quick. Put out every light on the point before she strikes.', 'cp_m02_06'); }, 600);
  },
  tick(dt) {
    const S = RAID.st, n = cp2N(), lit = cp2LitN();
    if (S.ph === 'lights') {
      // she comes in: nearer for every light that burns
      S.c = Math.min(1, S.c + dt / CPM2.STRIKE * (lit / CPM2.LIGHTS) * (1 + 0.08 * (n - 1)));
      if (S.c > 0.7 && !S.said.near) { S.said.near = 1; cpSay('sarg', 'She is in among the outer rocks. Faster!', 'cp_m02_09'); }
      if (S.c >= 1) { cpFail('The merchantman struck the point, and the Mooncussers had her'); return; }
      if (lit === 0) { S.ph = 'away'; S.awayT = 0; cpSay('sarg', 'That is the last of them. Now let her see the dark.', 'cp_m02_11'); cpObjective('She bears away'); cpWaypoint(null); }
      // more of the gang down the cliff: some to fight, some to light the ones you've put out again
      S.spT -= dt;
      const alive = cpgAlive(), cap = Math.round(3 + 1.6 * n + lit * 0.4);
      if (S.spT <= 0) {
        S.spT = (13 - 2 * Math.min(1, S.c * 1.4)) / Math.sqrt(1 + 0.4 * (n - 1)) * (0.8 + Math.random() * 0.4);
        if (alive < cap) {
          const out = S.lit.map((v, i) => v ? -1 : i).filter(i => i >= 0), going = cpgAll().filter(z => z.goal).length;
          if (out.length && going < Math.min(2, out.length) && Math.random() < 0.6) { const i = out[(Math.random() * out.length) | 0], f = cp2Z().fl[i], z = cp2FromStair({ gun: Math.random() < 0.5 }); if (z) { z.goal = [f[0] - Math.cos(f[4]) * 1.2, f[1] - Math.sin(f[4]) * 1.2]; z.goalI = i; z.goalD = 6; } }
          else cp2FromStair();
        }
      }
    } else if (S.ph === 'away') {
      S.awayT += dt;
      if (S.awayT >= CPM2.AWAY) { S.ph = 'done'; for (const z of cpgAll()) { z.dead = 1; z.deadT = 6; z.gone = true; } cpDone(); }
    }
  },
  shot(x, y) { cpgShot(x, y); },
  q(sid, k, a) {
    const S = RAID.st, i = a | 0;
    if (cpgAsk(k, a)) return;
    if (k === 'douse' && S.ph === 'lights' && S.lit[i]) {
      S.lit[i] = 0; S.rl[i] = 0;
      const lit = cp2LitN();
      cp2Feed(`${cp2Nick(sid)} put out a false light. ${lit ? lit + ' still burning.' : 'The point is dark.'}`);
      cpgNoise(FPSC.CX + cp2Z().fl[i][0], FPSC.CY + cp2Z().fl[i][1], 18);
      if (lit === CPM2.LIGHTS - 1 && !S.said.one) { S.said.one = 1; cpSay('sarg', 'One out. She has not seen it yet. Keep on.', 'cp_m02_07'); }
      else if (lit === 2 && !S.said.two) { S.said.two = 1; cpSay('sarg', 'Two more burning. Two!', 'cp_m02_10'); }
      cp2Way();
    }
  },
  pack(o) { const S = RAID.st; o.m2 = [CP2L.ph.indexOf(S.ph), S.lit.join(''), Math.round(S.c * 1000), Math.round(S.awayT * 10), S.rl.map(v => Math.round(v * 10)).join('.')]; },
  apply(o) {
    const S = RAID.st, a = o.m2; if (!Array.isArray(a)) return;
    S.ph = CP2L.ph[a[0] | 0] || 'lights'; S.lit = String(a[1] || '').split('').map(v => v === '1' ? 1 : 0); S.c = (a[2] | 0) / 1000; S.awayT = (a[3] | 0) / 10; S.rl = String(a[4] || '').split('.').map(v => (+v || 0) / 10);
  },
  me(dt) {
    const S = RAID.st, L = cplLamps();
    if (!CPM2.cineLamps) (S.lit || []).forEach((v, i) => { if (L[i]) cplSet(L[i], !!v); });
    // (a light lit again: everyone hears it catch)
    const lit = cp2LitN(); if (S.seen >= 0 && lit > S.seen) { try { sfxFlare(); } catch (e) {} ZM.banner = { text: 'They have lit a light again', t: 2.6, small: true, col: '#ff9070' }; } S.seen = lit;
    cphTick(dt, ZM.near, ZM.near && ZM.near.k === 'cp2fl' ? CPM2.DOUSE : 0, o => raidAsk('douse', o.i));
  },
  consider(c) { const S = RAID.st; if (S.ph !== 'lights') return; cp2Z().fl.forEach((f, i) => { if (S.lit[i]) c({ k: 'cp2fl', i }, FPSC.CX + f[0], FPSC.CY + f[1], 0, 2.7, false); }); },
  prompt(o) { return o.k === 'cp2fl' ? { text: 'Hold to put out the false light', hold: true } : null; },
  use(o) { return o.k === 'cp2fl'; },
  hud(phone, mono, fell) {
    const S = RAID.st, lit = cp2LitN(), dist = Math.round(Math.hypot(...cp2ShipAt(S.c).map((v, i) => v - CPM2.SHIPX[i])));
    if (S.ph === 'lights') { cpkLine(`False lights burning: ${lit} of ${CPM2.LIGHTS}`, 0, lit ? '#ffb090' : '#ffe2a8'); cpkBar(`THE MERCHANTMAN · ${dist} M OFF THE ROCKS`, S.c, 1, null, S.c > 0.72); }
    else cpkLine('She bears away to the west.', 0, '#ffe2a8');
    cphHud();
  },
  b3(grp) { cp2Build3D(grp, true); },
  f3(dt) { cp2Frame3D(dt); },
  exit() { cplReset(); },
  mend: false,
});
// (hosting) the waypoint: the nearest light still burning to the first of you
function cp2Way() {
  const S = RAID.st, m = FPS.me, F = cp2Z().fl; let best = -1, bd = 1e9;
  F.forEach((f, i) => { if (!S.lit[i]) return; const d = Math.hypot(FPSC.CX + f[0] - m.x, FPSC.CY + f[1] - m.y); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) cpWaypoint(F[best][0], F[best][1], 'False light', 3.3); else cpWaypoint(null);
}
// (hosting) one of the gang sent to light a light again: standing at it, he lights it in three seconds
function cp2AtGoal(z, dt) {
  const S = RAID.st, i = z.goalI;
  if (RAID_ORDER[RAID.stage] !== 'cp_m02lights' || S.ph !== 'lights' || i == null) return;
  if (S.lit[i]) { z.goal = null; return; }
  S.rl[i] = Math.min(3.2, (S.rl[i] || 0) + dt);
  if (S.rl[i] >= 3.2) { S.lit[i] = 1; S.rl[i] = 0; z.goal = null; cp2Feed('The gang have lit a false light again.'); if (!S.said.re) { S.said.re = 1; cpSay('sarg', 'They have lit one again! Get back to it.', 'cp_m02_08'); } cp2Way(); }
}

// ---------- the point's 3D, for Parts I and II: the night, the ship, the fort, the lamps ----------
const CP2_3D = { ship: null, fort: null, ok: false };
function cp2Build3D(grp, ship) {
  CP2_3D.ok = true;
  CP2_3D.fort = cp2Fort(grp);
  CP2_3D.ship = null;
  if (ship) { CP2_3D.ship = cp2Ship(); grp.add(CP2_3D.ship); }
  cplBuild3D(grp);
  // the gang's fire's glow
}
function cp2Frame3D(dt) {
  if (!CP2_3D.ok || typeof GL3D === 'undefined') return;
  const t = g.t, S = RAID.st;
  // a moonless night
  GL3D.amb.intensity = 0.3; GL3D.moon.intensity = 0.05;
  if (GL3D.scene.fog) { const F = GL3D.scene.fog; F.color.setRGB(0.02, 0.028, 0.04); F.near = 25; F.far = 360; RAID.fog0 = true; }
  if (CP2_3D.fort) CP2_3D.fort.rock.material.opacity = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.1);
  cplTick3D(dt);
  const sh = CP2_3D.ship;
  if (sh) {
    let x, y, yaw;
    if (S.ph === 'lights' || !S.ph) { [x, y] = cp2ShipAt(S.c || 0); const [nx, ny] = cp2ShipAt(Math.min(1, (S.c || 0) + 0.02)); yaw = bearingOf(nx - x, ny - y); }
    else { const k = Math.min(1, (S.awayT || 0) / CPM2.AWAY); [x, y] = cp2ShipAt(S.c || 0); yaw = bearingOf(-1, -0.2) * k + bearingOf(CPM2.SHIPX[0] - CPM2.SHIP0[0], CPM2.SHIPX[1] - CPM2.SHIP0[1]) * (1 - k); x -= k * k * 30; y -= k * 8; }
    cp2ShipPose(sh, FPSC.CX + x, FPSC.CY + y, yaw, t, S.ph === 'away' ? -0.08 : 0);
  }
}

// ---------- Part II: the Wreckers' Landing ----------
const CP2C = { ph: ['boats', 'jago', 'taken'] };
cpStage('m02cove', {
  n: 'The Wreckers’ Landing',
  map: CPM2_MAP,
  set(H, K, Z) {},
  banner: () => ({ text: 'The Wreckers’ Landing', t: 4, sub: 'Part II' }),
  music: () => RAID.st.ph === 'jago' ? 'cpfight' : 'cpm02cove',
  enter() {
    const S = RAID.st;
    Object.assign(S, { ph: 'boats', holed: [0, 0, 0], spT: 3, jz: 0, jk: 1, said: {}, wave: 0 });
    cp2Lamps(); for (const L of cplLamps()) cplSet(L, false);
    CPG.sees = null; CPG.atGoal = null;
    if (ZM.net === 'client') return;
    cpObjective('Stave in the gang’s boats in the cove');
    cp2BoatWay();
    setTimeout(() => { if (RAID.st === S && !ZM.over) cpSay('sarg', 'Their boats are drawn up in the cove. Stave them in, and they have nowhere to run.', 'cp_m02_14'); }, 500);
    const n = cp2N(); for (let k = 0; k < 2 + n; k++) { const b = cp2Z().boats[k % 3]; cpgSpawn(b[0] - 6 - Math.random() * 6, b[1] + (Math.random() - 0.5) * 10, { aware: 1, gun: Math.random() < 0.7 }); }
  },
  tick(dt) {
    const S = RAID.st, n = cp2N();
    if (S.ph === 'boats') {
      S.spT -= dt;
      if (S.spT <= 0) { S.spT = 9 / Math.sqrt(1 + 0.4 * (n - 1)) * (0.8 + Math.random() * 0.4); if (cpgAlive() < 3 + 1.5 * n) { cp2FromStair(); if (Math.random() < 0.35 + 0.1 * n) cp2FromStair(); } }
      if (S.holed.every(Boolean)) {
        S.ph = 'jago';
        const z = cp2FromStair({ gun: true, hp: zmHp(RAIDC.ROUND + 2) * CPG.HP * 6 * (1 + 0.5 * (n - 1)), n: 'Black Jago' }); if (z) { z.jago = 1; z.sp *= 0.9; S.jz = z.zn; }
        for (let k = 0; k < 1 + n; k++) cp2FromStair();
        cpObjective('Take Black Jago alive'); cpWaypoint(null);
        cpSay('jago', 'You will not take Jago on his own rocks, soldier.', 'cp_m02_15');
        setTimeout(() => { if (RAID.st === S && !ZM.over) cpSay('sarg', 'That is him. Black Jago. Alive, the Governor said. Bring him to his knees, but do not kill him.', 'cp_m02_16'); }, 3500);
      }
    } else if (S.ph === 'jago') {
      const J = ZM.z.find(z => z.zn === S.jz);
      S.jk = J ? clamp(J.hp / J.max, 0, 1) : 0;
      S.spT -= dt;
      if (S.spT <= 0) { S.spT = 11 / Math.sqrt(1 + 0.4 * (n - 1)); if (cpgAlive() < 2 + n) cp2FromStair(); }
      if (!J || J.hp <= J.max * 0.12) {
        S.ph = 'taken';
        if (J) { J.act = null; J.aware = 0; J.goal = null; J.dead = 1; J.deadT = 0; J.gone = true; }
        for (const z of cpgAll()) { z.dead = 1; z.deadT = 0; }
        cpSay('jago', 'Enough! Enough. I will walk.', 'cp_m02_18');
        setTimeout(() => { if (RAID.st === S && !ZM.over) cpDone(); }, 1800);
      }
    }
  },
  // (Jago can't be killed: nothing takes him below a tenth of his strength)
  hurt(d, dmg) { if (d.jago && ZM.net !== 'client' && d.hp - dmg <= d.max * 0.1) return Math.max(0, d.hp - d.max * 0.1); return dmg; },
  q(sid, k, a) {
    const S = RAID.st, i = a | 0;
    if (k === 'hole' && S.ph === 'boats' && !S.holed[i]) {
      S.holed[i] = 1; const left = S.holed.filter(v => !v).length;
      cp2Feed(`${cp2Nick(sid)} stove in a boat. ${left ? left + ' left.' : 'They have nowhere to run.'}`);
      if (left === 2) cpSay('sarg', 'That is one boat holed.', 'cp_m02_17');
      cpgNoise(FPSC.CX + cp2Z().boats[i][0], FPSC.CY + cp2Z().boats[i][1], 30);
      cp2BoatWay();
    }
  },
  pack(o) { const S = RAID.st; o.m2c = [CP2C.ph.indexOf(S.ph), S.holed.join(''), Math.round(S.jk * 1000)]; },
  apply(o) { const S = RAID.st, a = o.m2c; if (!Array.isArray(a)) return; S.ph = CP2C.ph[a[0] | 0] || 'boats'; S.holed = String(a[1] || '').split('').map(v => v === '1' ? 1 : 0); S.jk = (a[2] | 0) / 1000; },
  me(dt) { cphTick(dt, ZM.near, ZM.near && ZM.near.k === 'cp2bt' ? CPM2.HOLE : 0, o => { raidAsk('hole', o.i); try { sfxPlay('axechop', { vol: 0.8 }); } catch (e) {} }); },
  consider(c) { const S = RAID.st; if (S.ph !== 'boats') return; cp2Z().boats.forEach((b, i) => { if (!S.holed[i]) c({ k: 'cp2bt', i }, FPSC.CX + b[0], FPSC.CY + b[1], 0, 3.2, false); }); },
  prompt(o) { return o.k === 'cp2bt' ? { text: 'Hold to stave in the boat', hold: true } : null; },
  use(o) { return o.k === 'cp2bt'; },
  hud(phone, mono, fell) {
    const S = RAID.st;
    if (S.ph === 'boats') cpkLine(`Boats stove in: ${S.holed.filter(Boolean).length} of 3`, 0);
    else if (S.ph === 'jago') { cpkLine('Black Jago: bring him to his knees, alive', 0, '#ffd0a0'); cpkBar('', 1 - (1 - S.jk) / 0.88, 1, '#d8a060'); }
    cphHud();
  },
  b3(grp) { cp2Build3D(grp, false); CP2_3D.holes = []; },
  f3(dt) {
    cp2Frame3D(dt);
    // a holed boat sits down on the shingle, broken-backed
    if (!CP2_3D.splint) CP2_3D.splint = {};
    (RAID.st.holed || []).forEach((v, i) => { if (v && !CP2_3D.splint[i]) { CP2_3D.splint[i] = 1; const b = cp2Z().boats[i]; for (let k = 0; k < 10; k++) fpsPuff(FPSC.CX + b[0], FPSC.CY + b[1], FPSC.GROUND + 0.6, '110,90,60', 2); } });
  },
  exit() { cplReset(); CP2_3D.splint = null; },
  mend: false,
});
function cp2BoatWay() { const S = RAID.st, i = S.holed.findIndex(v => !v); if (i < 0) { cpWaypoint(null); return; } const b = cp2Z().boats[i]; cpWaypoint(b[0], b[1], 'Boat', 1); }
