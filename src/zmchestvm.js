// The wreck chest's own weapons, in your hands (and on the chest, the bench and the others' figures, which borrow
// these models): the first-person models and their movements, after src/fpsgun.js's. Each comes up with vmPlace, so
// the sway, the bob, the run and the kick are the same as the rest; each has its own reload.
//  - Duck's-Foot: four short barrels splayed flat from one brass breech, one big hammer, a bird's-head grip.
//    Reloading: muzzles up, a brass charger of four paper cartridges pushed into all four mouths at once, the empty
//    charger flicked away, the hammer thumbed back.
//  - Bomb-Lance: a brass-bound shoulder gun with the lance's head and its bomb standing out of the muzzle.
//    Reloading: tip it, a new lance up from below and slid home, the bomb's fuse cap given a twist, cock.
//  - Grapnel Gun: a short bell-mouthed gun with a four-tined grapnel seated in its mouth and a drum of line under
//    it. Firing throws the hook away; reloading cranks the line in until the hook comes back, folds its tines and
//    seats itself, then the lever's thrown.
//  - Flare Pistol: a fat brass barrel on a hinge, a big spur hammer. Reloading: break it open, the spent case jumps
//    out over your shoulder, a fresh red-capped cartridge thumbed in, snapped shut.
//  - Boarding Axe: a bearded iron head with a back spike on a long ash haft. Two wide sweeps and an overhead chop,
//    with a trail through the air; R turns it to look along the edge. (Reforged, while it's thrown your hand's empty.)
//  - Punt Gun: a barrel longer than you are tall, banded in iron, a heavy stock. Reloading (long): muzzle up, a
//    great flask of powder, a bag of shot, three strokes of the long rammer, a cap, cock.
//  - Net Mortar: a stubby brass mortar on a stock, a bundled net in its mouth with lead weights round it. Reloading:
//    a fresh bundle pushed in, the four weights pressed into their clips, two pumps of the charging lever.
//  - Chain-Shot: twin bronze barrels side by side, a ball in each mouth and the chain sagging between. Reloading: a
//    linked pair of balls brought up, one dropped down each barrel, the chain laid in its notch, cock.

Object.assign(VM_PLAIN, {
  duckfoot:  { metal: '#3c3a38', dark: '#1c1b1a', wood: '#5a3a22', brass: '#a8843a', accent: '#d8ccb0', glow: null },
  bomblance: { metal: '#3a3e44', dark: '#1a1c20', wood: '#4e3220', brass: '#b08c40', accent: '#a83a2a', glow: null },
  grapnel:   { metal: '#44464a', dark: '#1e1f22', wood: '#5a3e26', brass: '#9a7a34', accent: '#c8b088', glow: null },
  flaregun:  { metal: '#2e3034', dark: '#18191c', wood: '#3a2416', brass: '#c09040', accent: '#d84a2a', glow: null },
  axe:       { metal: '#9aa0a8', dark: '#2a2b30', wood: '#7a5a38', brass: '#9a7a34', accent: '#3a2a1a', glow: null },
  puntgun:   { metal: '#34373c', dark: '#18191d', wood: '#4a2e1a', brass: '#8a6a2c', accent: '#8a8a90', glow: null },
  netmortar: { metal: '#3a3c40', dark: '#1a1b1e', wood: '#56381f', brass: '#b8903c', accent: '#c8b48a', glow: null },
  chainshot: { metal: '#3a3a3e', dark: '#141416', wood: '#4a3020', brass: '#9a6a34', accent: '#5a5a60', glow: null },
});
const zxvV = (x, y, z) => new THREE.Vector3(x, y, z);
const zxvTrig = (w, S) => { if (w.trig) w.trig.rotation.x = S.trigger ? 0.35 : 0; };
function zxvBall(r, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); }

// Duck's-Foot ------------------------------------------------------------------------------------
const ZXV_DUCK = [-0.22, -0.075, 0.075, 0.22];
function zxvCharger(M) {
  const g = new THREE.Group(), paper = new THREE.MeshLambertMaterial({ color: 0xe8e0c8 });
  g.add(box(0.11, 0.008, 0.016, M.brass, 0, -0.012, 0));
  ZXV_DUCK.forEach(a => { const c = zcyl(0.0085, 0.0085, 0.045, paper, 10, 0.04, a * 0.16, 0); c.rotation.y = -a; g.add(c); });
  return g;
}
VM_BUILD.duckfoot = (M) => {
  const root = new THREE.Group();
  root.add(box(0.07, 0.034, 0.07, M.brass, 0, 0.04, -0.02));
  root.add(box(0.072, 0.008, 0.074, M.iron, 0, 0.06, -0.02));
  const barrels = new THREE.Group(); barrels.position.set(0, 0.04, -0.055); root.add(barrels);
  for (const a of ZXV_DUCK) {
    const b = new THREE.Group(); b.rotation.y = -a; b.position.x = a * 0.12; barrels.add(b);
    b.add(zcyl(0.0115, 0.0105, 0.19, M.iron, 12, 0));
    b.add(zcyl(0.0125, 0.0125, 0.012, M.brass, 12, -0.18));
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 10), M.bore); bore.position.z = -0.1915; b.add(bore);
  }
  // one big hammer over a single nipple, the trigger, a bird's-head grip with a brass cap
  const hammer = new THREE.Group(); hammer.position.set(0, 0.06, 0.02); root.add(hammer);
  const hn = box(0.012, 0.04, 0.012, M.dark, 0, 0.018, -0.012); hn.rotation.x = -0.5; hammer.add(hn); hammer.add(box(0.02, 0.01, 0.02, M.dark, 0, 0.036, -0.028));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.02, 0.0); root.add(guard);
  const trig = box(0.006, 0.024, 0.008, M.dark, 0, 0.012, 0.0); root.add(trig);
  root.add(profile([[0.005, 0.03], [0.04, -0.03], [0.03, -0.09], [0.06, -0.11], [0.09, -0.09], [0.08, -0.02], [0.05, 0.035]], 0.034, M.wood, 0.004));
  const capB = zxvBall(0.016, M.brass); capB.scale.set(1.2, 0.7, 1.3); capB.position.set(0, -0.1, 0.075); root.add(capB);
  const hand = vmHand(VM.H, false); hand.position.set(0.01, -0.035, 0.055); root.add(hand);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.04, -0.25); root.add(muzzle);
  const fresh = zxvCharger(M); fresh.visible = false; root.add(fresh);
  return { root, M, hand, hammer, trig, muzzle, fresh, barrels, pose: { x: 0.055, y: -0.14, z: -0.31, rx: 0.12, ry: 0.09, rz: -0.07 }, smoke: 6, flashK: 1.5 };
};
VM_ANIM.duckfoot = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) w.down = 1;
  const tip = vmSeg(p, 0, 0.14) - vmSeg(p, 0.84, 1), bring = vmSeg(p, 0.16, 0.42), push = vmSeg(p, 0.42, 0.55), away = vmSeg(p, 0.58, 0.7), cock = vmSeg(p, 0.74, 0.86);
  w.steps = w.steps || [[0.44, () => vmNoise(2600, 0.06, 0.15)], [0.54, () => vmClick(620, 0.06)], [0.62, () => vmNoise(5000, 0.03, 0.12)], [0.85, () => { vmClick(950, 0.05); vmClick(520, 0.05); }]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: -tip * 0.05, z: -tip * 0.06, rx: tip * 0.45, ry: -tip * 0.2, rz: tip * 0.3 });
  if (S.reloading && p > 0.86) w.down = 0;
  w.hammer.rotation.x = (S.reloading ? (p < 0.74 ? 1 : 1 - cock) : (w.down ? 1 : 0)) * 0.6;
  zxvTrig(w, S);
  w.fresh.visible = S.reloading && bring > 0.01 && away < 0.99;
  if (w.fresh.visible) {
    const home = zxvV(-0.2, -0.3, 0.05), front = zxvV(0, 0.04, -0.33), inn = zxvV(0, 0.04, -0.27), gone = zxvV(-0.25, 0.1, -0.2);
    w.fresh.position.copy(home).lerp(front, bring).lerp(inn, push).lerp(gone, away); w.fresh.rotation.set(0, 0, (1 - bring) * 0.9 + away * 1.5);
    vmLeftAt(w, w.fresh.position.clone().add(zxvV(-0.01, -0.035, 0.03)), [0.3, 0, -0.4]);
  } else if (S.reloading && cock > 0.01 && cock < 0.99) vmLeftAt(w, zxvV(0.0, 0.1, 0.05), [0, 0, -1.2]);
};

// Bomb-Lance ------------------------------------------------------------------------------------
function zxvLance(M) {
  const g = new THREE.Group();
  g.add(zcyl(0.006, 0.006, 0.5, M.iron, 8, 0.12));
  g.add(zcyl(0.018, 0.018, 0.12, M.brass, 14, -0.36));   // the bomb
  g.add(zcyl(0.018, 0.0, 0.03, M.brass, 14, -0.48));
  const cap = new THREE.Group(); cap.position.z = -0.24; g.add(cap);
  cap.add(zcyl(0.02, 0.02, 0.012, M.accent, 14, 0)); for (let i = 0; i < 4; i++) { const k = box(0.003, 0.006, 0.012, M.dark, Math.cos(i * 1.57) * 0.021, Math.sin(i * 1.57) * 0.021, -0.006); cap.add(k); }
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 4), M.dark); head.rotation.x = -Math.PI / 2; head.position.z = -0.53; g.add(head);
  for (const s of [-1, 1]) { const f = box(0.002, 0.03, 0.04, M.iron, 0, s * 0.012, 0.1); g.add(f); }
  g.userData.cap = cap;
  return g;
}
VM_BUILD.bomblance = (M) => {
  const root = new THREE.Group();
  root.add(zcyl(0.028, 0.026, 0.44, M.brass, 18, 0.0, 0, 0.055));
  for (const z of [-0.02, -0.16, -0.3, -0.43]) root.add(zcyl(0.031, 0.031, 0.014, M.iron, 18, z, 0, 0.055));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), M.bore); bore.position.set(0, 0.055, -0.441); root.add(bore);
  root.add(profile([[0.0, 0.05], [0.16, 0.04], [0.34, 0.06], [0.37, 0.065], [0.38, -0.07], [0.3, -0.06], [0.12, -0.0], [0.05, 0.0], [0.03, -0.09], [-0.004, -0.09], [-0.012, 0.03]], 0.05, M.wood, 0.005));
  root.add(box(0.054, 0.135, 0.012, M.iron, 0, 0.0, 0.38));
  const lance = zxvLance(M); lance.position.set(0, 0.055, -0.02); root.add(lance);
  const hammer = new THREE.Group(); hammer.position.set(0.03, 0.055, 0.04); root.add(hammer);
  const hn = box(0.01, 0.045, 0.012, M.dark, 0, 0.022, -0.012); hn.rotation.x = -0.5; hammer.add(hn); hammer.add(box(0.016, 0.012, 0.024, M.dark, 0, 0.04, -0.03));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.0, 0.03); root.add(guard);
  const trig = box(0.006, 0.024, 0.008, M.dark, 0, 0.0, 0.025); root.add(trig);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.05, 0.02); root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.02, 0.0, -0.27); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const fresh = zxvLance(M); fresh.visible = false; root.add(fresh);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.055, -0.45); root.add(muzzle);
  return { root, M, hand, left, lance, fresh, hammer, trig, muzzle, pose: { x: 0.065, y: -0.18, z: -0.44, rx: 0.09, ry: 0.08, rz: -0.05 }, smoke: 4, flashK: 1.1 };
};
VM_ANIM.bomblance = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) { w.out = 0.0001; w.down = 1; }
  if (w.out) w.out = Math.min(1, w.out + S.dt * 8);
  const tip = vmSeg(p, 0, 0.12) - vmSeg(p, 0.88, 1), bring = vmSeg(p, 0.14, 0.4), slide = vmSeg(p, 0.4, 0.6), twist = p > 0.62 && p < 0.76 ? (p - 0.62) / 0.14 : -1, cock = vmSeg(p, 0.78, 0.86);
  w.steps = w.steps || [[0.42, () => vmNoise(1100, 0.05, 0.25)], [0.6, () => vmClick(480, 0.08)], [0.66, () => vmClick(1300, 0.03)], [0.72, () => vmClick(1500, 0.03)], [0.85, () => { vmClick(800, 0.06); vmClick(450, 0.06); }]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: -tip * 0.03, z: -tip * 0.06, rx: tip * 0.4, ry: -tip * 0.25, rz: tip * 0.45 });
  if (S.reloading && p > 0.6) w.out = 0;
  w.lance.visible = S.reloading ? p >= 0.6 : (!w.out || w.out < 1);
  w.lance.position.z = -0.02 - (w.out && !S.reloading ? w.out * 0.9 : 0);
  if (twist >= 0) w.lance.userData.cap.rotation.z = twist * Math.PI * 2;
  w.hammer.rotation.x = (S.reloading ? (p < 0.78 ? 1 : 1 - cock) : (w.down ? 1 : 0)) * 0.6;
  if (S.reloading && p > 0.86) w.down = 0;
  zxvTrig(w, S);
  w.fresh.visible = S.reloading && p >= 0.14 && p < 0.6;
  if (w.fresh.visible) {
    const front = zxvV(0, 0.055, -0.62), home = zxvV(-0.3, -0.35, -0.45);
    w.fresh.position.copy(home).lerp(front, bring); w.fresh.position.z += slide * 0.6; w.fresh.rotation.z = (1 - bring) * 0.8;
    vmLeftAt(w, w.fresh.position.clone().add(zxvV(-0.015, -0.04, -0.34)), [0.2, 0, -0.5]);
  } else if (twist >= 0) vmLeftAt(w, zxvV(-0.02, 0.03, -0.27), [0.2, twist * 0.8, -0.6]);
  w.left.visible = !VM.lhand.visible;
};

// Grapnel Gun ------------------------------------------------------------------------------------
function zxvHook(M) {
  const g = new THREE.Group();
  g.add(zcyl(0.007, 0.007, 0.16, M.iron, 8, 0.06));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.003, 6, 12), M.iron); ring.position.z = 0.065; g.add(ring);
  const tines = [];
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Group(); t.position.z = -0.1; t.rotation.z = i * Math.PI / 2; g.add(t);
    const arm = new THREE.Group(); t.add(arm);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0045, 6, 12, Math.PI * 0.75), M.dark); arc.rotation.set(0, Math.PI / 2, -Math.PI * 0.5); arc.position.set(0, 0.028, 0.0); arm.add(arc);
    const pt = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 4), M.dark); pt.position.set(0, 0.05, 0.026); pt.rotation.x = Math.PI * 0.7; arm.add(pt);
    tines.push(arm);
  }
  g.userData.tines = tines;
  return g;
}
VM_BUILD.grapnel = (M) => {
  const root = new THREE.Group();
  root.add(zcyl(0.03, 0.034, 0.26, M.iron, 18, 0.0, 0, 0.055));
  root.add(zcyl(0.034, 0.05, 0.06, M.iron, 18, -0.26, 0, 0.055));
  root.add(zcyl(0.052, 0.052, 0.012, M.brass, 20, -0.31, 0, 0.055));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.045, 18), M.bore); bore.position.set(0, 0.055, -0.3); root.add(bore);
  const hook = zxvHook(M); hook.position.set(0, 0.055, -0.27); root.add(hook);
  // the drum of line under the barrel, its crank on the right
  const drum = new THREE.Group(); drum.position.set(0, -0.005, -0.14); root.add(drum);
  drum.add(zcyl(0.035, 0.035, 0.09, M.wood, 18, 0.045));
  for (let i = 0; i < 5; i++) drum.add(zcyl(0.037, 0.037, 0.008, M.accent, 16, 0.03 - i * 0.016));
  const crank = new THREE.Group(); crank.position.set(0.045, -0.005, -0.14); root.add(crank);
  crank.add(box(0.006, 0.05, 0.008, M.dark, 0, -0.022, 0)); crank.add(box(0.025, 0.01, 0.01, M.wood, 0.012, -0.045, 0));
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.2, 4), M.accent); line.rotation.x = Math.PI / 2; line.position.set(0, 0.03, -0.2); root.add(line);
  root.add(profile([[0.0, 0.05], [0.1, 0.045], [0.3, 0.065], [0.32, 0.07], [0.33, -0.06], [0.26, -0.05], [0.1, 0.0], [0.05, 0.0], [0.03, -0.09], [-0.005, -0.09], [-0.01, 0.02]], 0.05, M.wood, 0.005));
  const lever = new THREE.Group(); lever.position.set(-0.034, 0.06, 0.03); root.add(lever);
  lever.add(box(0.006, 0.008, 0.07, M.dark, 0, 0, -0.03)); { const k = zxvBall(0.008, M.brass); k.position.set(0, 0, -0.065); lever.add(k); }
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.0, 0.03); root.add(guard);
  const trig = box(0.006, 0.024, 0.008, M.dark, 0, 0.0, 0.025); root.add(trig);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.05, 0.02); root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.02, -0.04, -0.2); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.055, -0.33); root.add(muzzle);
  return { root, M, hand, left, hook, drum, crank, lever, line, trig, muzzle, pose: { x: 0.07, y: -0.17, z: -0.4, rx: 0.08, ry: 0.08, rz: -0.05 }, smoke: 2, flashK: 0.6 };
};
VM_ANIM.grapnel = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) { w.out = 0.0001; w.spin = 30; }
  if (w.out) w.out = Math.min(1, w.out + S.dt * 7);
  w.spin = (w.spin || 0) * Math.pow(0.1, S.dt); w.drum.rotation.z += w.spin * S.dt;
  const tip = vmSeg(p, 0, 0.1) - vmSeg(p, 0.86, 1), crank = p > 0.1 && p < 0.62 ? (p - 0.1) / 0.52 : -1, seat = vmSeg(p, 0.55, 0.66), lever = vmSeg(p, 0.7, 0.78) - vmSeg(p, 0.8, 0.88);
  w.steps = w.steps || [[0.14, () => vmNoise(1400, 0.04, 0.15)], [0.26, () => vmNoise(1400, 0.04, 0.15)], [0.38, () => vmNoise(1400, 0.04, 0.15)], [0.5, () => vmNoise(1400, 0.04, 0.15)], [0.64, () => vmClick(560, 0.08)], [0.76, () => vmClick(900, 0.05)], [0.86, () => vmClick(600, 0.06)]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: -tip * 0.02, z: -tip * 0.05, rx: tip * 0.3, ry: -tip * 0.35, rz: tip * 0.3 });
  // the hook: away with the shot; back in along its line as the drum turns, its tines folding as it comes home
  let hz = -0.27, fold = 0;
  if (S.reloading) { const back = crank >= 0 ? crank : p >= 0.62 ? 1 : 0; hz = -0.27 - (1 - back) * 0.9 + seat * 0.0; fold = back < 1 ? 0.6 * (1 - seat) : 0; w.hook.visible = p > 0.12; }
  else { w.hook.visible = !w.out || w.out < 1; hz = -0.27 - (w.out ? w.out * 0.9 : 0); }
  if (S.reloading && p > 0.6) w.out = 0;
  w.hook.position.z = hz;
  w.hook.userData.tines.forEach(t => { t.rotation.x = -fold; });
  w.line.visible = w.hook.visible; w.line.scale.y = 1 + Math.max(0, -0.27 - hz) * 4; w.line.position.z = -0.2 + Math.min(0, hz + 0.27) * 0.5;
  if (crank >= 0) {
    const a = crank * Math.PI * 10; w.crank.rotation.z = a; w.drum.rotation.z = -a;
    w.root.updateMatrixWorld(true);
    vmLeftAt(w, zxvV(0.075 + Math.sin(a) * 0.04, -0.05 - Math.cos(a) * 0.04, -0.14), [0, 0.5, 0.6]);
  }
  w.lever.rotation.y = lever * 0.9;
  if (lever > 0.01) vmLeftAt(w, zxvV(-0.06 - lever * 0.03, 0.06, -0.03), [0, -0.4, -1.0]);
  zxvTrig(w, S);
  w.left.visible = !VM.lhand.visible;
};

// Flare Pistol ------------------------------------------------------------------------------------
function zxvShell(M) {
  const g = new THREE.Group();
  g.add(zcyl(0.019, 0.019, 0.1, M.accent, 14, 0.0));
  g.add(zcyl(0.022, 0.022, 0.012, M.brass, 14, 0.012));
  return g;
}
VM_BUILD.flaregun = (M) => {
  const root = new THREE.Group();
  // the frame and grip
  root.add(box(0.04, 0.05, 0.08, M.iron, 0, 0.03, 0.0));
  root.add(profile([[0.0, 0.01], [0.03, -0.06], [0.025, -0.11], [0.06, -0.12], [0.075, -0.06], [0.05, 0.02]], 0.036, M.wood, 0.004));
  const capB = zxvBall(0.016, M.iron); capB.scale.set(1.3, 0.6, 1.4); capB.position.set(0, -0.118, 0.045); root.add(capB);
  // the barrel, on its hinge at the front of the frame
  const brl = new THREE.Group(); brl.position.set(0, 0.02, -0.04); root.add(brl);
  brl.add(zcyl(0.026, 0.026, 0.19, M.brass, 18, 0.03, 0, 0.026));
  brl.add(zcyl(0.029, 0.029, 0.014, M.iron, 18, -0.15, 0, 0.026));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), M.bore); bore.position.set(0, 0.026, -0.161); brl.add(bore);
  brl.add(box(0.012, 0.012, 0.03, M.iron, 0, -0.002, 0.0));
  const shell = zxvShell(M); shell.position.set(0, 0.026, 0.02); shell.visible = false; brl.add(shell);
  // a spur hammer, the trigger, a guard
  const hammer = new THREE.Group(); hammer.position.set(0, 0.055, 0.035); root.add(hammer);
  const hn = box(0.01, 0.04, 0.012, M.dark, 0, 0.018, -0.008); hn.rotation.x = -0.4; hammer.add(hn); hammer.add(box(0.018, 0.008, 0.024, M.dark, 0, 0.036, 0.006));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 6, 18, Math.PI), M.iron); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.005, 0.005); root.add(guard);
  const trig = box(0.005, 0.022, 0.007, M.dark, 0, 0.0, 0.004); root.add(trig);
  const hand = vmHand(VM.H, false); hand.position.set(0.01, -0.045, 0.045); root.add(hand);
  const spent = zxvShell(M), fresh = zxvShell(M); spent.visible = fresh.visible = false; root.add(spent); root.add(fresh);
  spent.children[0].material = M.dark;
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.026, -0.17); brl.add(muzzle);
  return { root, M, hand, brl, shell, hammer, trig, spent, fresh, muzzle, pose: { x: 0.05, y: -0.14, z: -0.29, rx: 0.12, ry: 0.1, rz: -0.07 }, smoke: 5, flashK: 1.7 };
};
VM_ANIM.flaregun = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) w.down = 1;
  const open = vmSeg(p, 0.06, 0.2) - vmSeg(p, 0.7, 0.8), eject = S.reloading && p > 0.2 && p < 0.5 ? (p - 0.2) / 0.3 : -1, bring = vmSeg(p, 0.36, 0.56), push = vmSeg(p, 0.56, 0.66), cock = vmSeg(p, 0.82, 0.92);
  w.steps = w.steps || [[0.12, () => vmClick(560, 0.06)], [0.22, () => vmNoise(3200, 0.04, 0.12)], [0.65, () => vmClick(720, 0.05)], [0.78, () => vmClick(400, 0.09)], [0.9, () => { vmClick(950, 0.05); vmClick(520, 0.04); }]];
  vmPlace(w, S, 0, { x: -open * 0.02, y: open * 0.01, rx: -open * 0.2, ry: -open * 0.35, rz: open * 0.5 });
  w.brl.rotation.x = -open * 0.75;
  w.hammer.rotation.x = (S.reloading ? (p < 0.82 ? 1 : 1 - cock) : (w.down ? 1 : 0)) * 0.55;
  if (S.reloading && p > 0.92) w.down = 0;
  zxvTrig(w, S);
  // the spent case jumps out of the breech and over your shoulder
  w.spent.visible = eject >= 0 && eject < 1;
  if (w.spent.visible) { const f = eject; w.spent.position.set(0.02 + f * 0.12, 0.08 + f * 0.25 - f * f * 0.55, 0.0 + f * 0.25); w.spent.rotation.set(f * 6, f * 2, 0); }
  w.shell.visible = S.reloading && p >= 0.66 && p < 0.8;
  w.fresh.visible = S.reloading && bring > 0.01 && p < 0.66;
  if (w.fresh.visible) {
    w.root.updateMatrixWorld(true);
    const breech = zxvV(0, 0.02 + 0.026 * Math.cos(0.75) + 0.02, -0.04 + 0.08), home = zxvV(-0.2, -0.28, 0.05);
    w.fresh.position.copy(home).lerp(breech.clone().add(zxvV(0, 0.04, 0.06)), bring).lerp(breech, push); w.fresh.rotation.set(0.75 * bring, 0, (1 - bring) * 0.6);
    vmLeftAt(w, w.fresh.position.clone().add(zxvV(-0.012, -0.03, 0.04)), [0.4, 0, -0.5]);
  } else if (S.reloading && p > 0.66 && p < 0.8) vmLeftAt(w, zxvV(-0.02, 0.06 + (1 - open) * 0.02, -0.12), [0.6, 0, -0.6]);
};

// Boarding Axe ------------------------------------------------------------------------------------
VM_BUILD.axe = (M) => {
  const root = new THREE.Group(), axe = new THREE.Group(), held = new THREE.Group(); root.add(held); held.add(axe);
  // the haft along +y, the head at its top: the bearded blade forward (-z), a spike behind
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.62, 10), M.wood); haft.position.y = 0.2; axe.add(haft);
  for (const y of [-0.06, 0.48]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), M.brass); b.position.y = y; axe.add(b); }
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.035); s.lineTo(-0.06, 0.05); s.quadraticCurveTo(-0.12, 0.07, -0.135, 0.075); s.quadraticCurveTo(-0.15, 0.0, -0.13, -0.09); s.quadraticCurveTo(-0.09, -0.07, -0.055, -0.02); s.lineTo(0.0, -0.025); s.lineTo(0.0, 0.035);
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 10 }), M.blade);
  blade.rotation.y = Math.PI / 2; blade.position.set(0.004, 0.46, 0.0); axe.add(blade);
  axe.add(box(0.03, 0.07, 0.035, M.iron, 0, 0.465, 0.0));
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 4), M.dark); spike.rotation.x = Math.PI / 2; spike.position.set(0, 0.47, 0.05); axe.add(spike);
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.002, 4, 12), M.accent); t.rotation.x = Math.PI / 2; t.position.y = -0.03 + i * 0.018; axe.add(t); }
  const hand = vmHand(VM.H, false); hand.position.set(0.0, 0.0, 0.0); hand.rotation.set(-1.2, 0, 0); held.add(hand);
  const tip = new THREE.Object3D(); tip.position.set(0, 0.47, -0.14); axe.add(tip);
  const base = new THREE.Object3D(); base.position.set(0, 0.43, -0.06); axe.add(base);
  held.scale.setScalar(0.74);
  return { root, M, held, axe, hand, tip, base, pose: { x: 0.16, y: -0.26, z: -0.46, rx: -0.6, ry: 0.1, rz: -0.4 }, melee: true, trail: true };
};
VM_ANIM.axe = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) { w.swingT = 0; w.swingK = ((FPS.swing || 1) - 1) % 3; VM.trail = []; }
  const dur = FPSW.axe.rate; w.swingT = (w.swingT == null ? 9 : w.swingT) + S.dt;
  const k = Math.min(1, w.swingT / dur), wind = vmSeg(k, 0, 0.28), strike = vmSeg(k, 0.28, 0.55), back = vmSeg(k, 0.62, 1);
  const thrown = typeof ZX !== 'undefined' && ZX.axeOut;
  let e = {};
  if (k < 1 && !thrown) {
    if (w.swingK === 0) e = { x: 0.12 * wind - 0.42 * strike + 0.3 * back, y: 0.04 * wind - 0.04 * strike, rz: -0.9 * wind + 2.4 * strike - 1.5 * back, rx: 0.2 * wind - 0.7 * strike + 0.5 * back, ry: 0.6 * strike - 0.6 * back };
    else if (w.swingK === 1) e = { x: -0.3 * wind + 0.44 * strike - 0.14 * back, y: 0.03 * wind - 0.03 * strike, rz: 1.4 * wind - 2.6 * strike + 1.2 * back, rx: 0.15 * wind - 0.6 * strike + 0.45 * back, ry: -0.5 * strike + 0.5 * back };
    else e = { x: -0.06 * wind + 0.06 * back, y: 0.16 * wind - 0.2 * strike + 0.04 * back, z: 0.1 * wind - 0.12 * strike + 0.02 * back, rx: 1.0 * wind - 2.1 * strike + 1.1 * back, rz: 0.25 * wind - 0.25 * back };
  }
  const look = vmSeg(p, 0, 0.25) - vmSeg(p, 0.8, 1), thumb = p > 0.35 && p < 0.75 ? (p - 0.35) / 0.4 : -1;
  if (S.reloading) e = { x: -0.08 * look, y: 0.1 * look, z: 0.05 * look, rx: 0.6 * look, ry: -1.3 * look, rz: -0.2 * look };
  w.steps = w.steps || [[0.4, () => vmNoise(5000, 0.03, 0.3)], [0.2, () => vmNoise(7000, 0.02, 0.2)]];
  vmPlace(w, S, 0, e);
  // (the Homeward Axe out of your hand: an empty grip, reaching for it)
  w.axe.visible = !thrown;
  if (thumb >= 0) { w.root.updateMatrixWorld(true); vmLeftAt(w, zxvV(-0.03, 0.28 + thumb * 0.06, -0.05 - thumb * 0.06), [0, 0, -1.4]); }
  w.root.updateMatrixWorld(true);
  const a = w.tip.getWorldPosition(new THREE.Vector3()), b = w.base.getWorldPosition(new THREE.Vector3());
  if (k > 0.26 && k < 0.6 && !S.still && !thrown) VM.trail.push([a, b]); else if (VM.trail.length) VM.trail.shift();
  while (VM.trail.length > VM.trailN) VM.trail.shift();
  const pos = VM.trailMesh.geometry.attributes.position, al = VM.trailMesh.geometry.attributes.alpha, n = VM.trail.length;
  VM.trailMesh.visible = n > 1;
  for (let i = 0; i < VM.trailN; i++) {
    const tr = VM.trail[Math.min(n - 1, i)] || [a, b], f = n ? i / Math.max(1, n - 1) : 0;
    pos.setXYZ(i * 2, tr[0].x, tr[0].y, tr[0].z); pos.setXYZ(i * 2 + 1, tr[1].x, tr[1].y, tr[1].z);
    al.setX(i * 2, i < n ? f : 0); al.setX(i * 2 + 1, i < n ? f * 0.2 : 0);
  }
  pos.needsUpdate = true; al.needsUpdate = true;
};

// Punt Gun ------------------------------------------------------------------------------------
VM_BUILD.puntgun = (M) => {
  const root = new THREE.Group();
  root.add(zcyl(0.034, 0.028, 1.15, M.iron, 16, -0.02, 0, 0.05));
  for (const z of [-0.04, -0.3, -0.6, -0.9, -1.15]) root.add(zcyl(0.037, 0.037, 0.018, M.accent, 16, z, 0, 0.05));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.022, 14), M.bore); bore.position.set(0, 0.05, -1.171); root.add(bore);
  root.add(zcyl(0.04, 0.04, 0.06, M.iron, 16, 0.04, 0, 0.05));   // the breech
  root.add(profile([[-0.42, 0.04], [0.02, 0.04], [0.02, 0.0], [-0.4, 0.02]], 0.05, M.wood, 0.004));
  root.add(profile([[0.0, 0.075], [0.14, 0.055], [0.36, 0.08], [0.4, 0.085], [0.42, -0.09], [0.33, -0.08], [0.14, -0.02], [0.04, -0.01], [-0.02, 0.015]], 0.05, M.wood, 0.006));
  root.add(box(0.056, 0.175, 0.014, M.brass, 0, -0.003, 0.425));
  root.add(box(0.008, 0.034, 0.1, M.iron, 0.03, 0.05, 0.04));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 8), M.brass); cap.position.set(0.03, 0.085, 0.0); root.add(cap);
  const hammer = new THREE.Group(); hammer.position.set(0.03, 0.058, 0.06); root.add(hammer);
  const hn = box(0.01, 0.045, 0.012, M.dark, 0, 0.02, -0.016); hn.rotation.x = -0.55; hammer.add(hn); hammer.add(box(0.016, 0.014, 0.024, M.dark, 0, 0.036, -0.044));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0035, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.0, 0.08); root.add(guard);
  const trig = box(0.006, 0.026, 0.008, M.dark, 0, 0.0, 0.075); root.add(trig);
  const rod = new THREE.Group(); rod.position.set(0, 0.012, -0.06); root.add(rod);
  rod.add(zcyl(0.005, 0.005, 0.9, M.wood, 8, 0)); rod.add(zcyl(0.009, 0.009, 0.02, M.brass, 8, -0.9));
  const flask = new THREE.Group(); flask.visible = false; root.add(flask);
  const fb = zxvBall(0.045, new THREE.MeshPhongMaterial({ color: 0x6a4a2a, shininess: 30 })); fb.scale.set(1, 1.3, 0.55); flask.add(fb);
  { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), M.brass); sp.position.y = 0.075; flask.add(sp); }
  const bag = new THREE.Group(); bag.visible = false; root.add(bag);
  const bb = zxvBall(0.04, new THREE.MeshLambertMaterial({ color: 0xb8a882 })); bb.scale.set(1, 1.2, 1); bag.add(bb);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, 0.0, 0.11); hand.rotation.z = -0.2; root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.01, -0.01, -0.34); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.05, -1.18); root.add(muzzle);
  const panAt = new THREE.Object3D(); panAt.position.set(0.03, 0.085, 0.0); root.add(panAt);
  return { root, M, hand, left, hammer, cap, trig, rod, flask, bag, muzzle, panAt, pose: { x: 0.085, y: -0.19, z: -0.5, rx: 0.06, ry: 0.06, rz: -0.05 }, smoke: 10, flashK: 2.2 };
};
VM_ANIM.puntgun = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) { w.down = 1; w.jolt = 1; }
  w.jolt = Math.max(0, (w.jolt || 0) - S.dt * 2.5);
  const tip = vmSeg(p, 0, 0.1) - vmSeg(p, 0.88, 1);
  const pour = vmSeg(p, 0.1, 0.18) - vmSeg(p, 0.3, 0.34), shot = vmSeg(p, 0.33, 0.4) - vmSeg(p, 0.46, 0.5), rodOut = vmSeg(p, 0.48, 0.55) - vmSeg(p, 0.72, 0.78);
  const ram = p > 0.54 && p < 0.73 ? Math.abs(Math.sin((p - 0.54) / 0.19 * Math.PI * 3)) : 0;
  const capOn = vmSeg(p, 0.78, 0.84) - vmSeg(p, 0.84, 0.87), cock = vmSeg(p, 0.86, 0.92);
  w.steps = w.steps || [[0.14, () => vmNoise(3800, 0.05, 0.35)], [0.4, () => vmNoise(2200, 0.08, 0.3)], [0.58, () => vmNoise(500, 0.09, 0.12)], [0.64, () => vmNoise(500, 0.09, 0.12)], [0.7, () => vmNoise(500, 0.09, 0.12)], [0.84, () => vmClick(1100, 0.04)], [0.91, () => { vmClick(800, 0.06); vmClick(420, 0.06); }]];
  vmPlace(w, S, 0, { x: -tip * 0.05, y: -tip * 0.06 - w.jolt * 0.05, z: -tip * 0.1 + w.jolt * 0.12, rx: tip * 0.6 + w.jolt * 0.25, ry: -tip * 0.3, rz: tip * 0.35 });
  const down = S.reloading ? (p < 0.86 ? 1 : 1 - cock) : (w.down ? 1 : 0);
  if (S.reloading && p > 0.92) w.down = 0;
  w.hammer.rotation.x = 0.6 * down;
  w.cap.visible = !(w.down && (!S.reloading || p < 0.84));
  zxvTrig(w, S);
  const mouth = zxvV(-0.03, 0.14, -1.16);
  w.flask.visible = S.reloading && pour > 0.01;
  if (w.flask.visible) {
    w.flask.position.copy(zxvV(-0.25, -0.3, -0.1)).lerp(mouth, pour); w.flask.rotation.set(0, 0, -1.3 * pour);
    if (pour > 0.95 && Math.random() < 0.7) { w.root.updateMatrixWorld(true); vmPour(w.muzzle.getWorldPosition(new THREE.Vector3()), false, 3); }
    vmLeftAt(w, w.flask.position.clone().add(zxvV(0.02, -0.05, 0.02)), [0.2, 0, -0.4]);
  }
  w.bag.visible = S.reloading && shot > 0.01;
  if (w.bag.visible) {
    w.bag.position.copy(zxvV(-0.25, -0.3, -0.1)).lerp(mouth, shot); w.bag.rotation.set(0, 0, -1.6 * shot);
    if (shot > 0.95 && Math.random() < 0.7) { w.root.updateMatrixWorld(true); vmPour(w.muzzle.getWorldPosition(new THREE.Vector3()), true, 4); }
    vmLeftAt(w, w.bag.position.clone().add(zxvV(0.02, -0.04, 0.02)), [0.2, 0, -0.4]);
  }
  if (S.reloading && rodOut > 0.001) {
    const inBore = p > 0.53 && p < 0.74;
    if (inBore) w.rod.position.set(0, 0.05, -0.66 - (1 - ram) * 0.2); else w.rod.position.set(0, 0.012 + rodOut * 0.05, -0.06 - rodOut * 1.0);
    vmLeftAt(w, w.rod.position.clone().add(zxvV(-0.02, 0, inBore ? 0.02 : -0.85)), [0.2, 0, -0.5]);
  } else w.rod.position.set(0, 0.012, -0.06);
  if (S.reloading && capOn > 0.01) vmLeftAt(w, zxvV(-0.15, -0.25, 0.1).lerp(zxvV(0.05, 0.1, 0.02), capOn), [0, 0, -0.8]);
  w.left.visible = !VM.lhand.visible;
};

// Net Mortar ------------------------------------------------------------------------------------
function zxvNet(M) {
  const g = new THREE.Group();
  const bundle = zxvBall(0.042, M.accent); bundle.scale.set(1, 1, 1.25); g.add(bundle);
  const cord = new THREE.MeshLambertMaterial({ color: 0x6a5a40 });
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.0025, 4, 18), cord); r.rotation.y = i * Math.PI / 3; g.add(r); }
  const wts = [];
  for (let i = 0; i < 4; i++) { const b = zxvBall(0.011, M.dark); b.position.set(Math.cos(i * 1.57 + 0.78) * 0.05, Math.sin(i * 1.57 + 0.78) * 0.05, 0.02); g.add(b); wts.push(b); }
  g.userData.wts = wts;
  return g;
}
VM_BUILD.netmortar = (M) => {
  const root = new THREE.Group(), tube = new THREE.Group(); tube.position.set(0, 0.07, -0.05); tube.rotation.x = 0.12; root.add(tube);
  const prof = [[0.0, 0.035], [-0.04, 0.045], [-0.2, 0.05], [-0.23, 0.058], [-0.24, 0.058]];
  const lg = new THREE.LatheGeometry(prof.map(([z, r]) => new THREE.Vector2(r, -z)), 22); lg.rotateX(-Math.PI / 2);
  tube.add(new THREE.Mesh(lg, M.brass));
  for (const z of [-0.06, -0.15]) tube.add(zcyl(0.053, 0.053, 0.012, M.iron, 20, z));
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.048, 18), M.bore); bore.position.z = -0.215; tube.add(bore);
  const net = zxvNet(M); net.position.z = -0.215; tube.add(net);
  root.add(profile([[0.0, 0.06], [0.12, 0.045], [0.3, 0.065], [0.32, 0.07], [0.33, -0.06], [0.26, -0.05], [0.1, 0.0], [0.05, 0.0], [0.03, -0.09], [-0.005, -0.09], [-0.01, 0.03]], 0.05, M.wood, 0.005));
  root.add(box(0.03, 0.05, 0.1, M.iron, 0, 0.045, 0.0));
  // the charging lever on the left side, pumped on the reload
  const lever = new THREE.Group(); lever.position.set(-0.04, 0.05, 0.02); root.add(lever);
  lever.add(box(0.008, 0.01, 0.12, M.iron, 0, 0, -0.06)); { const k = zxvBall(0.012, M.wood); k.position.set(0, 0, -0.12); lever.add(k); }
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.0, 0.03); root.add(guard);
  const trig = box(0.006, 0.024, 0.008, M.dark, 0, 0.0, 0.025); root.add(trig);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.05, 0.02); root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.03, 0.0, -0.13); left.rotation.set(0.3, 0, 0.6); root.add(left);
  const fresh = zxvNet(M); fresh.visible = false; root.add(fresh);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.0, -0.24); tube.add(muzzle);
  return { root, M, hand, left, tube, net, lever, trig, fresh, muzzle, pose: { x: 0.07, y: -0.18, z: -0.4, rx: 0.06, ry: 0.08, rz: -0.05 }, smoke: 4, flashK: 0.9 };
};
VM_ANIM.netmortar = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) w.out = 0.0001;
  if (w.out) w.out = Math.min(1, w.out + S.dt * 6);
  const tip = vmSeg(p, 0, 0.12) - vmSeg(p, 0.86, 1), bring = vmSeg(p, 0.12, 0.34), push = vmSeg(p, 0.34, 0.44), wts = p > 0.44 && p < 0.62 ? (p - 0.44) / 0.18 : -1, pump = p > 0.64 && p < 0.84 ? (p - 0.64) / 0.2 : -1;
  w.steps = w.steps || [[0.42, () => vmNoise(900, 0.06, 0.15)], [0.48, () => vmClick(1300, 0.03)], [0.52, () => vmClick(1300, 0.03)], [0.56, () => vmClick(1300, 0.03)], [0.6, () => vmClick(1300, 0.03)], [0.7, () => vmNoise(400, 0.07, 0.15)], [0.8, () => vmNoise(400, 0.07, 0.15)]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: -tip * 0.03, z: -tip * 0.05, rx: tip * 0.6, ry: -tip * 0.25, rz: tip * 0.35 });
  if (S.reloading && p > 0.44) w.out = 0;
  const shown = S.reloading ? p >= 0.44 : (!w.out || w.out < 0.15);
  w.net.visible = shown;
  if (!S.reloading && w.out) w.net.position.z = -0.215 - w.out * 0.5; else w.net.position.z = -0.215;
  w.net.userData.wts.forEach((b, i) => { const on = !S.reloading || wts < 0 ? true : wts * 4 > i; b.position.z = on ? 0.02 : 0.07; });
  w.fresh.visible = S.reloading && bring > 0.01 && p < 0.44;
  if (w.fresh.visible) {
    w.root.updateMatrixWorld(true);
    const mouth = zxvV(0, 0.07 + 0.03, -0.32), home = zxvV(-0.22, -0.3, 0.0);
    w.fresh.position.copy(home).lerp(mouth, bring).lerp(zxvV(0, 0.095, -0.27), push); w.fresh.rotation.set(0.12, 0, (1 - bring) * 0.7);
    vmLeftAt(w, w.fresh.position.clone().add(zxvV(-0.01, -0.04, 0.03)), [0.3, 0, -0.4]);
  } else if (wts >= 0) vmLeftAt(w, zxvV(-0.02 + Math.sin(wts * 25) * 0.02, 0.1, -0.24), [0.6, 0, -0.5]);
  w.lever.rotation.x = pump >= 0 ? -Math.abs(Math.sin(pump * Math.PI * 2)) * 0.7 : 0;
  if (pump >= 0) { w.root.updateMatrixWorld(true); const a = w.lever.rotation.x; vmLeftAt(w, zxvV(-0.05, 0.05 - Math.sin(-a) * 0.12, 0.02 - Math.cos(a) * 0.12), [0.3, 0, -0.9]); }
  zxvTrig(w, S);
  w.left.visible = !VM.lhand.visible;
};

// Chain-Shot ------------------------------------------------------------------------------------
function zxvPair(M) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) { const b = zxvBall(0.019, M.dark); b.position.x = s * 0.03; g.add(b); }
  const curve = new THREE.CatmullRomCurve3([zxvV(-0.03, 0, 0), zxvV(-0.015, -0.035, 0.01), zxvV(0.0, -0.045, 0.012), zxvV(0.015, -0.035, 0.01), zxvV(0.03, 0, 0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0035, 5, false), M.accent));
  for (let i = 1; i < 8; i++) { const q = curve.getPoint(i / 8), l = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0016, 4, 8), M.iron); l.position.copy(q); l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); }
  return g;
}
VM_BUILD.chainshot = (M) => {
  const root = new THREE.Group();
  for (const s of [-1, 1]) {
    root.add(zcyl(0.026, 0.023, 0.32, M.brass, 18, 0.0, s * 0.03, 0.05));
    root.add(zcyl(0.028, 0.028, 0.02, M.brass, 18, -0.31, s * 0.03, 0.05));
    root.add(zcyl(0.029, 0.029, 0.03, M.iron, 18, 0.02, s * 0.03, 0.05));
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.019, 14), M.bore); bore.position.set(s * 0.03, 0.05, -0.332); root.add(bore);
  }
  root.add(box(0.03, 0.02, 0.28, M.brass, 0, 0.05, -0.16));
  root.add(box(0.012, 0.012, 0.03, M.dark, 0, 0.082, -0.3));   // the notch the chain lies in
  const pair = zxvPair(M); pair.position.set(0, 0.05, -0.33); root.add(pair);
  root.add(profile([[0.0, 0.06], [0.14, 0.05], [0.32, 0.07], [0.35, 0.075], [0.36, -0.07], [0.29, -0.06], [0.12, -0.0], [0.05, 0.0], [0.03, -0.09], [-0.005, -0.09], [-0.012, 0.025]], 0.06, M.wood, 0.005));
  root.add(box(0.064, 0.14, 0.012, M.brass, 0, 0.0, 0.36));
  const hammer = new THREE.Group(); hammer.position.set(0, 0.085, 0.05); root.add(hammer);
  const hn = box(0.012, 0.04, 0.012, M.dark, 0, 0.018, -0.012); hn.rotation.x = -0.5; hammer.add(hn); hammer.add(box(0.026, 0.01, 0.024, M.dark, 0, 0.034, -0.03));
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 6, 20, Math.PI), M.brass); guard.rotation.set(0, Math.PI / 2, Math.PI); guard.position.set(0, 0.0, 0.03); root.add(guard);
  const trig = box(0.006, 0.024, 0.008, M.dark, 0, 0.0, 0.025); root.add(trig);
  const hand = vmHand(VM.H, false); hand.position.set(0.0, -0.05, 0.02); root.add(hand);
  const left = vmHand(VM.H, true); left.position.set(-0.04, 0.0, -0.22); left.rotation.set(0.3, 0, 0.5); root.add(left);
  const fresh = zxvPair(M); fresh.visible = false; root.add(fresh);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.05, -0.34); root.add(muzzle);
  return { root, M, hand, left, pair, fresh, hammer, trig, muzzle, pose: { x: 0.065, y: -0.18, z: -0.42, rx: 0.08, ry: 0.08, rz: -0.05 }, smoke: 8, flashK: 1.5 };
};
VM_ANIM.chainshot = (w, S) => {
  const p = S.p;
  VM.lhand.visible = false;
  if (S.fired) { w.out = 0.0001; w.down = 1; }
  if (w.out) w.out = Math.min(1, w.out + S.dt * 7);
  const tip = vmSeg(p, 0, 0.12) - vmSeg(p, 0.86, 1), bring = vmSeg(p, 0.12, 0.36), dropL = vmSeg(p, 0.38, 0.48), dropR = vmSeg(p, 0.5, 0.6), lay = vmSeg(p, 0.62, 0.72), cock = vmSeg(p, 0.76, 0.86);
  w.steps = w.steps || [[0.47, () => vmNoise(700, 0.08, 0.12)], [0.59, () => vmNoise(700, 0.08, 0.12)], [0.7, () => vmNoise(5200, 0.04, 0.2)], [0.85, () => { vmClick(820, 0.06); vmClick(430, 0.06); }]];
  vmPlace(w, S, 0, { x: -tip * 0.03, y: -tip * 0.04, z: -tip * 0.07, rx: tip * 0.55, ry: -tip * 0.25, rz: tip * 0.35 });
  if (S.reloading && p > 0.38) w.out = 0;
  // the pair away, whirling open
  w.pair.visible = S.reloading ? p >= 0.6 : (!w.out || w.out < 1);
  w.pair.position.z = -0.33 - (w.out && !S.reloading ? w.out * 0.9 : 0); w.pair.rotation.y = w.out && !S.reloading ? w.out * 8 : 0;
  w.hammer.rotation.x = (S.reloading ? (p < 0.76 ? 1 : 1 - cock) : (w.down ? 1 : 0)) * 0.6;
  if (S.reloading && p > 0.86) w.down = 0;
  w.fresh.visible = S.reloading && bring > 0.01 && p < 0.6;
  if (w.fresh.visible) {
    const over = zxvV(0, 0.13, -0.33), home = zxvV(-0.22, -0.3, -0.05);
    w.fresh.position.copy(home).lerp(over, bring); w.fresh.position.y -= (dropL + dropR) * 0.04; w.fresh.rotation.set(0, 0, (1 - bring) * 0.8 + (dropL - dropR) * 0.3);
    vmLeftAt(w, w.fresh.position.clone().add(zxvV(0.0, -0.04, 0.03)), [0.3, 0, -0.4]);
  } else if (S.reloading && lay > 0.01 && lay < 0.99) vmLeftAt(w, zxvV(-0.01, 0.12, -0.3 + lay * 0.03), [0.5, 0, -0.5]);
  zxvTrig(w, S);
  w.left.visible = !VM.lhand.visible;
};
