// Wrackhaven: what the village never told, and what it pays in. The second map's own secret (the Lighthouse keeps
// its own in src/zmegg.js), for whoever goes looking: nothing on screen or in the README says how it goes. The cues
// are in the world: a glint, a line in the feed in someone else's voice, a word over Use in just the right place.
// It pays a pirate token, as the Lighthouse's does (ptGrant, in src/zmegg.js), one for each night it's done; its
// coin is Bethan's Shilling.
//
// ---------------------------------------------------------------------------------------------------------------
// THE SOLUTION (spoilers; kept to this comment on purpose). "The Fleet Comes Home": the winter of 1891, the night
// the sea took the village. Seven boats were out; Bethan Sowe lit the leading lamps and waited for her Tom. In order:
//   1. The Chandlery: a glint on the counter. Use it: a tide table, "Seven boats still out. Light the leading lamps."
//   2. The Quay: two dark lamps on posts at the quay's two seaward corners (glinting now). Use each to light it, red
//      to port (west), green to starboard (east). The wind blows them out during a round: only in the quiet between.
//   3. The Smokehouse: one herring on the racks glints silver. Shoot it down.
//   4. Use it where it fell: a tin herring with a key in it. Whoever takes it carries the key.
//   5. The Seamen's Chapel: the old bell on its frame, its clapper chained and padlocked. Use it with the key.
//   6. Strike the bell (shoot it, or knife or cutlass it) exactly seven times, then let it fall quiet. Any other
//      count is a flat clank, and you can try again.
//   7. Seven lights rise out on the harbour. Kill seven of the drowned within nine metres of the well in Fish Street:
//      each one's light goes down the well.
//   8. Use the well: Bethan's ring comes up in the bucket. Whoever draws it carries it.
//   9. The Boatyard: Use it at the bow of the boat on the stocks (her Tom's, never finished). The seven lights come
//      in to the quay, the fleet is home, and Bethan's Shilling drops: a pirate token.
// If whoever carries the key or the ring bleeds out or leaves, it goes back (the tin herring to the smokehouse
// floor, the ring to the well).
// Together (src/zmnet.js): the host keeps it, as it keeps the rest of the night (`eg2` in its presence); anyone can
// do a step (a client asks with the 'egg2' request); kills by anyone count; everyone in the night gets a token.
// ---------------------------------------------------------------------------------------------------------------
//
// Hooks (each marked "[egg2 hook]"): zombies.js zmReset, zmTick, zmKill, zmResolveShot, zmMelee, zmNearest,
// zmPrompt, zmUse, zm3dBuild, zmScene3D, zmHud; zmnet.js the request, the host's send and the client's apply.

const ZH_N = 7, ZH_R = 9;
const ZH = { st: 0, carrier: null, lit: 0, souls: 0, rings: 0, fails: 0, peal: 0, pealT: 0, lastRing: -9, myRing: -9, later: [], P: null, cele: 0, granted: false, t: 0, said: {}, home: 0 };

// where everything is (relative to the island's middle, as the map's own layout in src/zombies.js FPI_GEN.wrack)
function zhPlaces() {
  const OX = FPSC.CX, OY = FPSC.CY, DT = ZM_MAPS.wrack.top, A = (x, y, z, ux, uy, uz) => ({ x: OX + x, y: OY + y, z, ux: OX + (ux == null ? x : ux), uy: OY + (uy == null ? y : uy), uz: uz == null ? 0 : uz });
  return {
    table: A(-12.6, -30.9, 0.87, -12.6, -29.85),
    lampW: A(-19.4, -51.35, DT + 1.75, -18.7, -50.7, DT), lampE: A(19.4, -51.35, DT + 1.75, 18.7, -50.7, DT),
    fish: A(19.5, -14.5, 2.75), floor: A(19.5, -14.5, 0.06),
    bell: A(-7.4, 17.2, 1.55, -7.4, 15.85),
    well: A(0, 3.5, 0.95, 0, 2.3), boat: A(16, 12.75, 1.15, 16, 13.6),
  };
}
function zhReset() {
  Object.assign(ZH, { st: 0, carrier: null, lit: 0, souls: 0, rings: 0, fails: 0, peal: 0, pealT: 0, lastRing: -9, myRing: -9, later: [], cele: 0, granted: false, t: 0, said: {}, home: 0 });
  ZH.P = ZM_MAP === 'wrack' && FPS.g && FPS.g.isle && FPS.g.isle.zm ? zhPlaces() : null;
}
const zhMine = () => ZH.carrier && ZH.carrier === FPS.me.id;
function zhCarrierBody() { if (!ZH.carrier) return null; if (ZH.carrier === FPS.me.id) return FPS.me; return FPS.remote.get(ZH.carrier) || null; }
const zhSay = (t, s) => zeSay(t, s);
function zhWhisper(text, delay) { ZH.later.push({ t: delay || 0, f: () => { zeSay(text, 8); zeSound('whisper'); } }); }
function zhLater(delay, f) { ZH.later.push({ t: delay, f }); }

// what happens when it moves on (on everyone's own screen)
function zhEnter(st, prev) {
  const P = ZH.P;
  if (st < prev) {
    if (st === 3) zhSay('Somewhere a tin fish clatters back onto a stone floor.');
    else if (st === 7) zhSay('Far down the well, something drops back into the water.');
    return;
  }
  if (st === 1) {
    zhSay('A tide table, the ninth of December ringed in pencil:', 10);
    zhSay('“High water at midnight. Seven boats still out. Light the leading lamps. B.S.”', 12);
    zhWhisper('“…port and starboard, or they’ll miss the gap…”', 5);
  } else if (st === 2) {
    zhSay('Red and green burn over the harbour mouth. Out in the dark, nothing answers.', 10);
    zhWhisper('“I hung the key with the fish, where Tom would find it.”', 3.5);
  } else if (st === 3) {
    zhSay('Something silver drops from the racks with a clink.'); zeSound('thunk', P && P.floor.x, P && P.floor.y);
  } else if (st === 4) {
    zhSay('A herring cast in tin, hollow. Inside it, a heavy iron key.');
    zhWhisper('“Ring them home. One for each.”', 3.5);
  } else if (st === 5) {
    zhSay('The chain falls away. The old bell hangs free.'); zeSound('clank', P && P.bell.x, P && P.bell.y, 0.6);
  } else if (st === 6) {
    zhSay('Seven bells. Out past the quay, seven small lights come up out of the water.', 10);
    zhWhisper('“They’re home, and they can’t come in. Bring them to the well.”', 3.5);
  } else if (st === 7) {
    zhSay(`${ZH_N} lights have gone down the well. The water at the bottom glows.`, 10); zeSound('soul');
  } else if (st === 8) {
    zhSay('The bucket comes up with a ring in it, on a twist of net twine. Scratched inside: B. & T.');
    zhWhisper('“His boat. He never finished her.”', 3.5);
  } else if (st === 9) zhFinish();
}
function zhFinish() {
  ZH.cele = 8; ZH.home = 0.01;
  FPS.flash = 0.6;
  ZM.banner = { text: 'The fleet is home', t: 3.5, col: '#d8ffe8' };
  zeSound('eight');
  zhSay('You hang her ring on the stem. Down at the quay, seven lights come in.', 10);
  zhLater(2.4, () => { zhSay('The street goes quiet. On the boat’s thwart lies a silver coin.', 12); zeSound('coin'); });
  if (!ZH.granted) { ZH.granted = true; zhLater(2.4, () => { if (typeof ptGrant === 'function') ptGrant(); }); }
}

// ---------- doing it ----------
function zhDo(a) { if (ZM.net === 'client') { if (typeof zmnRequest === 'function') zmnRequest('egg2', a); } else zhAct(FPS.me.id, a); }
function zhSet(st) { const prev = ZH.st; if (st === prev) return; ZH.st = st; zhEnter(st, prev); }
function zhAct(sid, a) {
  const st = ZH.st;
  if (a === 'table') { if (st === 0) zhSet(1); }
  else if (a === 'lampW' || a === 'lampE') {
    if (st !== 1 || ZM.phase !== 'break') return;
    const bit = a === 'lampW' ? 1 : 2; if (ZH.lit & bit) return;
    ZH.lit |= bit; zhLit(bit);
    if (ZH.lit === 3) zhSet(2);
  }
  else if (a === 'fish') { if (st === 2) zhSet(3); }
  else if (a === 'take') { if (st === 3) { ZH.carrier = sid; zhSet(4); } }
  else if (a === 'unlock') { if (st === 4 && ZH.carrier === sid) { ZH.carrier = null; zhSet(5); } }
  else if (a === 'ring') zhRing(sid);
  else if (a === 'well') { if (st === 7) { ZH.carrier = sid; zhSet(8); } }
  else if (a === 'boat') { if (st === 8 && ZH.carrier === sid) { ZH.carrier = null; zhSet(9); } }
}
function zhLit(bit) { const P = ZH.P, L = bit === 1 ? P.lampW : P.lampE; zhSay(bit === 1 ? 'The lamp on the west corner takes: red, to port.' : 'The lamp on the east corner takes: green, to starboard.', 7); zeSound('light', L.x, L.y); }
function zhRing(sid) {
  if (ZH.st < 5) return;
  if (ZH.t - ZH.lastRing < 0.3) return;
  ZH.lastRing = ZH.t; ZH.rings++;
  if (sid !== FPS.me.id || ZH.t - ZH.myRing > 0.5) zeSound('bell', ZH.P.bell.x, ZH.P.bell.y);
  if (ZH.st === 5) { ZH.peal++; ZH.pealT = 2.6; }
}
function zhRequest(sid, a) { if (ZH.P && typeof a === 'string') zhAct(sid, a.slice(0, 8)); }

// ---------- each frame ----------
function zhTick(dt) {
  if (!ZH.P) return;
  ZH.t += dt;
  for (const l of ZH.later) l.t -= dt;
  const due = ZH.later.filter(l => l.t <= 0); ZH.later = ZH.later.filter(l => l.t > 0);
  for (const l of due) try { l.f(); } catch (e) {}
  if (ZH.cele > 0) ZH.cele -= dt;
  if (ZH.home > 0) ZH.home = Math.min(1, ZH.home + dt / 6);
  if (ZM.net === 'client') return;
  if (ZH.peal > 0) {
    ZH.pealT -= dt;
    if (ZH.pealT <= 0) { if (ZH.peal === ZH_N && ZH.st === 5) zhSet(6); else { ZH.fails++; zhFail(); } ZH.peal = 0; }
  }
  if (ZH.carrier) {
    let gone = false;
    if (ZH.carrier === FPS.me.id) gone = !!ZM.ghost || !!ZM.over;
    else { const r = FPS.remote.get(ZH.carrier); gone = !r || r.left || (r.dead && !r.down); }
    if (gone) { ZH.carrier = null; if (ZH.st === 4) zhSet(3); else if (ZH.st === 8) zhSet(7); }
  }
}
function zhFail() { zeSound('clank', ZH.P.bell.x, ZH.P.bell.y); if (!ZH.said.fail) { ZH.said.fail = true; zhWhisper('“No… seven. Seven went out.”', 0.6); } }
// a kill near the well, once the lights are up: one more of them goes home
function zhKill(d) {
  if (!ZH.P || ZM.net === 'client' || ZH.st !== 6) return;
  const W = ZH.P.well;
  if (Math.hypot(d.x - W.x, d.y - W.y) > ZH_R) return;
  ZH.souls++; zhWisp(d.x, d.y, d.jz || 0); zeSound('soul', W.x, W.y);
  if (ZH.souls >= ZH_N) zhSet(7);
}
function zhWisp(x, y, jz) {
  const W = ZH.P.well, G0 = FPSC.GROUND, z0 = G0 + jz + 1.2, z1 = G0 + 0.4;
  for (let i = 0; i < 7; i++) { const T = 0.9 + i * 0.05; FPS.parts.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, z: z0, vx: (W.x - x) / T, vy: (W.y - y) / T, vz: (z1 - z0) / T, t: T, c: i % 2 ? '150,255,210' : '210,255,240', up: true }); }
}

// ---------- what's in front of you ----------
function zhNearest(consider) {
  const P = ZH.P; if (!P) return;
  const st = ZH.st, mine = zhMine();
  consider({ k: 'egg2', a: 'table' }, P.table.ux, P.table.uy, 0, 1.25, true);
  if (st === 1) { if (!(ZH.lit & 1)) consider({ k: 'egg2', a: 'lampW' }, P.lampW.ux, P.lampW.uy, P.lampW.uz, 1.4, false); if (!(ZH.lit & 2)) consider({ k: 'egg2', a: 'lampE' }, P.lampE.ux, P.lampE.uy, P.lampE.uz, 1.4, false); }
  if (st === 3) consider({ k: 'egg2', a: 'take' }, P.floor.ux, P.floor.uy, 0, 1.3, false);
  if (st < 6) consider({ k: 'egg2', a: 'bell' }, P.bell.ux, P.bell.uy, 0, 1.5, true);
  if (st === 7) consider({ k: 'egg2', a: 'well' }, P.well.ux, P.well.uy, 0, 1.6, true);
  if (st === 8 && mine) consider({ k: 'egg2', a: 'boat' }, P.boat.ux, P.boat.uy, 0, 1.6, false);
}
function zhPrompt(o) {
  const st = ZH.st, mine = zhMine();
  if (o.a === 'table') return { text: st === 0 ? 'A paper lies on the counter' : 'The tide table', free: true };
  if (o.a === 'lampW' || o.a === 'lampE') return { text: 'A lamp on a post, dark', free: true };
  if (o.a === 'take') return { text: 'Something tin on the floor', free: true };
  if (o.a === 'bell') return st === 4 && mine ? { text: 'Unlock the chain', free: true } : st === 5 ? { text: 'The old bell' } : { text: 'The old bell, its clapper chained and padlocked' };
  if (o.a === 'well') return { text: 'Draw up the bucket', free: true };
  if (o.a === 'boat') return { text: 'Her Tom’s boat, on the stocks', free: true };
  return null;
}
function zhUse(o) {
  const st = ZH.st, mine = zhMine();
  if (o.a === 'table') { if (st === 0) zhDo('table'); else { zhSay('“High water at midnight. Seven boats still out. Light the leading lamps. B.S.”', 9); zeSound('page'); } return; }
  if (o.a === 'lampW' || o.a === 'lampE') {
    if (ZM.phase !== 'break') { zeSound('fizzle'); zhSay('The wind puts it out. Not while the sea’s this loud.', 5); return; }
    zhDo(o.a); return;
  }
  if (o.a === 'take') { zeSound('take'); zhDo('take'); return; }
  if (o.a === 'bell') { if (st === 4 && mine) zhDo('unlock'); else if (st < 5) zeSound('thunk', ZH.P.bell.x, ZH.P.bell.y); return; }
  if (o.a === 'well') { zeSound('take'); zhDo('well'); return; }
  if (o.a === 'boat') { if (st === 8 && mine) zhDo('boat'); }
}

// ---------- striking things ----------
// a shot (one of its lines): the silver herring, then the bell
function zhShot(x, y, z, h, p, by) {
  const P = ZH.P; if (!P) return;
  const hitAt = (q, R, RZ) => {
    const qz = FPSC.GROUND + q.z, sx = Math.sin(h), sy = Math.cos(h), ox = q.x - x, oy = q.y - y, along = ox * sx + oy * sy; if (along < 0 || along > 60) return false;
    const side2 = ox * ox + oy * oy - along * along; if (side2 > R * R) return false;
    const t = along - Math.sqrt(R * R - side2), zt = z + Math.tan(p) * t; if (Math.abs(zt - qz) > RZ) return false;
    const wall = fpsRay(x, y, z, h, p, by, [], t + 1); return !(wall.t < t - 0.08);
  };
  if (ZH.st === 2 && hitAt(P.fish, 0.3, 0.35)) zhDo('fish');
  if (hitAt(P.bell, 0.4, 0.45)) zhStrike();
}
function zhMelee(x, y, z, h, w) {
  const P = ZH.P; if (!P) return;
  const reach = (w.reach || 2) + 0.6, q = P.bell, d = Math.hypot(q.x - x, q.y - y);
  if (d < reach && (d < 0.5 || Math.abs(angDiff(bearingOf(q.x - x, q.y - y), h)) < (w.arc || 0.9) + 0.15) && Math.abs(FPSC.GROUND + q.z - z) < 1.3) zhStrike();
}
function zhStrike() {
  if (ZH.t - ZH.myRing < 0.3) return;
  ZH.myRing = ZH.t;
  if (ZH.st < 5) { zeSound('thunk', ZH.P.bell.x, ZH.P.bell.y); return; }
  zeSound('bell', ZH.P.bell.x, ZH.P.bell.y);
  zhDo('ring');
}

// ---------- together: the host's word ----------
function zhHostSend(z) { if (ZH.P) z.eg2 = [ZH.st, ZH.carrier || '', ZH.souls, ZH.rings, ZH.fails, ZH.lit]; }
function zhApply(hz) {
  const e = hz && hz.eg2;
  if (!Array.isArray(e) || !ZH.P) return;
  const st = Math.max(0, Math.min(9, e[0] | 0)), carrier = typeof e[1] === 'string' && e[1] ? e[1].slice(0, 40) : null;
  const souls = Math.max(0, Math.min(99, e[2] | 0)), rings = Math.max(0, e[3] | 0), fails = Math.max(0, e[4] | 0), lit = (e[5] | 0) & 3;
  ZH.carrier = carrier;
  if (rings > ZH.rings && ZH.t - ZH.myRing > 0.6) zeSound('bell', ZH.P.bell.x, ZH.P.bell.y);
  ZH.rings = rings;
  if (fails > ZH.fails) { ZH.fails = fails; zhFail(); }
  for (const bit of [1, 2]) if ((lit & bit) && !(ZH.lit & bit)) zhLit(bit);
  ZH.lit = lit;
  if (st === 6 && souls > ZH.souls) { const W = ZH.P.well; for (let i = ZH.souls; i < souls; i++) zhWisp(W.x + (Math.random() - 0.5) * 8, W.y + (Math.random() - 0.5) * 8, 0); zeSound('soul', W.x, W.y); }
  ZH.souls = souls;
  if (st !== ZH.st) { const prev = ZH.st; ZH.st = st; zhEnter(st, prev); }
}

// ---------- in 3D ----------
const Z3H = {};
function zh3dBuild(grp) {
  Z3H.ok = false; if (!ZH.P || typeof THREE === 'undefined') return;
  const P = ZH.P, G0 = FPSC.GROUND, soft = z3Soft('rgba(255,250,225,1)', 'rgba(255,250,225,0)');
  const sprite = (c, sc, par) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: new THREE.Color(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(sc || 1); (par || grp).add(s); return s; };
  const glint = c => { const s = sprite(c || '#fff4d0'), h = sprite(c || '#fff4d0'); s.visible = h.visible = false; return { s, h }; };
  Z3H.gl = { table: glint(), lampW: glint('#ffd8c8'), lampE: glint('#d8ffe0'), fish: glint('#e8f4ff'), floor: glint('#e8f4ff'), bell: glint('#ffe8b0'), well: glint('#c8fff0'), boat: glint('#d8ffe8') };
  Z3H.glL = new THREE.PointLight(0xfff0d0, 0, 2.6, 2); grp.add(Z3H.glL);
  const iron = z3Lam('#2a2c30'), tin = new THREE.MeshPhongMaterial({ color: 0xb8c4cc, specular: 0xffffff, shininess: 90, emissive: 0x181c20 }), paper = z3Lam('#e8dcb8', { emissive: 0x201c10 }), brass = new THREE.MeshPhongMaterial({ color: 0x9a7a34, specular: 0xd0b060, shininess: 60 });
  const K = zeKit();
  // the tide table on the counter, a pencil across it
  { const g = new THREE.Group(); g.position.copy(z3v(P.table.x, P.table.y, G0 + P.table.z - 0.05)); grp.add(g);
    K.add(paper, new THREE.BoxGeometry(0.3, 0.004, 0.4), 0, 0.002, 0, 0, 0.2, 0); K.add(paper, new THREE.BoxGeometry(0.28, 0.004, 0.38), 0.03, 0.006, 0.02, 0, -0.1, 0);
    K.add(z3Lam('#2a2622'), new THREE.BoxGeometry(0.2, 0.005, 0.01), -0.02, 0.01, -0.06, 0, 0.3, 0); K.add(z3Lam('#c8a040'), new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), 0.08, 0.012, 0.05, 0, 0, Math.PI / 2);
    K.into(g); }
  // the leading lamps on their iron posts, at the quay's seaward corners (dark until lit: red west, green east)
  Z3H.lamps = [P.lampW, P.lampE].map((L, i) => {
    const g = new THREE.Group(); g.position.copy(z3v(L.x, L.y, G0 + L.z - 1.75)); grp.add(g);
    K.add(iron, new THREE.CylinderGeometry(0.06, 0.09, 1.55, 8), 0, 0.78, 0); K.add(iron, new THREE.BoxGeometry(0.34, 0.04, 0.34), 0, 1.57, 0);
    for (const [u, v] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) K.add(iron, new THREE.BoxGeometry(0.025, 0.36, 0.025), u, 1.77, v);
    K.add(iron, new THREE.ConeGeometry(0.22, 0.16, 4), 0, 2.04, 0, 0, Math.PI / 4, 0); K.add(iron, new THREE.TorusGeometry(0.05, 0.012, 4, 10), 0, 2.15, 0);
    K.into(g);
    const glassM = new THREE.MeshPhongMaterial({ color: 0x303436, transparent: true, opacity: 0.75, shininess: 80 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), glassM); glass.position.y = 1.77; g.add(glass);
    const col = i ? '#60ff90' : '#ff5040', halo = sprite(col, 1.6, g); halo.position.y = 1.77; halo.visible = false;
    const light = new THREE.PointLight(i ? 0x60ff90 : 0xff5040, 0, 9, 1.6); light.position.y = 1.8; g.add(light);
    return { glassM, halo, light, col: new THREE.Color(col) };
  });
  // the tin herring: hanging among the fish, then on the floor
  { const g = new THREE.Group(); grp.add(g);
    K.add(tin, new THREE.SphereGeometry(0.07, 10, 7), 0, 0, 0, 0, 0, 0, [0.55, 1, 0.3]); K.add(tin, new THREE.ConeGeometry(0.045, 0.08, 4), 0, -0.1, 0, Math.PI, 0, 0, [1, 1, 0.35]);
    K.add(z3Lam('#1a1c20'), new THREE.SphereGeometry(0.009, 5, 4), 0.012, 0.04, 0.022);
    K.into(g);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), z3Lam('#8a7a5a')); str.position.y = 0.32; g.add(str);
    Z3H.fish = { g, str }; }
  // the key (in someone else's hand) and the ring (theirs, then on the boat's stem)
  { const g = new THREE.Group(); grp.add(g); K.add(iron, new THREE.TorusGeometry(0.035, 0.01, 5, 12), 0, 0.06, 0); K.add(iron, new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5), 0, -0.04, 0); K.add(iron, new THREE.BoxGeometry(0.04, 0.025, 0.01), 0.02, -0.1, 0); K.into(g); g.visible = false; Z3H.key = g; }
  { const g = new THREE.Group(); grp.add(g); const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 16), new THREE.MeshPhongMaterial({ color: 0xe8c050, specular: 0xffffff, shininess: 100, emissive: 0x302008 })); g.add(r); const h = sprite('#ffe8a8', 0.35, g); g.visible = false; Z3H.ring = { g, h }; }
  // the chain and padlock on the bell
  { const g = new THREE.Group(); g.position.copy(z3v(P.bell.x, P.bell.y, G0 + 1.05)); grp.add(g);
    for (let i = 0; i < 7; i++) K.add(iron, new THREE.TorusGeometry(0.045, 0.012, 4, 8), 0, i * 0.07, 0, 0, i % 2 ? Math.PI / 2 : 0, 0);
    K.add(brass, new THREE.BoxGeometry(0.12, 0.1, 0.05), 0, -0.07, 0); K.add(iron, new THREE.TorusGeometry(0.035, 0.01, 4, 8, Math.PI), 0, -0.02, 0);
    K.into(g); Z3H.chain = g; }
  // the seven lights out on the harbour, and the light in the well
  Z3H.boats = []; for (let i = 0; i < ZH_N; i++) { const s = sprite('#c8ffe8', 1.2); s.visible = false; Z3H.boats.push(s); }
  Z3H.wellL = sprite('#a8ffe0', 1.6); Z3H.wellL.position.copy(z3v(P.well.x, P.well.y, G0 + 0.5)); Z3H.wellL.visible = false;
  Z3H.ok = true;
}
function zh3d(dt) {
  if (!Z3H.ok || !ZH.P || !Z3H.gl.table.s.parent) return;
  const P = ZH.P, t = g.t, G0 = FPSC.GROUND, st = ZH.st, m = FPS.me, mine = zhMine();
  const GL = Z3H.glL; let lit = false;
  const tw = (G, on, q, z, ph, big) => {
    G.s.visible = G.h.visible = on; if (!on) return;
    const k = Math.pow(Math.max(0, Math.sin(t * 1.25 + ph)), 14), pu = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2 + ph), b = (big || 0.22) * 1.2, at = z3v(q.x, q.y, G0 + (z == null ? q.z : z));
    G.s.position.copy(at); G.s.material.opacity = 0.3 + 0.15 * pu + 0.55 * k; G.s.scale.setScalar(b * (0.65 + 0.2 * pu + 0.55 * k));
    G.h.position.copy(at); G.h.material.opacity = 0.09 + 0.06 * pu + 0.1 * k; G.h.scale.setScalar(b * 3.4 * (0.9 + 0.15 * pu));
    GL.position.copy(at); GL.position.y += 0.3; GL.color.copy(G.s.material.color); GL.intensity = 0.14 + 0.08 * pu + 0.16 * k; lit = true;
  };
  const Gl = Z3H.gl;
  tw(Gl.table, st === 0, P.table, P.table.z + 0.05, 0.3);
  tw(Gl.lampW, st === 1 && !(ZH.lit & 1), P.lampW, null, 1.1);
  tw(Gl.lampE, st === 1 && !(ZH.lit & 2), P.lampE, null, 2.3);
  tw(Gl.fish, st === 2, P.fish, null, 0.7, 0.2);
  tw(Gl.floor, st === 3, P.floor, 0.12, 1.9);
  tw(Gl.bell, st === 4 && mine, P.bell, 1.1, 2.6);
  tw(Gl.well, st === 7, P.well, null, 0.4, 0.3);
  tw(Gl.boat, st === 8 && mine, P.boat, null, 1.4, 0.3);
  if (!lit) GL.intensity = 0;
  // the leading lamps
  Z3H.lamps.forEach((L, i) => {
    const on = !!(ZH.lit & (i + 1)) && st < 9, f = reduceMotion ? 1 : 0.88 + 0.12 * Math.sin(t * 9 + i * 2) * Math.sin(t * 5.3 + i);
    L.glassM.color.copy(on ? L.col : new THREE.Color(0x303436)); L.glassM.emissive = L.glassM.emissive || new THREE.Color(); L.glassM.emissive.copy(on ? L.col : new THREE.Color(0)).multiplyScalar(on ? 0.6 : 0);
    L.halo.visible = on; L.halo.material.opacity = 0.6 * f; L.light.intensity = on ? 1.3 * f : 0;
  });
  // the tin herring
  { const F = Z3H.fish, up = st < 3; F.g.visible = st < 4; F.str.visible = up;
    if (up) { F.g.position.copy(z3v(P.fish.x, P.fish.y, G0 + P.fish.z)); F.g.rotation.set(0, reduceMotion ? 0 : Math.sin(t * 0.7) * 0.4, 0); }
    else { F.g.position.copy(z3v(P.floor.x, P.floor.y, G0 + P.floor.z)); F.g.rotation.set(0, 0.8, Math.PI / 2); } }
  // the chain on the bell
  Z3H.chain.visible = st < 5;
  // the key and the ring, in hand or set down
  const who = zhCarrierBody(), held = (o, z) => { if (who === m) { const h = m.h, ez = FPSC.EYE + (m.jz || 0) - (FPS.eyeLag || 0); o.position.copy(z3v(m.x + Math.sin(h) * 0.5 - Math.cos(h) * 0.28, m.y + Math.cos(h) * 0.5 + Math.sin(h) * 0.28, G0 + ez - 0.55)); o.rotation.set(0, -h, 0.3); } else { o.position.copy(z3v(who.x + Math.cos(who.h || 0) * 0.3, who.y - Math.sin(who.h || 0) * 0.3, G0 + (who.jz || 0) + z)); o.rotation.set(0, -(who.h || 0), 0.25); } };
  Z3H.key.visible = st === 4 && !!who; if (Z3H.key.visible) held(Z3H.key, 1.0);
  { const R = Z3H.ring; R.g.visible = (st === 8 && !!who) || st === 9;
    if (st === 8 && who) held(R.g, 1.05); else if (st === 9) { R.g.position.copy(z3v(P.boat.x, P.boat.y, G0 + P.boat.z)); R.g.rotation.set(0, reduceMotion ? 0 : t * 0.8, 0); }
    R.h.material.opacity = 0.5 + 0.3 * Math.sin(t * 3); }
  // the light at the bottom of the well
  Z3H.wellL.visible = st === 6 ? ZH.souls > 0 : st === 7; Z3H.wellL.material.opacity = st === 7 ? 0.85 : 0.2 + 0.08 * ZH.souls;
  // the seven lights: out on the harbour, bobbing, and at the last in to the quay
  const k = st === 9 ? Math.min(1, ZH.home || 0) : 0;
  Z3H.boats.forEach((s, i) => {
    s.visible = st >= 6; if (!s.visible) return;
    const x0 = FPSC.CX - 30 + i * 10, y0 = FPSC.CY - 72 - (i % 3) * 4, x1 = FPSC.CX - 15 + i * 5, y1 = FPSC.CY - 54.5;
    s.position.copy(z3v(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, G0 + 0.9 + (reduceMotion ? 0 : Math.sin(t * 1.1 + i * 1.7) * 0.18)));
    s.material.opacity = 0.65 + 0.25 * Math.sin(t * 2 + i); s.scale.setScalar(1.6 + k * 0.6);
  });
}

// ---------- on top of the view ----------
// Bethan's Shilling: silver, a herring over the waves and 1891; on its back the chapel's bell
function zhDrawCoin(q, x, y, r, spin, t) {
  const c = Math.cos((spin || 0) * Math.PI * 2), back = c < 0, sx = Math.max(0.04, Math.abs(c));
  q.save(); q.translate(x, y); q.scale(sx, 1);
  q.fillStyle = '#5a6068'; q.beginPath(); q.arc(0, 0, r, 0, 6.2832); q.fill();
  const gr = q.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#c8d0d8'); gr.addColorStop(1, '#7a848e');
  q.fillStyle = gr; q.beginPath(); q.arc(0, 0, r * 0.9, 0, 6.2832); q.fill();
  q.strokeStyle = 'rgba(40,46,54,0.8)'; q.lineWidth = Math.max(1, r * 0.035);
  for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832; q.beginPath(); q.moveTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); q.lineTo(Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99); q.stroke(); }
  q.beginPath(); q.arc(0, 0, r * 0.76, 0, 6.2832); q.stroke();
  q.fillStyle = q.strokeStyle = 'rgba(40,46,54,0.9)'; q.lineCap = 'round'; q.lineJoin = 'round';
  q.font = `700 ${Math.round(r * 0.2)}px "IM Fell English SC", Georgia, serif`; q.textAlign = 'center'; q.textBaseline = 'middle';
  if (!back) {
    // the herring, and the waves under it
    q.beginPath(); q.ellipse(-r * 0.04, -r * 0.02, r * 0.38, r * 0.12, 0, 0, 6.2832); q.fill();
    q.beginPath(); q.moveTo(r * 0.3, 0); q.lineTo(r * 0.5, -r * 0.13); q.lineTo(r * 0.5, r * 0.13); q.closePath(); q.fill();
    q.fillStyle = '#c8d0d8'; q.beginPath(); q.arc(-r * 0.3, -r * 0.03, r * 0.03, 0, 6.2832); q.fill(); q.fillStyle = 'rgba(40,46,54,0.9)';
    q.lineWidth = Math.max(1, r * 0.04);
    for (let j = 0; j < 2; j++) { const yy = r * (0.32 + j * 0.12); q.beginPath(); for (let i = -4; i <= 4; i++) { const xx = i * r * 0.1; if (i === -4) q.moveTo(xx, yy); else q.quadraticCurveTo(xx - r * 0.05, yy - r * 0.06, xx, yy); } q.stroke(); }
    q.fillText('1891', 0, -r * 0.48);
  } else {
    // the bell
    q.beginPath(); q.moveTo(-r * 0.12, -r * 0.3); q.quadraticCurveTo(-r * 0.16, r * 0.05, -r * 0.3, r * 0.2); q.lineTo(r * 0.3, r * 0.2); q.quadraticCurveTo(r * 0.16, r * 0.05, r * 0.12, -r * 0.3); q.closePath(); q.fill();
    q.beginPath(); q.arc(0, r * 0.26, r * 0.06, 0, 6.2832); q.fill(); q.fillRect(-r * 0.04, -r * 0.4, r * 0.08, r * 0.1);
    q.font = `700 ${Math.round(r * 0.13)}px "IM Fell English SC", Georgia, serif`; q.fillText('WRACKHAVEN', 0, r * 0.52);
  }
  if (t != null && !reduceMotion) { const k = ((t * 0.6) % 1) * 2.4 - 1.2; q.globalCompositeOperation = 'lighter'; const lg = q.createLinearGradient(k * r - r * 0.3, -r, k * r + r * 0.3, r); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(240,250,255,0.45)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = lg; q.beginPath(); q.arc(0, 0, r * 0.9, 0, 6.2832); q.fill(); q.globalCompositeOperation = 'source-over'; }
  q.restore();
}
function zhHud() {
  if (!ZH.P) return;
  const phone = FPS.touch, L = Math.max(14, FPS.safeLeft || 0), top = phone ? Math.max(10, FPS.safeTop || 0) + 40 : 18;
  // what you carry: a small mark, top left (the key, or her ring)
  if (zhMine() && (ZH.st === 4 || ZH.st === 8) && !(FPS.me.dead > 0)) {
    ctx.save(); ctx.translate(L + 12, top + 14); ctx.lineWidth = 2.5;
    if (ZH.st === 4) { ctx.strokeStyle = '#8a8e94'; ctx.beginPath(); ctx.arc(0, -6, 5, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 12); ctx.moveTo(0, 8); ctx.lineTo(5, 8); ctx.moveTo(0, 12); ctx.lineTo(4, 12); ctx.stroke(); }
    else { const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 16); gr.addColorStop(0, 'rgba(255,230,150,0.5)'); gr.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = gr; ctx.fillRect(-16, -16, 32, 32); ctx.strokeStyle = '#f0c850'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.2832); ctx.stroke(); }
    ctx.restore();
  }
  if (ZH.cele > 0) {
    const k = ZH.cele, a = Math.min(1, (8 - k) * 1.5, k), show = 8 - k;
    if (show > 2.2) {
      const t = g.t, r = Math.min(W, H) * (phone ? 0.13 : 0.11) * Math.min(1, (show - 2.2) * 2.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const gr = ctx.createRadialGradient(cx, H * 0.42, r * 0.5, cx, H * 0.42, r * 3); gr.addColorStop(0, 'rgba(200,240,255,0.32)'); gr.addColorStop(1, 'rgba(200,240,255,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r * 3, H * 0.42 - r * 3, r * 6, r * 6);
      if (!reduceMotion) for (let i = 0; i < 14; i++) { const an = i / 14 * 6.2832 + t * 0.7, rr = r * (1.5 + 0.3 * Math.sin(t * 3 + i)); if (Math.sin(t * 5 + i * 2.3) > 0.3) { ctx.fillStyle = '#e8fff4'; ctx.fillRect(cx + Math.cos(an) * rr - 1.5, H * 0.42 + Math.sin(an) * rr - 1.5, 3, 3); } }
      zhDrawCoin(ctx, cx, H * 0.42, r, reduceMotion ? 0 : t * 0.35, t);
      { const y0 = H * 0.42 + r + (phone ? 10 : 16), bh = phone ? 52 : 70, bw = Math.min(W * 0.92, phone ? 360 : 620); ctx.fillStyle = 'rgba(8,10,14,0.62)'; ctx.fillRect(cx - bw / 2, y0, bw, bh); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `400 ${phone ? 22 : 34}px "IM Fell English SC", serif`; ctx.fillStyle = '#e8f4ff';
      ctx.fillText('Bethan’s Shilling', cx, H * 0.42 + r + (phone ? 26 : 38));
      ctx.font = `600 ${phone ? 11 : 13}px "Courier Prime", monospace`; ctx.fillStyle = 'rgba(236,228,207,0.9)';
      ctx.fillText(`A pirate token: yours to keep (${typeof ptTokens === 'function' ? ptTokens() : 1} to spend on the Keeper’s Last Light card)`, cx, H * 0.42 + r + (phone ? 48 : 68), W * 0.9);
      ctx.restore();
    }
  }
}
