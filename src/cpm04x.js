'use strict';
// The Chronicle of the Light, mission 4, The Night of the Gannet: its three stages (the mission, its cinematics and the
// Gannet's course are in src/cpm04.js; the Light's kit in src/cpm03.js).
//
// The station, 1887 (FPI_GEN.cplstation): the Lighthouse's own station laid out by its own generator (src/zombies.js
// FPI_GEN.light), with its night's furniture left out (zmKit's wall buys, tonics and chest places made nothing for the
// while; the lever that lights the lamp not placed; the Lampwright's Bench there to look at, but not to use), every
// door open, every window glazed again, and nobody nailing boards. Then each stage's own things (the bell on the
// gallery, the oil, the wick, the skiff). ZM_MAPS.campaign.tower is set while it's laid out (the tower's rooms and its
// lantern, src/zombies.js zmTower), and put back as it ends.
//
//  I.   The First Hour (cp_m04watch), up in the lantern room and out on the gallery, in a gale.
//       - The beam: hold of the turning bar at the lens (Use to take it, Use again to let go): the beam swings to follow
//         where you look (as quick as a man can push a lens round). Let go, and it stays where you left it.
//       - The Gannet: her master's sight of the rocks (a bar) climbs while the beam is on her and fades while it's off
//         (quicker the more of you there are to keep it up). Among the rocks with it gone for M4W.LOST seconds, she
//         strikes: the mission is lost.
//       - The fog bell, out on the gallery: ring it (Use) and she shortens sail a while (slower, and her sight fades
//         slower); it has to swing still (M4W.BELL_CD) before it's rung again.
//       - Squalls: every so often sleet drives in off the sea and crusts the glass on the weather side; the beam through
//         a crusted pane is dimmed, and does her less good. Wipe a pane clear from the gallery outside it (hold Use).
//       Done when she's in the inner skerries: then the lamp fails (src/cpm04.js m04_fail).
//  II.  The Second Hour (cp_m04dark). The lamp is out, the lens dark. Three jobs, then the lamp: the oil (a can from
//       the cask in the Oil Room, the first floor's south side, carried up), a new wick (from the Service Room, the
//       fourth floor's north side, carried up), the clockwork wound (hold Use at the Clock Room's clockwork, the third
//       floor's north side; two winding go quicker); then pour, fit, and hold Use at the lamp to light it. Maren goes
//       twenty seconds in (m04_maren); her lantern can be watched going out across the water towards the brig, and
//       the Gannet's bell coming nearer. Lit: m04_late, and the stage is done.
//  III. The Harbour Steps (cp_m04dawn). Grey morning, the gale blown out. From the Keeper's Quarters out into the
//       courtyard; ring the fog bell for her three times (it has to swing still between); then down to the harbour
//       steps. The skiff drifts in, empty, the lantern still lit in it: take it up (Use). The outro follows.
// Together: the host keeps everything in RAID.st and sends it in the stage's word; joined players ask with raidAsk
// ('bar', 'aim', 'bell', 'wipe', 'oil', 'wick', 'wind', 'pour', 'fit', 'light', 'ring', 'lantern').

const M4W = { TURN: 0.95, ON: 0.075, GAIN: 0.32, FADE: 0.05, FADE_N: 0.012, LOST: 6, V: 3.4, BELL_V: 0.45, BELL_T: 7, BELL_CD: 12, SQ: [26, 36], SQ_T: 13, CRUST: 0.085,
  BELL: [Math.cos(Math.PI * 0.62) * 8.6, ZMT.Y + Math.sin(Math.PI * 0.62) * 8.6], NG: 24, GR: ZMT.GLASS, WIND: 0.15 };
const M4D = { OIL: [ZMT.X - 5.6, ZMT.Y - 3.8, ZMT.L[1]], WICK: [ZMT.X - 6, ZMT.Y + 5.2, ZMT.L[4]], CLOCK: [ZMT.X - 6.2, ZMT.Y + 4.6, ZMT.L[3]], CLOCK_T: 10, MAREN: 20, GV: 0.55 };
const M4E = { BELL: [5.4, -37.6], STEPS: [1.6, -42.2], SKIFF: [4.4, -45.6], RINGS: 3 };

// ---------- the station, 1887 ----------
FPS_ISLES.cplstation = Object.assign({}, FPS_ISLES.light, { name: 'Skerry Light', nLights: 8 });
FPI_GEN.cplstation = {
  built: true,
  set(H) {
    const S = RAID_STAGES[RAID_ORDER[RAID.stage]] || RAID_STAGES[RAID_ORDER[0]];
    const kit0 = zmKit, lever0 = typeof zmlPlace === 'function' ? zmlPlace : null;
    zmKit = function (H2, Z2) { return Object.assign({}, kit0(H2, Z2), { buy() {}, perk() {}, spot() {} }); };
    if (lever0) zmlPlace = function () {};
    try { FPI_GEN.light.set(H); } finally { zmKit = kit0; if (lever0) zmlPlace = lever0; }
    const Z = H.I.zm;
    delete Z.pap;   // (the Lampwright's Bench stands in its store, but nothing's reforged on it tonight)
    // every window glazed again: the tower's into its glass, the rest as panes in their walls
    for (const w of Z.windows) {
      if (w.sea) continue;
      const ang = Math.atan2(w.ny, w.nx) + Math.PI / 2;
      if (w.tw) Z.glass.push({ x: w.x, y: w.y, ang, w: w.hw * 2 * 0.92, z0: (w.z || 0) + 1.0, z1: (w.z || 0) + 2.35, frame: true });
      else (Z.glassQ = Z.glassQ || []).push({ x: w.x, y: w.y, ang: Math.abs(w.nx) > 0.5 ? Math.PI / 2 : 0, w: w.hw * 2 + 0.02, z0: (w.z || 0) + 1.0, z1: (w.z || 0) + 2.35, frame: true, flat: true });
    }
    Z.glass.push(...(Z.glassQ || []).filter(q => !Z.glass.includes(q)));
    Z.windows = []; Z.spawns = [];
    S.set(H, kit0(H, Z), Z);
  },
  decor() {},
};
// (every screen, as a stage begins) every door in the station open, at once
function m4OpenAll() {
  const I = FPS.g.isle; let n = 0;
  for (const d of ZM.doors) { if (d.open) continue; d.open = true; d.openT = 9; I.solids = I.solids.filter(s => !d.solids.includes(s)); for (const k of d.zones) ZM.open.add(k); n++; }
  ZM.open.add('top'); ZM.open.add('tower');
  if (n) { fpiIndex(I); zmNavBuild(); }
}
const M4MAP = (start, top) => ({ start, top, isle: 'cplstation', shore: CPL_SHORE, nav: [-44, 44, -66, 26], zones: ZM_MAPS.light.zones });
const m4Prep = () => { ZM_MAPS.campaign.tower = true; };
const m4Exit = () => { ZM_MAPS.campaign.tower = false; m3PeopleFree(); };
// the lantern's panes, round: [middle angle (from east, anticlockwise), index] for each pane (not the two doors)
const M4P = []; for (let i = 0; i < M4W.NG; i++) if (!(i === 0 || i === M4W.NG - 1 || i === M4W.NG / 2 || i === M4W.NG / 2 - 1)) M4P.push([(i + 0.5) / M4W.NG * Math.PI * 2, i]);
// which pane a beam pointing at bearing b goes out through (or -1: through a door)
function m4PaneOf(b) { const a = ((Math.PI / 2 - b) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), i = Math.floor(a / (Math.PI * 2) * M4W.NG); return M4P.findIndex(p => p[1] === i); }
const m4Bear = s => { const [x, y] = m4At(s); return Math.atan2(x - ZMT.X, y - ZMT.Y); };

// the Gannet in the world (every stage): the brig, her lights, the beam on her or not
function m4Gannet3d(grp) { const b = cplBrig({}); grp.add(b); return b; }
function m4GannetPose(B, s, lit, o) {
  o = o || {};
  const [x, y, h] = m4At(s), t = g.t, roll = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.08, pitch = reduceMotion ? 0 : Math.sin(t * 0.7 + 1) * 0.05;
  B.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 0.6 - (o.sink || 0)));
  B.rotation.set(0, 0, 0); B.rotation.order = 'YXZ'; B.rotation.y = Math.PI / 2 - h; B.rotation.x = roll + (o.heel || 0); B.rotation.z = pitch;
  for (const sm of B.userData.sails) { sm.material.emissive = sm.material.emissive || new THREE.Color(); sm.material.emissive.setRGB(0.5 * lit, 0.46 * lit, 0.36 * lit); }
  B.userData.lights.forEach(l => { l.visible = !o.dark; });
}
// the rocks of the skerries, out on the water: low black teeth with white water round them
function m4Rocks(grp) {
  const rock = new THREE.MeshLambertMaterial({ color: 0x1a1c1e }), foam = new THREE.MeshBasicMaterial({ color: 0xc8d4dc, transparent: true, opacity: 0.35, depthWrite: false }), rr = seeded(0x9e11), out = [];
  for (const [x, y, r] of M4.ROCKS) {
    const g3 = new THREE.Group(); g3.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 0.8)); grp.add(g3);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r * (0.35 + rr() * 0.4), 0), rock); m.position.set((rr() - 0.5) * r, rr() * 0.6, (rr() - 0.5) * r); m.scale.y = 0.35 + rr() * 0.35; m.rotation.set(rr(), rr() * 3, rr()); g3.add(m); }
    const f = new THREE.Mesh(new THREE.RingGeometry(r * 0.6, r * 1.15, 18), foam); f.rotation.x = -Math.PI / 2; f.position.y = 0.95; g3.add(f); g3.userData.foam = f; out.push(g3);
  }
  return out;
}
// the sleet: streaks driving past, close round you (only to look at)
function m4Sleet(grp) {
  const n = 500, pos = new Float32Array(n * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const L = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd8e4ee, transparent: true, opacity: 0.0, depthWrite: false })); L.frustumCulled = false; grp.add(L);
  const P = []; for (let i = 0; i < n; i++) P.push([Math.random() * 40 - 20, Math.random() * 40 - 20, Math.random() * 14]);
  return { L, P, pos };
}
function m4SleetTick(W, k, dt) {
  W.L.material.opacity = 0.55 * k; W.L.visible = k > 0.02; if (!W.L.visible) return;
  const m = FPS.me, z0 = FPSC.GROUND + (m.jz || 0) - 2, vx = -14, vy = -6, vz = -9;
  W.P.forEach((p, i) => { p[0] += vx * dt; p[1] += vy * dt; p[2] += vz * dt; if (p[2] < 0 || p[0] < -20) { p[0] = Math.random() * 40 - 10; p[1] = Math.random() * 40 - 20; p[2] = 6 + Math.random() * 10; }
    const x = m.x + p[0], y = m.y + p[1], z = z0 + p[2]; W.pos.set([x, z, -y, x - vx * 0.03, z - vz * 0.03, -(y - vy * 0.03)], i * 6); });
  W.L.geometry.attributes.position.needsUpdate = true;
}
// the bell on the gallery: an iron bracket off the parapet, the bell, its rope
function m4Bell3d(grp, x, y, z) {
  const g3 = new THREE.Group(); g3.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + z)); grp.add(g3);
  const iron = z3Lam('#2a2c30'), bronze = new THREE.MeshPhongMaterial({ color: 0x8a6a30, specular: 0xd0b070, shininess: 60 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), iron); post.position.y = 1.3; g3.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), iron); arm.position.set(0.4, 2.55, 0); g3.add(arm);
  const swing = new THREE.Group(); swing.position.set(0.75, 2.5, 0); g3.add(swing);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.36, 0.55, 14, 1, true), new THREE.MeshPhongMaterial({ color: 0x8a6a30, specular: 0xd0b070, shininess: 60, side: THREE.DoubleSide })); bell.position.y = -0.35; swing.add(bell);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze); crown.position.y = -0.08; swing.add(crown);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 5), z3Lam('#b8a680')); rope.position.set(0, -1.2, 0); swing.add(rope);
  return swing;
}

// ---------- I. The First Hour ----------
cpStage('m04watch', {
  n: 'The First Hour',
  map: M4MAP([ZMT.X - 2, ZMT.Y - 4.2], ZMT.L[5]),
  prep: m4Prep,
  set(H, K, Z) {},
  enter() {
    m4OpenAll();
    const n = Math.max(1, ZM.hum.length || 1);
    Object.assign(RAID.st, { s: 40, sight: 0.75, ba: 0.55, aim: 0.55, bar: '', bellT: 0, bellCd: 0, bellSeq: 0, crust: M4P.map(() => 0), sqT: 18, sq: 0, lostT: 0, n, said: {}, t: 0, on: 0 });
    if (ZM.net !== 'client') cpObjective('Take the turning bar at the lens, and keep the beam on the Gannet');
  },
  speedK() { return 1; },
  noGun: true,
  tick(dt) {
    const S = RAID.st; S.t += dt;
    if (cpCineOn()) return;
    const P = cplPeople();
    // the bar: its holder still by the lens, or it's let go
    if (S.bar) { const h = P.find(p => p[0] === S.bar); if (!h || h[4] || Math.hypot(h[1] - FPSC.CX - ZMT.X, h[2] - FPSC.CY - ZMT.Y) > 4.2 || Math.abs(h[3] - ZMT.L[5]) > 1.5) S.bar = ''; }
    if (S.bar === FPS.me.id) S.aim = FPS.me.h;
    if (S.bar) { const d = angDiff(S.aim, S.ba); S.ba = (S.ba + clamp(d, -M4W.TURN * dt, M4W.TURN * dt) + Math.PI * 2) % (Math.PI * 2); }
    // squalls of sleet: the glass crusting on the weather side
    S.sqT -= dt; if (S.sqT <= 0) { if (S.sq) { S.sq = 0; S.sqT = M4W.SQ[0] + Math.random() * (M4W.SQ[1] - M4W.SQ[0]); } else { S.sq = 1; S.sqT = M4W.SQ_T; cpEvent('m4squall', 1); if (!S.said.sq) { S.said.sq = 1; cpSay('maren', 'Sleet! It’s crusting the glass. I can’t see her through it.', 'cp_m04_27'); } } }
    M4P.forEach(([a], i) => { const weather = Math.abs(angDiff(a, M4W.WIND)) < 1.45; S.crust[i] = clamp(S.crust[i] + dt * (S.sq && weather ? M4W.CRUST * (0.6 + 0.4 * Math.cos(angDiff(a, M4W.WIND))) : weather ? 0.006 : 0), 0, 1); });
    // the Gannet: on her way in, slower while the bell's rung; her master's sight of the rocks
    const bell = S.bellT > 0; S.bellT = Math.max(0, S.bellT - dt); S.bellCd = Math.max(0, S.bellCd - dt);
    S.s += dt * M4W.V * (bell ? M4W.BELL_V : 1);
    const b = m4Bear(S.s), pane = m4PaneOf(b), clear = pane < 0 ? 1 : 1 - 0.85 * S.crust[pane];
    S.on = cplInBeam(b, S.ba, M4W.ON) ? clear : 0;
    if (S.on > 0) S.sight = Math.min(1, S.sight + dt * M4W.GAIN * S.on);
    else S.sight = Math.max(0, S.sight - dt * (M4W.FADE + M4W.FADE_N * (S.n - 1)) * (bell ? 0.4 : 1));
    // lost among the rocks: she strikes
    if (S.sight <= 0 && S.s > M4.DANGER) { S.lostT += dt; if (S.lostT >= M4W.LOST) { cpFail('The Gannet went onto the rocks in the dark'); return; } } else S.lostT = Math.max(0, S.lostT - dt * 2);
    // the hour's end: she's in the inner skerries, and the lamp fails
    if (S.s >= M4.FAIL) { cpObjective(''); cpWaypoint(null); cpDone(); return; }
    cpObjective(S.bar ? 'Keep the beam on the Gannet' : 'Take the turning bar at the lens, and keep the beam on the Gannet');
    { const [x, y] = m4At(S.s); cpWaypoint(x, y, 'The Gannet', 6); }
    m4WatchSay(S);
  },
  q(sid, k, a) {
    const S = RAID.st, P = cplPeople().find(p => p[0] === sid); if (!P) return;
    const [, x, y, jz] = P, near = (q, r) => Math.hypot(x - FPSC.CX - q[0], y - FPSC.CY - q[1]) < r && Math.abs(jz - ZMT.L[5]) < 1.6;
    if (k === 'bar') { if (S.bar === sid) S.bar = ''; else if (!S.bar && near([ZMT.X, ZMT.Y], 3.6)) { S.bar = sid; S.aim = S.ba; } }
    else if (k === 'aim' && S.bar === sid) S.aim = +a || 0;
    else if (k === 'bell' && S.bellCd <= 0 && near(M4W.BELL, 2.6)) { S.bellT = M4W.BELL_T; S.bellCd = M4W.BELL_CD; S.bellSeq++; cpEvent('m4bell', 1); if (!S.said.bell) { S.said.bell = 1; cpSay('holm', 'That’s it. She heard; she’s shortening sail.', 'cp_m04_28'); } }
    else if (k === 'wipe') { const i = a | 0; if (i >= 0 && i < M4P.length) { const [ang] = M4P[i], px = ZMT.X + Math.cos(ang) * 7.4, py = ZMT.Y + Math.sin(ang) * 7.4; if (near([px, py], 2.4)) S.crust[i] = 0; } }
  },
  me(dt) {
    const S = RAID.st, o = ZM.near;
    // at the bar: where I look goes to the host
    if (S.bar === FPS.me.id && ZM.net === 'client') { S.aimAsk = (S.aimAsk || 0) - dt; if (S.aimAsk <= 0) { S.aimAsk = 0.12; raidAsk('aim', Math.round(FPS.me.h * 1000) / 1000); } }
    if (o && o.k === 'm4wipe' && cplHold('m4wipe', dt, 0.8)) raidAsk('wipe', o.i);
    if (S.bellSeq !== S.bellSeen) { if (S.bellSeen != null) S.swing = 1; S.bellSeen = S.bellSeq; }
    S.swing = Math.max(0, (S.swing || 0) - dt * 0.12);
    // (on every screen) the lens grinding round on its rollers while it's turned, the sleet on the glass through a squall, and a pane wiped clear
    if (S.baSeen != null && S.bar && dt > 0 && Math.abs(angDiff(S.ba, S.baSeen)) / dt > 0.12) try { sfxPlay('beamswing', { vol: 0.5, gap: 2 }); } catch (e) {}
    S.baSeen = S.ba;
    if (S.sq && !cpCineOn()) try { sfxPlay('sleetglass', { vol: 0.45, gap: 4.5 }); } catch (e) {}
    if (S.crSeen && S.crust.some((c, i) => c < 0.05 && S.crSeen[i] > 0.15)) try { sfxPlay('glasswipe', { vol: 0.7 }); } catch (e) {}
    S.crSeen = S.crust.slice();
  },
  pack(o) { const S = RAID.st; o.m = [Math.round(S.s * 10) / 10, Math.round(S.sight * 100) / 100, Math.round(S.ba * 1000) / 1000, S.bar, Math.round(S.bellT * 10) / 10, Math.round(S.bellCd * 10) / 10, S.bellSeq, S.sq, Math.round(S.lostT * 10) / 10, Math.round(S.on * 100) / 100]; o.cr = S.crust.map(c => Math.round(c * 20)); },
  apply(o) {
    const S = RAID.st, a = o.m; if (!Array.isArray(a)) return;
    S.s = +a[0] || 0; S.sight = +a[1] || 0; const ba = +a[2] || 0; S.ba = S.ba == null ? ba : (S.ba + angDiff(ba, S.ba) * 0.5 + Math.PI * 2) % (Math.PI * 2); S.bar = String(a[3] || ''); S.bellT = +a[4] || 0; S.bellCd = +a[5] || 0; S.bellSeq = a[6] | 0; S.sq = a[7] | 0; S.lostT = +a[8] || 0; S.on = +a[9] || 0;
    if (Array.isArray(o.cr)) S.crust = M4P.map((p, i) => clamp((+o.cr[i] || 0) / 20, 0, 1));
  },
  consider(c) {
    const S = RAID.st, X = FPSC.CX, Y = FPSC.CY, Z5 = ZMT.L[5];
    c({ k: 'm4bar', id: 'bar' }, X + ZMT.X, Y + ZMT.Y, Z5, 3.2, false);
    c({ k: 'm4bell', id: 'bell' }, X + M4W.BELL[0], Y + M4W.BELL[1], Z5, 2.2, false);
    M4P.forEach(([a], i) => { if (S.crust[i] > 0.15) c({ k: 'm4wipe', i, id: 'w' + i }, X + ZMT.X + Math.cos(a) * 7.4, Y + ZMT.Y + Math.sin(a) * 7.4, Z5, 1.6, true); });
  },
  prompt(o) {
    const S = RAID.st;
    if (o.k === 'm4bar') return S.bar === FPS.me.id ? { text: 'Let go of the turning bar' } : S.bar ? { text: `${m3Nick(S.bar)} has the turning bar` } : { text: 'Take the turning bar: the beam follows your eye' };
    if (o.k === 'm4bell') return S.bellCd > 0 ? { text: `The bell is still swinging (${Math.ceil(S.bellCd)} s)` } : { text: 'Ring the fog bell: she’ll shorten sail' };
    if (o.k === 'm4wipe') return { text: 'Hold to wipe the sleet off the glass', hold: true };
    return null;
  },
  use(o) {
    if (o.k === 'm4bar') { raidAsk('bar'); return true; }
    if (o.k === 'm4bell') { raidAsk('bell'); return true; }
    return o.k === 'm4wipe';
  },
  hud(phone, mono, fell) {
    const S = RAID.st, t = g.t;
    const low = S.sight < 0.3;
    cplBar(phone, mono, 'THE GANNET · HER MASTER’S SIGHT OF THE ROCKS', S.sight, 0, low ? `rgba(230,110,90,${0.7 + 0.3 * Math.sin(t * 8)})` : '#ffe0a0');
    cplBar(phone, mono, `THE FIRST HOUR${S.bellT > 0 ? ' · SHORTENING SAIL' : ''}${S.bellCd > 0 ? '' : ' · BELL READY'}`, (S.s - 40) / (M4.FAIL - 40), 1, '#8fb8d8');
    ctx.textAlign = 'center'; ctx.font = fell(phone ? 15 : 20);
    if (S.on > 0) { ctx.fillStyle = 'rgba(255,236,180,0.9)'; ctx.fillText(S.on < 0.6 ? 'The beam is on her, dimmed by the sleet on the glass' : 'The beam is on her', cx, H - (phone ? 120 : 100)); }
    else if (S.lostT > 0 && S.s > M4.DANGER) { ctx.fillStyle = `rgba(255,140,110,${0.75 + 0.25 * Math.sin(t * 9)})`; ctx.fillText('She’s blind among the rocks! The beam, on her!', cx, H * 0.3); }
    if (S.bar === FPS.me.id) { ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.75)'; ctx.fillText('At the turning bar: the beam follows where you look', cx, H - (phone ? 100 : 76)); }
    cplHoldHud();
  },
  b3(grp) {
    const S = RAID.st;
    cplCarryBuild(grp);
    S.g3 = { brig: m4Gannet3d(grp), rocks: m4Rocks(grp), sleet: m4Sleet(grp), bell: m4Bell3d(grp, M4W.BELL[0], M4W.BELL[1], ZMT.L[5]), crust: [] };
    // the sleet on the glass: a white skin on each pane, as thick as it's crusted
    const mat = () => new THREE.MeshLambertMaterial({ color: 0xe8eef2, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    M4P.forEach(([a]) => { const w = 2 * M4W.GR * Math.sin(Math.PI / M4W.NG), m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.3), mat()); m.position.copy(z3v(FPSC.CX + ZMT.X + Math.cos(a) * (M4W.GR + 0.06), FPSC.CY + ZMT.Y + Math.sin(a) * (M4W.GR + 0.06), FPSC.GROUND + ZMT.L[5] + 2.7)); m.rotation.y = a + Math.PI / 2; grp.add(m); S.g3.crust.push(m); });
    M3N.npc = []; m3People([['holm', M4C.holm, ZMT.X - 2.2, ZMT.Y + 2.2, Math.PI * 0.4, { z: ZMT.L[5] }]]);
    const mw = S.g3.maren = cplWoman({}); if (mw) grp.add(mw.root);
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    const cine = cpCineOn(), sq = S.sq ? 1 : 0;
    G.sqK = (G.sqK || 0) + ((sq ? 1 : 0.2) - (G.sqK || 0)) * Math.min(1, dt * 0.8);
    cplSky({ amb: 0.3, moon: 0.08, fog: [0.035, 0.045, 0.06], near: 30, far: 560 - 220 * G.sqK });
    cplLensSet(1, S.ba);
    const ov = cine && M4.ov;
    m4GannetPose(G.brig, ov && ov.s != null ? ov.s : S.s, ov ? 0.3 : S.on, ov || {});
    G.rocks.forEach((r, i) => { r.userData.foam.material.opacity = 0.25 + 0.15 * Math.sin(g.t * 1.3 + i); });
    m4SleetTick(G.sleet, G.sqK, dt);
    G.crust.forEach((m, i) => { m.material.opacity = 0.8 * S.crust[i]; m.visible = S.crust[i] > 0.02; });
    G.bell.rotation.x = Math.sin(g.t * 6) * 0.5 * (S.swing || 0);
    // Holm at the lens with his glass; Maren at the gallery's rail, watching for her
    m3PeoplePose(dt);
    if (G.maren) { G.maren.root.visible = !cine; cplWomanPose(G.maren, { x: FPSC.CX + ZMT.X + Math.cos(0.5) * 8.4, y: FPSC.CY + ZMT.Y + Math.sin(0.5) * 8.4, h: Math.PI / 2 - 0.5, z: ZMT.L[5] }); }
    cplCarry3d();
  },
  exit: m4Exit,
  music() { return 'cpm04watch'; },
  mend: true,
});
function m4WatchSay(S) {
  const say = (k, who, text, vo, ok) => { if (!S.said[k] && ok) { S.said[k] = 1; cpSay(who, text, vo); } };
  say('a', 'holm', 'Every rock the beam shows him, he remembers. Leave him in the dark and he forgets them all.', 'cp_m04_29', S.t > 6);
  say('b', 'maren', 'She’s coming on fast, Holm. Under all plain sail, in this.', 'cp_m04_30', S.t > 22);
  say('c', 'holm', 'If she crowds the rocks, ring the bell. He’ll shorten sail and give us time.', 'cp_m04_31', S.t > 34);
  say('d', 'holm', 'She’s in among them now. Don’t you leave her.', 'cp_m04_32', S.s > M4.DANGER);
  say('e', 'maren', 'She’s losing them! Back on her, back on her!', 'cp_m04_33', S.sight < 0.25 && S.s > M4.DANGER);
  say('f', 'holm', 'Good. Good. She knows where she is.', 'cp_m04_34', S.sight > 0.9 && S.t > 60);
  say('g', 'maren', 'I can see her figurehead in the beam. A woman, carved, with her arm out.', 'cp_m04_35', S.on > 0.5 && S.s > M4.DANGER + 120);
  say('h', 'holm', 'Nearly through. One more mile of it.', 'cp_m04_36', S.s > M4.FAIL - 110);
}
cpOn('m4bell', () => { try { if (!sfxPlay('gallerybell', { vol: 0.9 }) && !soundOff()) sfxBell(); } catch (e) {} });
cpOn('m4squall', () => { try { if (!sfxPlay('sleetglass', { vol: 0.55, gap: 4.5 }) && !soundOff()) sfxWhoosh(); } catch (e) {} fpsFeed('A squall of sleet off the sea.'); });

// ---------- II. The Second Hour ----------
cpStage('m04dark', {
  n: 'The Second Hour',
  map: M4MAP([ZMT.X - 2, ZMT.Y - 4.2], ZMT.L[5]),
  prep: m4Prep,
  set(H, K, Z) {},
  enter() {
    m4OpenAll();
    Object.assign(RAID.st, { s: M4.FAIL, carry: {}, oil: 0, wick: 0, clock: 0, winders: {}, lit: 0, maren: 0, mk: 0, said: {}, t: 0, n: Math.max(1, ZM.hum.length || 1) });
    if (ZM.net !== 'client') cpObjective('Relight the lamp: oil, a new wick, and the clockwork wound');
  },
  noGun: true,
  tick(dt) {
    const S = RAID.st;
    if (cpCineOn()) return;
    S.t += dt;
    // the Gannet comes on, slowly, deeper into the skerries; Maren's skiff goes out to her
    S.s = Math.min(M4.STRIKE - 70, S.s + dt * M4D.GV);
    if (!S.maren && S.t > M4D.MAREN) { S.maren = 1; cpCine('m04_maren'); return; }
    if (S.maren) S.mk = Math.min(1, S.mk + dt / 150);
    // the clockwork, wound while someone's at it
    const now = RAID.t; let w = 0; for (const sid in S.winders) if (now - S.winders[sid] < 0.45) w++; else delete S.winders[sid];
    if (S.clock < 1 && w > 0) { S.clock = Math.min(1, S.clock + dt * (w > 1 ? 1.6 : 1) / M4D.CLOCK_T); if (S.clock >= 1) cpSay('holm', 'The weights are up. She’ll turn when she’s lit.', 'cp_m04_37'); }
    // (anyone who goes down with something: it goes back where it came from)
    for (const p of cplPeople()) if (p[4] && S.carry[p[0]]) { const c = S.carry[p[0]]; delete S.carry[p[0]]; if (c === 'oil') S.oil = 0; if (c === 'wick') S.wick = 0; }
    // the objective
    const need = [];
    if (S.oil !== 1) need.push(S.oil === 'carried' ? 'pour the oil' : 'oil from the Oil Room (first floor)');
    if (S.wick !== 1) need.push(S.wick === 'carried' ? 'fit the wick' : 'a wick from the Service Room (fourth floor)');
    if (S.clock < 1) need.push('wind the clockwork (third floor)');
    if (need.length) { cpObjective('Relight the lamp: ' + need.join(', ')); const mine = cplCarryOf(FPS.me.id); if (mine) cpWaypoint(ZMT.X, ZMT.Y, 'The lamp', ZMT.L[5] + 1.4); else if (S.oil === 0) cpWaypoint(M4D.OIL[0], M4D.OIL[1], 'The oil', M4D.OIL[2] + 1.2); else if (S.wick === 0) cpWaypoint(M4D.WICK[0], M4D.WICK[1], 'The wick', M4D.WICK[2] + 1.2); else if (S.clock < 1) cpWaypoint(M4D.CLOCK[0], M4D.CLOCK[1], 'The clockwork', M4D.CLOCK[2] + 1.4); else cpWaypoint(ZMT.X, ZMT.Y, 'The lamp', ZMT.L[5] + 1.4); }
    else { cpObjective('Light the lamp'); cpWaypoint(ZMT.X, ZMT.Y, 'The lamp', ZMT.L[5] + 1.4); }
    const say = (k, who, text, vo, ok) => { if (!S.said[k] && ok) { S.said[k] = 1; cpSay(who, text, vo); } };
    say('a', 'holm', 'Quick as you can on the stair. Ninety steps, and every one of them matters.', 'cp_m04_38', S.t > 4);
    say('b', 'holm', 'I can see her lantern. She’s clear of the jetty. Pull, Maren, pull.', 'cp_m04_39', S.maren && S.t > M4D.MAREN + 14);
    say('c', 'holm', 'Hark. That’s the Gannet’s bell. She’s ringing for a pilot, God help her.', 'cp_m04_40', S.t > 70);
    say('d', 'holm', 'Hurry. Oh, hurry.', 'cp_m04_41', S.t > 110);
  },
  q(sid, k) {
    const S = RAID.st, P = cplPeople().find(p => p[0] === sid); if (!P) return;
    const [, x, y, jz] = P, near = (q, r, z) => Math.hypot(x - FPSC.CX - q[0], y - FPSC.CY - q[1]) < r && Math.abs(jz - (z == null ? q[2] : z)) < 1.6;
    if (k === 'oil' && !S.carry[sid] && S.oil === 0 && near(M4D.OIL, 2.8)) { S.carry[sid] = 'oil'; S.oil = 'carried'; }
    else if (k === 'wick' && !S.carry[sid] && S.wick === 0 && near(M4D.WICK, 2.8)) { S.carry[sid] = 'wick'; S.wick = 'carried'; }
    else if (k === 'wind' && S.clock < 1 && near(M4D.CLOCK, 2.8)) S.winders[sid] = RAID.t;
    else if (k === 'pour' && S.carry[sid] === 'oil' && near([ZMT.X, ZMT.Y], 3.2, ZMT.L[5])) { delete S.carry[sid]; S.oil = 1; cpSay('holm', 'Oil. Good.', 'cp_m04_42'); }
    else if (k === 'fit' && S.carry[sid] === 'wick' && near([ZMT.X, ZMT.Y], 3.2, ZMT.L[5])) { delete S.carry[sid]; S.wick = 1; cpSay('holm', 'The new wick’s in. Trimmed square.', 'cp_m04_43'); }
    else if (k === 'light' && S.oil === 1 && S.wick === 1 && S.clock >= 1 && !S.lit && near([ZMT.X, ZMT.Y], 3.2, ZMT.L[5])) { S.lit = 1; cpObjective(''); cpWaypoint(null); cpDone(); }
  },
  me(dt) {
    const S = RAID.st, o = ZM.near;
    S.myWind = cplHeld() && o && o.k === 'm4clock' && S.clock < 1 && !cpCineOn();
    if (S.myWind) { S.windAsk = (S.windAsk || 0) - dt; if (S.windAsk <= 0) { S.windAsk = 0.2; raidAsk('wind'); } } else S.windAsk = 0;
    // (on every screen) the clockwork's weights ratcheting up while anyone winds
    if (S.clSeen != null && S.clock > S.clSeen) try { sfxPlay('clockwind', { vol: 0.6, gap: 1.8 }); } catch (e) {}
    S.clSeen = S.clock;
    if (o && o.k === 'm4light' && cplHold('m4light', dt, 3.5)) raidAsk('light');
  },
  pack(o) { const S = RAID.st; o.m = [Math.round(S.s * 10) / 10, S.oil === 'carried' ? 2 : S.oil ? 1 : 0, S.wick === 'carried' ? 2 : S.wick ? 1 : 0, Math.round(S.clock * 100) / 100, S.lit, S.maren, Math.round(S.mk * 1000) / 1000]; o.c = S.carry; },
  apply(o) {
    const S = RAID.st, a = o.m; if (!Array.isArray(a)) return;
    S.s = +a[0] || 0; S.oil = a[1] === 2 ? 'carried' : a[1] ? 1 : 0; S.wick = a[2] === 2 ? 'carried' : a[2] ? 1 : 0; S.clock = +a[3] || 0; S.lit = a[4] | 0; S.maren = a[5] | 0; S.mk = +a[6] || 0;
    S.carry = o.c && typeof o.c === 'object' ? o.c : {};
  },
  consider(c) {
    const S = RAID.st, mine = cplCarryOf(FPS.me.id), X = FPSC.CX, Y = FPSC.CY, Z5 = ZMT.L[5];
    if (!mine && S.oil === 0) c({ k: 'm4oil', id: 'oil' }, X + M4D.OIL[0], Y + M4D.OIL[1], M4D.OIL[2], 2.6, false);
    if (!mine && S.wick === 0) c({ k: 'm4wick', id: 'wick' }, X + M4D.WICK[0], Y + M4D.WICK[1], M4D.WICK[2], 2.6, false);
    if (!mine && S.clock < 1) c({ k: 'm4clock', id: 'clock' }, X + M4D.CLOCK[0], Y + M4D.CLOCK[1], M4D.CLOCK[2], 2.6, false);
    if (mine === 'oil') c({ k: 'm4pour', id: 'pour' }, X + ZMT.X, Y + ZMT.Y, Z5, 3, false);
    if (mine === 'wick') c({ k: 'm4fit', id: 'fit' }, X + ZMT.X, Y + ZMT.Y, Z5, 3, false);
    if (!mine && S.oil === 1 && S.wick === 1 && S.clock >= 1 && !S.lit) c({ k: 'm4light', id: 'light' }, X + ZMT.X, Y + ZMT.Y, Z5, 3, false);
  },
  prompt(o) {
    if (o.k === 'm4oil') return { text: 'Draw a can of oil from the cask' };
    if (o.k === 'm4wick') return { text: 'Take a new wick' };
    if (o.k === 'm4clock') return { text: 'Hold to wind the clockwork', hold: true };
    if (o.k === 'm4pour') return { text: 'Pour the oil into the lamp' };
    if (o.k === 'm4fit') return { text: 'Fit the new wick' };
    if (o.k === 'm4light') return { text: 'Hold to light the lamp', hold: true };
    return null;
  },
  use(o) {
    if (o.k === 'm4oil') { raidAsk('oil'); return true; }
    if (o.k === 'm4wick') { raidAsk('wick'); return true; }
    if (o.k === 'm4pour') { raidAsk('pour'); return true; }
    if (o.k === 'm4fit') { raidAsk('fit'); return true; }
    return o.k === 'm4clock' || o.k === 'm4light';
  },
  hud(phone, mono, fell) {
    const S = RAID.st, done = (S.oil === 1) + (S.wick === 1) + (S.clock >= 1);
    cplBar(phone, mono, `THE LAMP · ${done} OF 3 READY${S.oil === 1 ? ' · OIL' : ''}${S.wick === 1 ? ' · WICK' : ''}${S.clock >= 1 ? ' · CLOCK' : ''}`, done / 3, 0, '#ffe0a0');
    if (S.clock > 0 && S.clock < 1) cplBar(phone, mono, 'WINDING THE CLOCKWORK', S.clock, 1, '#c8b890');
    cplHoldHud();
  },
  b3(grp) {
    const S = RAID.st;
    cplCarryBuild(grp);
    S.g3 = { brig: m4Gannet3d(grp), rocks: m4Rocks(grp), sleet: m4Sleet(grp), bell: m4Bell3d(grp, M4W.BELL[0], M4W.BELL[1], ZMT.L[5]), oil: cplCarryModel('oil'), wick: cplCarryModel('wick'), skiff: cplSkiff(), mlan: cplLantern(4) };
    grp.add(S.g3.oil, S.g3.wick, S.g3.skiff, S.g3.mlan);
    S.g3.oil.position.copy(z3v(FPSC.CX + M4D.OIL[0], FPSC.CY + M4D.OIL[1], FPSC.GROUND + M4D.OIL[2] + 0.25));
    S.g3.wick.position.copy(z3v(FPSC.CX + M4D.WICK[0], FPSC.CY + M4D.WICK[1], FPSC.GROUND + M4D.WICK[2] + 1.0));
    M3N.npc = []; m3People([['holm', M4C.holm, ZMT.X + 1.8, ZMT.Y - 1.6, -0.6, { z: ZMT.L[5], lan: true }]]);
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    const cine = cpCineOn();
    cplSky({ amb: 0.22, moon: 0.06, fog: [0.03, 0.04, 0.055], near: 25, far: 520 });
    cplLensSet(0, 1.2);
    const ov = cine && M4.ov;
    m4GannetPose(G.brig, ov && ov.s != null ? ov.s : S.s, ov ? 0.6 : 0, ov || {});
    m4SleetTick(G.sleet, 0.35, dt);
    G.oil.visible = S.oil === 0; G.wick.visible = S.wick === 0;
    // Maren's skiff, her lantern, going out across the water to the brig
    const show = S.maren && !cine && S.mk < 1;
    G.skiff.visible = G.mlan.visible = !!show;
    if (show) {
      const [gx, gy] = m4At(M4.STRIKE - 18), k = S.mk, x = 4 + (gx - 14 - 4) * k, y = -64 + (gy + 10 + 64) * k - Math.sin(k * Math.PI) * 30, h = Math.atan2(gx - 4, gy + 64);
      G.skiff.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 0.2 + Math.sin(g.t * 2) * 0.3)); G.skiff.rotation.set(Math.sin(g.t * 1.7) * 0.12, Math.PI / 2 - h, Math.sin(g.t * 2.1) * 0.1);
      G.mlan.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 1.4 + Math.sin(g.t * 2) * 0.3));
    }
    m3PeoplePose(dt);
    cplCarry3d();
  },
  exit: m4Exit,
  music() { return 'cpm04dark'; },
  mend: true,
});

// ---------- III. The Harbour Steps ----------
cpStage('m04dawn', {
  n: 'The Harbour Steps',
  map: M4MAP([-3, -15.5], 0),
  prep: m4Prep,
  set(H, K, Z) {},
  enter() {
    m4OpenAll();
    Object.assign(RAID.st, { rings: 0, swingT: 0, ph: 'bell', drift: 0, taken: 0, said: {}, t: 0 });
    if (ZM.net !== 'client') { cpObjective('Go out to the courtyard, and ring the fog bell for her'); cpWaypoint(M4E.BELL[0], M4E.BELL[1], 'The fog bell', 1.6); }
  },
  noGun: true,
  speedK() { return 0.8; },
  tick(dt) {
    const S = RAID.st;
    if (cpCineOn()) return;
    S.t += dt; S.swingT = Math.max(0, S.swingT - dt);
    if (S.ph === 'steps') {
      // the skiff drifting in on the flood, once someone's down at the steps
      if (S.drift > 0 || cplPeople().some(p => Math.hypot(p[1] - FPSC.CX - M4E.STEPS[0], p[2] - FPSC.CY - M4E.STEPS[1]) < 7)) S.drift = Math.min(1, S.drift + dt / 14);
      if (S.drift >= 1 && !S.said.sk) { S.said.sk = 1; cpSay('holm', 'That’s our skiff.', 'cp_m04_44'); }
    }
    if (S.ph === 'bell') { cpObjective(`Ring the fog bell for her · ${S.rings} of ${M4E.RINGS}`); cpWaypoint(M4E.BELL[0], M4E.BELL[1], 'The fog bell', 1.6); }
    else if (S.drift < 1) { cpObjective('Go down to the harbour steps'); cpWaypoint(M4E.STEPS[0], M4E.STEPS[1], 'The harbour steps', 1.0); }
    else { cpObjective('Take up the lantern'); cpWaypoint(M4E.SKIFF[0], M4E.SKIFF[1], 'The skiff', 0.8); }
    const say = (k, who, text, vo, ok) => { if (!S.said[k] && ok) { S.said[k] = 1; cpSay(who, text, vo); } };
    say('a', 'holm', 'Ring it. She always hears the bell. She’ll pull for it.', 'cp_m04_45', S.t > 3);
    say('b', 'holm', 'The Wrackhaven boats are out at the rocks. They’re picking up spars.', 'cp_m04_46', S.ph === 'steps' && S.t > 6);
  },
  q(sid, k) {
    const S = RAID.st, P = cplPeople().find(p => p[0] === sid); if (!P) return;
    const [, x, y] = P, near = (q, r) => Math.hypot(x - FPSC.CX - q[0], y - FPSC.CY - q[1]) < r;
    if (k === 'ring' && S.ph === 'bell' && S.swingT <= 0 && near(M4E.BELL, 2.8)) {
      S.rings++; S.swingT = 4; cpEvent('m4ring', S.rings);
      if (S.rings === 2) cpSay('holm', 'Again.', 'cp_m04_47');
      if (S.rings >= M4E.RINGS) { S.ph = 'steps'; cpSay('holm', 'Nothing. Only the gulls.', 'cp_m04_48'); }
    } else if (k === 'lantern' && S.ph === 'steps' && S.drift >= 1 && !S.taken && near(M4E.SKIFF, 3.4)) { S.taken = 1; cpObjective(''); cpWaypoint(null); cpDone(); }
  },
  me(dt) {},
  pack(o) { const S = RAID.st; o.m = [S.rings, Math.round(S.swingT * 10) / 10, S.ph, Math.round(S.drift * 100) / 100, S.taken]; },
  apply(o) { const S = RAID.st, a = o.m; if (!Array.isArray(a)) return; S.rings = a[0] | 0; S.swingT = +a[1] || 0; S.ph = String(a[2] || 'bell'); S.drift = +a[3] || 0; S.taken = a[4] | 0; },
  consider(c) {
    const S = RAID.st, X = FPSC.CX, Y = FPSC.CY;
    if (S.ph === 'bell') c({ k: 'm4ring', id: 'ring' }, X + M4E.BELL[0], Y + M4E.BELL[1], 0, 2.6, false);
    if (S.ph === 'steps' && S.drift >= 1 && !S.taken) c({ k: 'm4lan', id: 'lan' }, X + M4E.SKIFF[0], Y + M4E.SKIFF[1], ZMD.TOP, 3, false);
  },
  prompt(o) {
    const S = RAID.st;
    if (o.k === 'm4ring') return S.swingT > 0 ? { text: 'Let the bell swing still' } : { text: 'Ring the fog bell' };
    if (o.k === 'm4lan') return { text: 'Take up Maren’s lantern' };
    return null;
  },
  use(o) {
    if (o.k === 'm4ring') { raidAsk('ring'); return true; }
    if (o.k === 'm4lan') { raidAsk('lantern'); return true; }
    return false;
  },
  hud(phone, mono, fell) {},
  b3(grp) {
    const S = RAID.st;
    cplCarryBuild(grp);
    // the Gannet on the rocks: her hull broken, on her side, no masts
    const w = S.g3 = { wreck: cplBrig({ lights: false }), skiff: cplSkiff(), lan: cplLantern(2.4) };
    w.wreck.userData.sails.forEach(s => { s.visible = false; });
    w.wreck.children.forEach(c => { if (c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.height > 8) c.visible = false; });
    const [x, y, h] = m4At(M4.STRIKE); w.wreck.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 1.6)); w.wreck.rotation.order = 'YXZ'; w.wreck.rotation.set(0.5, Math.PI / 2 - h + 0.3, 0.12);
    grp.add(w.wreck, w.skiff, w.lan);
    // spars and wreckage in the harbour
    const wood = z3Lam('#3a2c20'), rr = seeded(0x51a2);
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3 + rr() * 6, 5), wood); m.rotation.set(Math.PI / 2, rr() * 3, 0); m.position.copy(z3v(FPSC.CX + 10 + rr() * 90, FPSC.CY - 50 - rr() * 40, FPSC.GROUND + 0.1)); grp.add(m); }
    M3N.npc = []; m3People([['holm', M4C.holm, 3.2, -36.2, Math.PI * 0.9]]);
  },
  f3(dt) {
    const S = RAID.st, G = S.g3; if (!G) return;
    cplSky({ amb: 0.62, moon: 0.34, ambC: [0.86, 0.9, 1], fog: [0.28, 0.3, 0.34], near: 40, far: 420 });
    cplLensSet(0, 2.4);
    // the skiff on the flood: in from the harbour mouth to the steps, the lantern lit in her
    const k = S.drift, x = M4E.SKIFF[0] + (1 - k) * 36, y = M4E.SKIFF[1] - (1 - k) * 34;
    G.skiff.visible = S.ph === 'steps' && !S.taken; G.lan.visible = G.skiff.visible;
    G.skiff.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND - 0.25 + Math.sin(g.t * 0.8) * 0.06)); G.skiff.rotation.set(Math.sin(g.t * 0.6) * 0.03, Math.PI / 2 + 0.4 - k * 0.4, 0);
    G.lan.position.copy(z3v(FPSC.CX + x, FPSC.CY + y, FPSC.GROUND + 0.42));
    // Holm: in the courtyard by the bell, then down at the steps
    const P = M3N.npc[0]; if (P) { if (S.ph === 'steps') { P.x = M4E.STEPS[0] - 0.4; P.y = M4E.STEPS[1] + 1.4; P.h = Math.PI * 1.1; P.z = 0.4; } }
    m3PeoplePose(dt);
    cplCarry3d();
  },
  exit: m4Exit,
  music() { return 'cpm04dawn'; },
  mend: true,
});
cpOn('m4ring', n => { try { if (!soundOff()) sfxBell(); } catch (e) {} fpsFeed(n >= M4E.RINGS ? 'The bell’s note goes out over the harbour. Nothing answers.' : 'The fog bell rings out over the harbour.'); });
