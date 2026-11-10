// The Lighthouse: the crab rounds. Every so often (round 5, then every sixth: 11, 17, 23 ... always odd, so never a
// boss round, which are even) the drowned stay down, and a swarm of crabs pours in at the windows instead: small,
// quick, weak, and many, scuttling sideways in between the boards rather than tearing them off. They nip rather than
// swing. The last one of the swarm to die leaves a Powder Keg where it fell (every weapon you carry, full); no other
// salvage comes up in a crab round.
//
// A crab is one of ZM.z like the drowned (z.skit), so shots, blades, the chest's weapons, reforging and co-op all take
// it as they take them; what's its own is here: how many, how strong, its size, its way in, its model and its sounds.
const ZWC = {
  FROM: 5, EVERY: 6,      // the crab rounds: 5, 11, 17, ...
  MANY: 1.125,            // how many, against that round's drowned (a quarter fewer than the 1.5 it was)
  HP: 0.42,               // how strong, against that round's drowned
  SP: [3.2, 3.8],         // how quick (you sprint at 9.8): a quarter slower than the 4.3 to 5.1 it was
  ALIVE: 30,              // up at once, at most
  GAP: [0.16, 0.34],      // between one and the next, coming in
  BIG: 1.2,               // its size, against the dog-sized crab it was (a fifth bigger)
  RAD: 0.54, TALL: 0.84, HEADZ: 0.5,   // its body, for being hit (the shell's top and the eyes are its "head")
  PAD: 0.4,               // how near a wall its middle comes (the shell's half-width, so it doesn't sink into one)
  REACH: 1.25,            // its nip
  UP: 0.65,               // how far above its feet yours can be for a nip to reach (a step or so: not up a stair)
  NIP: 0.5,               // what a nip takes off you: half a knock
  CLIMB: 0.45,            // through the window, in that long
};
const zwIsRound = r => r >= ZWC.FROM && (r - ZWC.FROM) % ZWC.EVERY === 0;
const zwCount = r => Math.round(zmCount(r) * ZWC.MANY);

// what makes one a crab, here or on a joined screen
function zwDress(z) {
  Object.assign(z, { skit: true, kind: 'skit', n: 'a crab', rad: ZWC.RAD, tall: ZWC.TALL, headZ: ZWC.HEADZ, zpad: ZWC.PAD });
  return z;
}

// can its nip reach you, from a crab at x, y, its feet at jz? Near enough, your feet no more than a step above its
// own (or below), and nothing solid between the two of you down at its height: so not through a stair, from under
// it or beside it, nor through a wall or a rail
function zwCanNip(m, x, y, jz) {
  const dz = (m.jz || 0) - jz, d = Math.hypot(m.x - x, m.y - y);
  if (d >= ZWC.REACH || dz > ZWC.UP || dz < -ZWC.UP) return false;
  const n = Math.max(1, Math.ceil(d / 0.2));
  for (let i = 1; i < n; i++) { const k = i / n; if (zmBlockedAt(x + (m.x - x) * k, y + (m.y - y) * k, 0.05, Math.max(jz, (m.jz || 0) - 0.05) + 0.05)) return false; }
  return true;
}

// (from zmRounds, as a round begins: hosting or alone) true if it's a crab round, and the round is set up for it
function zwBegin() {
  ZM.swarm = zwIsRound(ZM.round);
  if (!ZM.swarm) return false;
  ZM.left = Math.round(zwCount(ZM.round) * (1 + 0.5 * (ZM.hum.length - 1)));
  zwAnnounce();
  return true;
}
// the banner and the sound, here and on joined screens
function zwAnnounce() {
  ZM.banner = { text: 'Round ' + ZM.round + ': the crabs are coming', t: 4.5, col: '#e07050' };
  if (typeof fpsFeed === 'function') fpsFeed('Crabs! A swarm of them, at every window. The last one leaves a Powder Keg.');
  zwSound('swarm');
}

// the window the next one comes in by: any open room's window on the ground (or a ladder up out of the harbour onto
// the jetty), among the nearest four to you
function zwPickWindow() {
  const list = [];
  for (const w of ZM.windows) {
    if (!zmOpen(w.zone) || w.hatch || (!w.sea && (w.z || 0) > 0)) continue;
    const d = zmNavDist(w.x - w.nx * 1.0, w.y - w.ny * 1.0, 0);
    list.push([w, d < 1e8 ? d : 9999]);
  }
  if (!list.length) return null;
  list.sort((a, b) => a[1] - b[1]);
  const pool = list.slice(0, Math.min(list.length, 4));
  return pool[(Math.random() * pool.length) | 0][0];
}
// (from zmSpawn, in a crab round) one more crab, out in front of a window
function zwSpawn() {
  const w = zwPickWindow(); if (!w) return false;
  const [sx, sy] = zmSpawnPoint(w), hp = zmHp(ZM.round) * ZWC.HP * (0.85 + Math.random() * 0.3), zn = ++ZM.zc;
  const z = zwDress({
    drowned: true, zm: true, zn, id: 'z' + zn.toString(36), x: sx, y: sy, jz: 0, fl: 0,
    hp, max: hp, sp: ZWC.SP[0] + Math.random() * (ZWC.SP[1] - ZWC.SP[0]),
    st: 'out', win: w, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.4, swing: -1, stuck: 0, h: 0, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    lane: (Math.random() - 0.5) * 1.4,
  });
  z.h = bearingOf(w.x - z.x, w.y - z.y);
  ZM.z.push(z); FPS.drowned = ZM.z;
  return true;
}
// the gap before the next one comes in
const zwGap = () => ZWC.GAP[0] + Math.random() * (ZWC.GAP[1] - ZWC.GAP[0]);

// (from zmZombies) a crab outside: straight at its window, no waiting its turn, and in through the boards
function zwOut(z, dt) {
  const w = z.win, ox = w.x + w.nx * 0.9 + (-w.ny) * z.lane * 0.5, oy = w.y + w.ny * 0.9 + w.nx * z.lane * 0.5;
  const dx = ox - z.x, dy = oy - z.y, d = Math.hypot(dx, dy);
  if (d > 0.12) {
    const s = Math.min(d, z.sp * dt), a = bearingOf(dx, dy) + Math.sin(z.t * 7 + z.seed) * 0.35 * clamp(d / 3, 0, 1);
    z.x += Math.sin(a) * s; z.y += Math.cos(a) * s; z.walk = true;
    z.h += angDiff(a, z.h) * Math.min(1, dt * 10);
  } else { z.st = 'climb'; z.t = 0; z.walk = false; z.jz0 = z.jz; }   // (a ladder: up it, src/zombies.js)
  z.jz = w.sea ? -0.6 : -zmSeaDepth(z.x, z.y); z.scaling = false;
}

// (from zmKill) one gone: the last of the swarm leaves a Powder Keg behind
function zwKilled(d) {
  if (!ZM.swarm || ZM.net === 'client') return;
  if (ZM.left > 0 || ZM.z.some(q => q !== d && !q.dead && q.skit)) return;
  ZM.drops.push({ k: 'keg', x: d.x, y: d.y, z: d.jz || 0, t: 30, ph: Math.random() * 6, id: ++ZM.zc });
  zmSound('drop');
  if (typeof fpsFeed === 'function') fpsFeed('The last crab: a Powder Keg!');
}

// ---------- sounds ----------
// the recordings where there are some (skitter, crunch, swarm: src/sfxbank.js), or made up here: a scuttle is a run
// of tiny hard clicks, a crunch a crack and a wet thump
function zwSound(k, d, pan) {
  if (typeof soundOff === 'function' && soundOff()) return;
  const v = d == null ? 1 : Math.max(0.05, 1 - d / 30), o = { pan: clamp(pan || 0, -1, 1) };
  if (typeof sfxPlay === 'function' && sfxPlay(k, { vol: (k === 'skitter' ? 0.45 : k === 'crunch' ? 0.7 : 0.9) * v, pan: o.pan, vary: 0.15, gap: k === 'skitter' ? 0.25 : 0.03 })) return;
  if (k === 'skitter') { const n = 6 + ((Math.random() * 6) | 0); for (let i = 0; i < n; i++) noise('highpass', 2500 + Math.random() * 2500, 2, 0.001, (0.05 + Math.random() * 0.05) * v, 0.025, Object.assign({ delay: i * (0.025 + Math.random() * 0.03) }, o)); }
  else if (k === 'crunch') { noise('bandpass', 1800, 1.5, 0.001, 0.25 * v, 0.07, o); noise('lowpass', 500, 1, 0.003, 0.25 * v, 0.14, Object.assign({ delay: 0.02 }, o)); tone(130, 'sine', 0.002, 0.18 * v, 0.12, Object.assign({ to: 70 }, o)); }
  else if (k === 'swarm') { tone(62, 'sawtooth', 0.3, 0.12, 2.6, { to: 46 }); tone(93, 'triangle', 0.4, 0.08, 2.4, { to: 70 }); for (let i = 0; i < 40; i++) noise('highpass', 3000 + Math.random() * 2000, 2, 0.001, 0.02 + i * 0.0015, 0.02, { delay: 0.6 + i * 0.05 + Math.random() * 0.03, pan: Math.random() * 2 - 1 }); }
}
// (each frame) the nearest few scuttling, now and then
function zwTick(dt) {
  if (!ZM.z.some(z => z.skit && !z.dead)) return;
  ZM.skitT = (ZM.skitT || 0) - dt;
  if (ZM.skitT > 0) return;
  ZM.skitT = 0.25 + Math.random() * 0.35;
  const m = FPS.me; let best = null, bd = 25;
  for (const z of ZM.z) { if (!z.skit || z.dead || !z.walk) continue; const d = Math.hypot(z.x - m.x, z.y - m.y) * (0.7 + Math.random() * 0.6); if (d < bd) { bd = d; best = z; } }
  if (best) zwSound('skitter', Math.hypot(best.x - m.x, best.y - m.y), angDiff(bearingOf(best.x - m.x, best.y - m.y), m.h));
}

// ---------- the model ----------
// a shore crab the size of a dog: a broad low shell, barnacled, eight legs and two great claws, its eyes up on stalks
// with the drowned's green light in them. It goes sideways, as crabs do.
const ZW3 = { pool: [], geo: null };
function zwGeo() {
  if (ZW3.geo) return ZW3.geo;
  const G = {};
  G.shell = new THREE.SphereGeometry(0.34, 14, 8); G.shell.scale(1.25, 0.45, 0.95);
  G.belly = new THREE.SphereGeometry(0.3, 10, 6); G.belly.scale(1.15, 0.3, 0.85);
  G.leg = new THREE.CylinderGeometry(0.025, 0.018, 0.3, 5); G.leg.translate(0, -0.15, 0);
  G.arm = new THREE.CylinderGeometry(0.04, 0.035, 0.22, 6); G.arm.translate(0, -0.11, 0);
  G.claw = new THREE.SphereGeometry(0.1, 8, 6); G.claw.scale(1.5, 0.75, 0.9);
  G.pin = new THREE.BoxGeometry(0.14, 0.03, 0.04); G.pin.translate(0.07, 0, 0);
  G.stalk = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 4); G.stalk.translate(0, 0.045, 0);
  G.eye = new THREE.SphereGeometry(0.026, 6, 5);
  G.barn = new THREE.ConeGeometry(0.03, 0.04, 5);
  G.eyeM = new THREE.MeshBasicMaterial({ color: 0xc8ffd8 }); G.barnM = z3Lam('#b8b0a0');
  return ZW3.geo = G;
}
const ZW_SHELLS = ['#7a3020', '#6a2a1e', '#5a3a28', '#7a4024', '#4a3a30'];
function zwModel(z) {
  let M = ZW3.pool.find(p => !p.used);
  if (!M) {
    const G = zwGeo(), root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.22;
    const shell = z3Lam('#7a3020'), leg = z3Lam('#5a2418');
    body.add(new THREE.Mesh(G.shell, shell));
    const b = new THREE.Mesh(G.belly, z3Lam('#b09070')); b.position.y = -0.06; body.add(b);
    for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(G.barn, G.barnM); const a = i * 1.7 + 0.4; c.position.set(Math.cos(a) * 0.2, 0.13, Math.sin(a) * 0.14); body.add(c); }
    // (its sides are local ±x, its front -z: it walks along x)
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const p = new THREE.Group(); p.position.set(s * 0.32, 0.0, -0.15 + i * 0.11); p.rotation.z = s * 1.35; p.rotation.y = (i - 1.5) * 0.25 * s;
      const l = new THREE.Mesh(G.leg, leg); p.add(l);
      const k = new THREE.Group(); k.position.y = -0.28; k.rotation.z = -s * 1.25; k.add(new THREE.Mesh(G.leg, leg)); p.add(k);
      body.add(p); legs.push({ p, s, i });
    }
    const claws = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(s * 0.24, 0.04, -0.28); p.rotation.x = 1.3; p.rotation.z = -s * 0.35; p.scale.setScalar(1.35);
      p.add(new THREE.Mesh(G.arm, leg));
      const c = new THREE.Group(); c.position.y = -0.24; p.add(c);
      c.add(new THREE.Mesh(G.claw, shell));
      const pin = new THREE.Mesh(G.pin, leg); pin.position.set(0.05 * s, -0.05, 0); pin.rotation.y = s > 0 ? 0 : Math.PI; c.add(pin);
      body.add(p); return { p, c, pin, s };
    });
    for (const s of [-1, 1]) { const st = new THREE.Mesh(G.stalk, leg); st.position.set(s * 0.07, 0.12, -0.24); body.add(st); const e = new THREE.Mesh(G.eye, G.eyeM); e.position.set(s * 0.07, 0.22, -0.24); body.add(e); }
    M = { root, body, legs, claws, shell, leg, used: false, crab: true };
    ZW3.pool.push(M); Z3.grp.add(root);
  }
  M.used = true; M.root.visible = true;
  const rnd = seeded(z.seed);
  M.shell.color.set(ZW_SHELLS[(rnd() * ZW_SHELLS.length) | 0]).multiplyScalar(0.7); M.shell.emissive.set(0);
  M.leg.emissive.set(0);
  M.root.scale.setScalar((0.85 + rnd() * 0.3) * ZWC.BIG);
  M.root.rotation.set(0, 0, 0); M.body.rotation.set(0, 0, 0);
  z.mdl = M;
  return M;
}
function zwPose(z, M, dt) {
  const t = g.t;
  M.root.position.copy(z3v(z.x, z.y, FPSC.GROUND + (z.jz || 0)));
  // (sideways: its side to the way it's going, the claws still turned a little toward you)
  M.root.rotation.y = -z.h + Math.PI / 2 * (z.seed % 2 ? 1 : -1);
  if (z.walk || z.st === 'out' || z.st === 'climb') z.ph += dt * z.sp * 7;
  const A = z.walk || z.st === 'climb' ? 1 : 0.15, ph = z.ph;
  for (const L of M.legs) L.p.rotation.x = Math.sin(ph + L.i * 1.6 + (L.s > 0 ? Math.PI : 0)) * 0.45 * A;
  M.body.position.y = 0.22 + Math.abs(Math.sin(ph)) * 0.025 * A + (z.st === 'climb' ? Math.sin(Math.min(1, z.t / ZWC.CLIMB) * Math.PI) * 0.15 : 0);
  M.body.rotation.z = Math.sin(ph * 0.5) * 0.06 * A;
  // the claws: held up and snapping; a nip at you, both together
  const snap = z.swing >= 0 ? Math.sin(z.swing / 0.6 * Math.PI) : 0;
  for (const C of M.claws) {
    C.p.rotation.x = 1.3 + snap * 0.6 + Math.sin(t * 3 + z.seed + C.s) * 0.12;
    C.pin.rotation.z = (Math.sin(t * (z.swing >= 0 ? 30 : 4) + C.s) * 0.5 + 0.5) * 0.5 * -C.s;
  }
  const flash = z.hitT > 0 ? z.hitT / 0.15 : 0, hot = z.burn ? 0.6 + 0.4 * Math.sin(t * 17 + z.seed) : (z.scorch || 0) * 0.7;
  M.shell.emissive.setRGB(0.25 * flash + hot * 0.55, 0.22 * flash + hot * 0.22, 0.2 * flash + hot * 0.04);
  M.leg.emissive.setRGB(0.15 * flash + hot * 0.4, 0.12 * flash + hot * 0.12, 0.1 * flash);
  if (z.burn && !z.charred) { z.charred = true; M.shell.color.multiplyScalar(0.35); M.leg.color.multiplyScalar(0.35); }
  if (z.scorch > 0 && !z.burn) z.scorch = Math.max(0, z.scorch - dt * 0.8);
  if (z.dead) {
    // over on its back, legs curling, then down into the floor
    const k = Math.min(1, z.deadT / 0.35);
    M.body.rotation.z = k * Math.PI * (z.seed % 2 ? 1 : -1); M.body.position.y = 0.22 + Math.sin(k * Math.PI) * 0.25 - k * 0.06;
    for (const L of M.legs) L.p.rotation.x = Math.sin(t * 20 + L.i) * 0.3 * (1 - Math.min(1, z.deadT));
    M.root.position.y -= Math.max(0, z.deadT - 1.2) * 0.5;
    if (z.burn) { const s = Math.max(0.01, 1 - z.deadT / 1.2); M.root.scale.setScalar(s); }
  }
}
