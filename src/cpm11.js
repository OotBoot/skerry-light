'use strict';
// The Chronicle of the Light, mission 11: Fog Run (autumn 1889, the outer rocks in the haar). The Fog-Keeper is putting
// out the lights of the outer rocks one by one. The cutter goes out to light them again, and finds him on Lantern Rock,
// six hundred years after mission 1 (src/cpm01.js, The First Fire) kept the first fire there. This file: the sail and
// Chapel Islet, and the mission. Lantern Rock and the Fog-Keeper are src/cpm11x.js; the cinematics src/cpm11y.js.
//
//  I.  The Haar (cp_m11sail): the keeper's cutter (src/gwsail.js, through its GWS_LEG hook, on a sea of this mission's
//      own: not Fog Run's chart) out from the foot of the Light into the haar, with two of the dark lights on the way:
//       - Signal Head: the headland's crags and its ruined round tower, its beacon cold on the cliff's edge. Bring her
//         in under it (within C11.SH_R of the beacon) and fire a flare from the locker aft into the basket: it catches.
//       - The Old Quays: a broken quay running out into the sea, its lamps on the stumps of its piers. Bring her close
//         along each (within C11.LAMP_R of her keel) with one of you up in the bows (alone: the helm's enough) and
//         the bows' lighting pole lights it. The stumps are rocks: touch one hard and it's a plank gone.
//      Then beach her on Chapel Islet (her mark on the strip shows the way to each in turn).
//  II. Chapel Islet (cp_m11chapel): the turf island, its roofless chapel and graveyard, its ring of standing stones
//      (FPS_ISLES.chapel and its own laying out, src/fpsisle.js), come at from the far shore. The candles on the altar
//      are out, and the wind comes over the islet in gusts. Carry a lit taper from the boat's lamp (Use) to the
//      altar, lighting the three lanterns on the way (the ring of stones, the graveyard gate, the chapel door: each,
//      once lit, a place to light the taper again). A gust is called a few seconds before it comes, and from which
//      side: be in the lee of something solid (a wall, a stone, a headstone) when it blows, or the taper goes out.
//      A blow from the drowned puts it out too. At the altar, hold Use to light the candles.
//  III. Lantern Rock (src/cpm11x.js): the Fog-Keeper.
// Together it's host-authoritative: the sail is the Gannet's Wake's own word (g* keys) and this stage's (m11s); the
// chapel's in m11c. Joined players ask (raidAsk 'taper', 'relay', 'candles', 'snuff').

cpCast('mate', { n: 'The Mate', c: '#c8d8b0' });
CP_MUSIC_FALL.cpm11sail = 'frsail'; CP_MUSIC_FALL.cpm11chapel = 'frpuzzle'; CP_MUSIC_FALL.cpm11boss = 'frboss'; CP_MUSIC_FALL.cpm11boss2 = 'frboss2'; CP_MUSIC_FALL.cpm11fire = 'gwcapt2';

const C11 = {
  FOG: 72, FOGC: '#27303a',
  SH: [-300, 470], SH_LAND: [[-300, 470, 92], [-250, 410, 52], [-262, 540, 56], [-330, 380, 60]], SHB: [-214, 478], SHB_Z: 24, SH_R: 125, SH_NEAR: 260,
  QUAY: [[70, 830], [96, 856], [124, 878], [150, 904], [178, 926]], LAMP_R: 9, BOW_V: 6,
  CHAPEL: [-70, 1260], CH_R: 40, CH_IN: 60,
};

// ---------- I. The Haar ----------
FPS_ISLES.cpm11sea = Object.assign({}, FPS_ISLES.gwsail, { name: 'the haar', fog: [C11.FOGC, 18, C11.FOG] });
FPI_GEN.cpm11sea = FPI_GEN.gwsail;
const C11S_MAP = Object.assign({}, GWS_MAP, { isle: 'cpm11sea' });
// the sea: the leg's rocks from its seed, kept off Signal Head and the quays, the quays' pier stumps (rocks), and the
// headland as land she runs up against
function c11Sea(L) {
  const sea = gwsLegSea(L), stumps = [];
  const clearOf = r => !C11.SH_LAND.some(([x, y, R]) => Math.hypot(r.x - x, r.y - y) < R + r.r + 22) && Math.hypot(r.x - C11.SHB[0] - 40, r.y - C11.SHB[1]) > 70 + r.r && !C11.QUAY.some(([x, y]) => Math.hypot(r.x - x, r.y - y) < 34 + r.r);
  sea.rocks = sea.rocks.filter(clearOf);
  const add = (x, y, r) => { const prof = []; for (let i = 0; i < 7; i++) prof.push(0.7 + 0.3 * ((i * 37) % 10) / 10); prof[0] = 0.4; prof[6] = 0.4; const o = { x, y, r, prof, ph: x * 0.1, seen: -99, lit: 0, i: sea.rocks.length, stump: true }; sea.rocks.push(o); return o; };
  // (each lamp stands on its stump, on the landward side of the line she's to run along; the quay's broken run of
  // stones between them, further in)
  C11.QUAY.forEach(([x, y], i) => { stumps.push(add(x + 6, y - 7, 2.6)); if (i < C11.QUAY.length - 1) { const [x2, y2] = C11.QUAY[i + 1]; add((x + x2) / 2 + 12, (y + y2) / 2 - 15, 3.4); } });
  for (const [x, y, r] of [[40, 880, 6], [210, 880, 5], [110, 960, 7], [200, 975, 6]]) add(x, y, r);
  sea.rocks.forEach((r, i) => { r.i = i; });
  sea.shore = C11.SH_LAND.map(([x, y, r]) => ({ x, y, r }));
  sea.stumps = stumps;
  return sea;
}
// the lamps' places: on their stumps
const c11Lamp = i => { const [x, y] = C11.QUAY[i]; return [x + 6, y - 7]; };
// (prep: every screen, before the world's laid out) the leg into GWS_LEG
function c11Leg() {
  GWS_LEG = { key: 'cp_m11sail', n: 1, seed: 0xc11f09, start: GWS.START.slice(), h0: -0.35, mark: C11.SHB.slice(), isleR: C11.CH_R, markIn: -1, rocks: 80, fog: C11.FOG, maren: false, plim: false,
    look: 'chapel', ground: FPS_ISLES.chapel.ground, ground2: FPS_ISLES.chapel.ground2, sea: null,
    landSay: 'She runs up on the shingle of Chapel Islet. Ashore!',
    line: (S, dm) => c11Line(S, dm), row: () => c11Row(), markLab: () => c11MarkLab(),
    arrive: () => cpDone(), b3: (SG, G) => c11Sea3dBuild(SG, G), f3: (dt, V) => c11Sea3d(dt, V) };
  GWS_LEG.sea = c11Sea(GWS_LEG);
}
// what's still to light, and where her mark points: Signal Head, then the quays, then the islet
function c11Next(S) { const W = S.m11; if (!W) return 'sh'; if (!W.sh) return 'sh'; if (W.q.some(v => !v)) return 'quay'; return 'chapel'; }
function c11Aim(S) {
  const nx = c11Next(S), L = GWS_LEG; if (!L) return;
  if (nx === 'sh') { L.mark = C11.SHB.slice(); L.markIn = -1; }
  else if (nx === 'quay') { const i = S.m11.q.findIndex(v => !v); L.mark = c11Lamp(i); L.markIn = -1; }
  else { L.mark = C11.CHAPEL.slice(); L.markIn = C11.CH_IN; }
}
function c11Line(S, dm) {
  if (S.ph === 'beach') return 'She’s run up on Chapel Islet. Ashore…';
  if (S.ph === 'sunk') return 'She’s going down.';
  const nx = c11Next(S), W = S.m11 || { q: [] };
  if (nx === 'sh') { const db = Math.hypot((S.V || S.B).x - C11.SHB[0], (S.V || S.B).y - C11.SHB[1]); return db < C11.SH_R ? 'Under Signal Head: fire a flare into its beacon (the locker aft)' : `Signal Head’s beacon is dark: get within ${C11.SH_R} m of it · ${Math.round(db)} m`; }
  if (nx === 'quay') return `The Old Quays: bring her close along each lamp, someone in the bows · ${W.q.filter(Boolean).length} of ${C11.QUAY.length} lit`;
  return `Beach her on Chapel Islet: ${Math.round(Math.max(0, dm - C11.CH_R)).toLocaleString('en')} m`;
}
function c11Row() { const S = RAID.st, W = S.m11 || { q: [], sh: 0 }; return ['LIGHTS', `SIGNAL HEAD ${W.sh ? '✓' : '·'}  QUAYS ${W.q.filter(Boolean).length}/${C11.QUAY.length}`, W.sh && W.q.every(Boolean) ? '#ffe2a8' : '#c8d4e0']; }
function c11MarkLab() { const S = RAID.st, nx = c11Next(S), V = S.V || S.B; if (!V) return ''; const M = gwsMark(); return `${nx === 'sh' ? 'SIGNAL HEAD' : nx === 'quay' ? 'QUAY LAMP' : 'CHAPEL ISLET'} ${Math.round(Math.hypot(M[0] - V.x, M[1] - V.y))} m`; }
// is someone up in the bows (or, alone, it's yours to do from the helm)
function c11Bow() { if (cpaN() <= 1) return true; return zmPlayers().some(p => p.y - FPSC.CY > C11.BOW_V); }
// (her keel, as a segment, and how near a point is to it)
function c11Keel(B, x, y) {
  const sx = Math.sin(B.h), sy = Math.cos(B.h), ax = B.x + sx * GWS.STERN, ay = B.y + sy * GWS.STERN, bx = B.x + sx * GWS.BOW, by = B.y + sy * GWS.BOW;
  const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(ax + dx * t - x, ay + dy * t - y);
}
cpStage('m11sail', Object.assign({}, RAID_STAGES.gwsail, {
  n: 'The Haar', map: C11S_MAP, gws: true,
  banner: () => ({ text: 'The Haar', t: 4.5, sub: 'Part I · Signal Head, the Old Quays, Chapel Islet', col: '#c8d4e0' }),
  music: () => 'cpm11sail',
  prep() { c11Leg(); },
  enter() {
    if (!GWS_LEG) c11Leg();
    RAID_STAGES.gwsail.enter();
    Object.assign(RAID.st, { m11: { sh: 0, q: C11.QUAY.map(() => 0), flSeen: 0, t: 0, sayN: 0 }, m11Seen: { sh: 0, q: 0 } });
    c11Aim(RAID.st);
    if (ZM.net !== 'client') { cpObjective(''); cpWaypoint(null); }
    fpsFeed('The keeper’s cutter, at the foot of the Light. Take the wheel (Use) and sail her out into the haar.');
    ZM.round = Math.max(ZM.round, 8);
  },
  tick(dt) {
    gwsTick(dt);
    const S = RAID.st, W = S.m11, B = S.B; if (!W || !B || S.ph === 'sunk') return;
    W.t += dt;
    if (W.t > 2) cpaOnce('s0', 'mate', 'Signal Head first. Then the old quays, then the chapel.', 'cp_m11_04');
    // Signal Head: a flare fired close enough under it
    const db = Math.hypot(B.x - C11.SHB[0], B.y - C11.SHB[1]);
    if (!W.sh && db < C11.SH_NEAR) cpaOnce('s1', 'mate', 'Signal Head, fine on the port bow. Her beacon’s cold.', 'cp_m11_05');
    if (!W.sh && db < C11.SH_R) cpaOnce('s2', 'mate', 'Close enough! A flare into the basket, from the locker aft.', 'cp_m11_06');
    if ((S.flN | 0) !== W.flSeen) {
      W.flSeen = S.flN | 0;
      if (!W.sh) {
        if (db < C11.SH_R) { W.sh = 1; cpaSay2('s3', 'mate', 'She’s caught! Signal Head is burning again.', 'cp_m11_07'); cpaBan('Signal Head is lit', 'its beacon answers the Light again', '#ffd88a'); c11Aim(S); c11Whisper(); }
        else cpaFeed(`Too far off: the flare fell short of Signal Head. Bring her within ${C11.SH_R} m of the beacon.`);
      }
    }
    // the quays: close along each lamp, with someone in the bows
    if (W.sh || db > 0) {
      const near = C11.QUAY.map((_, i) => c11Keel(B, ...c11Lamp(i)));
      if (near.some(d => d < 120)) cpaOnce('q0', 'mate', 'The old quays. Bring her close along the lamps, and someone up in the bows with the pole.', 'cp_m11_08');
      near.forEach((d, i) => { if (W.q[i] || d > C11.LAMP_R) return; if (c11Bow()) { W.q[i] = 1; cpaFeed(`A quay lamp lit (${W.q.filter(Boolean).length} of ${C11.QUAY.length}).`); c11Aim(S); if (W.q.every(Boolean)) { cpaSay2('q2', 'mate', 'That’s the last of the quay lamps. Steer for Chapel Islet.', 'cp_m11_09'); cpaBan('The Old Quays are lit', 'now beach her on Chapel Islet', '#ffd88a'); c11Whisper(); } } else if (!W.bowT || W.t - W.bowT > 6) { W.bowT = W.t; cpaFeed('Close enough, but nobody’s in the bows with the pole!'); } });
    }
  },
  pack(o) { gwsPack(o); const W = RAID.st.m11; if (W) o.m11s = [W.sh, W.q.join('')]; },
  apply(o) { gwsApply(o); const S = RAID.st, W = S.m11; if (W && Array.isArray(o.m11s)) { W.sh = o.m11s[0] | 0; W.q = String(o.m11s[1] || '').split('').map(Number); while (W.q.length < C11.QUAY.length) W.q.push(0); c11Aim(S); } },
  me(dt) {
    gwsMe(dt);
    const S = RAID.st, W = S.m11, Sn = S.m11Seen; if (!W) return;
    const nq = W.q.filter(Boolean).length;
    if (W.sh !== Sn.sh) { if (W.sh) c11Sound('catch', 0); Sn.sh = W.sh; }
    if (nq !== Sn.q) { if (nq > Sn.q) c11Sound('lamp', 0); Sn.q = nq; }
    // the bow: where the lighting pole is
    if (cpaN() > 1 && c11Next(S) === 'quay' && FPS.me.y - FPSC.CY > C11.BOW_V && !FPS.helm) S.m11Bow = 1; else S.m11Bow = 0;
  },
  hud(phone, mono, fell) {
    gwsHud(phone, mono, fell);
    const S = RAID.st; if (ZM.over || !S.m11) return;
    if (c11Next(S) === 'quay' && cpaN() > 1) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = S.m11Bow ? '#ffd88a' : 'rgba(236,228,207,0.6)'; ctx.fillText(S.m11Bow ? 'YOU’RE IN THE BOWS WITH THE LIGHTING POLE' : 'ONE OF YOU UP IN THE BOWS: THE LIGHTING POLE LIGHTS THE LAMPS AS SHE PASSES', cx, H - (phone ? 150 : 110), W - 40); ctx.textBaseline = 'alphabetic'; }
  },
  exit() { gwsExit(); GWS_LEG = null; cpaNightOff(); if (typeof GL3D !== 'undefined' && GL3D.scene) GL3D.scene.fog = null; },
}));
// a line said once (and its banner), as cpaOnce
function cpaSay2(k, who, text, vo) { cpaOnce(k, who, text, vo); }
// his whisper, the first time a light is lit again
function c11Whisper() { cpaOnce('fw', 'fog', 'Every light that is not mine…', 'cp_m11_10'); }
function c11Sound(k, d) {
  const v = clamp(1 - (d || 0) / 60, 0.15, 1), play = (n, vol) => { try { return typeof sfxPlay === 'function' && sfxPlay(n, { vol: vol * v, vary: 0.06 }); } catch (e) { return false; } };
  const syn = f => { try { if (!soundOff() && AUD.ctx) f(); } catch (e) {} };
  if (k === 'catch') { try { if (!soundOff() && typeof sfxFlare === 'function') sfxFlare(); } catch (e) {} syn(() => { for (const [f, dl] of [[392, 0], [523, 0.2], [659, 0.4]]) tone(f, 'sine', 0.02, 0.04, 1.6, { delay: dl }); }); return; }
  if (k === 'lamp') { syn(() => { noise('bandpass', 1200, 1, 0.01, 0.06, 0.4); tone(660, 'sine', 0.01, 0.03, 0.8); tone(880, 'sine', 0.01, 0.02, 0.8, { delay: 0.12 }); }); return; }
  if (k === 'gust') { play('stormwind', 0.7); syn(() => noise('bandpass', 500, 0.7, 0.6, 0.1, 1.6)); return; }
  if (k === 'warn') { play('wind', 0.6); syn(() => noise('lowpass', 400, 1, 1.2, 0.05, 1.8)); return; }
  if (k === 'snuff') { syn(() => { noise('highpass', 2600, 1, 0.005, 0.08, 0.3); tone(330, 'sine', 0.005, 0.03, 0.4, { to: 160 }); }); return; }
  if (k === 'taper') { syn(() => { noise('highpass', 1800, 1, 0.01, 0.06, 0.3); tone(440, 'triangle', 0.01, 0.02, 0.3, { to: 520 }); }); return; }
  if (k === 'candles') { try { if (!soundOff() && typeof sfxBell === 'function') sfxBell(); } catch (e) {} syn(() => { for (const [f, dl] of [[523, 0], [659, 0.25], [784, 0.5], [1046, 0.75]]) tone(f, 'sine', 0.02, 0.04, 2, { delay: dl }); }); return; }
}
// ---------- Signal Head, the quays and Chapel Islet out on the water (the sea's group) ----------
const C11S3 = {};
function c11Sea3dBuild(SG, G) {
  const lam = c => z3Lam(c), Q = C11S3, R = seeded(0x51a);
  Q.on = true;
  // Signal Head: heather over crags, a stair cut up the cliff, the ruined round tower on top, its beacon at the edge
  const SH = Q.sh = new THREE.Group(); SG.add(SH);
  for (const [x, y, r] of C11.SH_LAND) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r, 20, 18), lam('#4a463c')); m.position.set(x, 8, -y); SH.add(m);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.82, 1.2, 18), lam('#5e6a48')); top.position.set(x, 18.6, -y); SH.add(top);
    for (let i = 0; i < 10; i++) { const a = R() * 6.283, k = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + R() * 5, 0), lam('#3e3a32')); k.position.set(x + Math.cos(a) * r * 0.95, 2 + R() * 10, -(y + Math.sin(a) * r * 0.95)); k.rotation.set(R() * 3, R() * 3, R() * 3); SH.add(k); }
  }
  { const [bx, by] = C11.SHB, z = C11.SHB_Z;
    // the tower: a ring of broken wall, higher at the back
    for (let i = 0; i < 12; i++) { if (i === 3 || i === 4) continue; const a = i / 12 * 6.283, h = 4 + 5 * (0.5 + 0.5 * Math.cos(a)); const w = new THREE.Mesh(new THREE.BoxGeometry(2.1, h, 0.9), lam('#6a685e')); w.position.set(bx - 18 + Math.cos(a) * 4, z - 4.6 + h / 2, -(by + Math.sin(a) * 4)); w.rotation.y = -a + Math.PI / 2; SH.add(w); }
    // the stair, cut up the face
    for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1.6), lam('#5a564a')); s.position.set(bx + 4 - i * 0.2, 1 + i * 1.5, -(by - 20 + i * 1.4)); SH.add(s); }
    // the beacon: a cresset on an iron post at the cliff's edge
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4, 6), lam('#2e3034')); post.position.set(bx, z - 2.6, -by); SH.add(post);
    const cres = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.4, 8, 1, true), lam('#2e3034')); cres.rotation.x = Math.PI; cres.position.set(bx, z - 0.2, -by); SH.add(cres);
    Q.shFire = G.glowSp(0xffa050, 16, { opacity: 0 }); Q.shFire.position.set(bx, z + 1.4, -by); SH.add(Q.shFire);
    Q.shFire2 = G.glowSp(0xffe0a0, 5, { opacity: 0 }); Q.shFire2.position.set(bx, z + 0.6, -by); SH.add(Q.shFire2);
    Q.shL = new THREE.PointLight(0xffa050, 0, 140, 1.2); Q.shL.position.set(bx, z + 2, -by); SH.add(Q.shL);
    // the ring she must be inside to reach it with a flare: a faint ring on the water while it's dark
    Q.shRing = new THREE.Mesh(new THREE.RingGeometry(C11.SH_R - 1.5, C11.SH_R, 96), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    Q.shRing.rotation.x = -Math.PI / 2; Q.shRing.position.set(bx, 0.3, -by); SH.add(Q.shRing); }
  // the Old Quays: the lamps on their stumps (the stumps themselves are rocks), an iron post and a lamp-box each
  Q.lamps = C11.QUAY.map((_, i) => {
    const [x, y] = c11Lamp(i), g2 = new THREE.Group(); g2.position.set(x, 0, -y); SG.add(g2);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 6), lam('#2a2c30')); post.position.y = 4.5; g2.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), lam('#2a2c30')); arm.position.set(-0.7, 6.9, 0); g2.add(arm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshBasicMaterial({ color: 0x2a3036, transparent: true, opacity: 0.9 })); box.position.set(-1.4, 6.4, 0); g2.add(box);
    const glow = G.glowSp(0xffc070, 7, { opacity: 0 }); glow.position.set(-1.4, 6.4, 0); g2.add(glow);
    const cold = G.glowSp(0x9ab0c8, 3, { opacity: 0.35 }); cold.position.set(-1.4, 6.4, 0); g2.add(cold);
    return { g: g2, box, glow, cold };
  });
  // Chapel Islet, ahead in the haar: a hump of turf and its gable
  { const [mx, my] = C11.CHAPEL, I = Q.isle = new THREE.Group(); I.position.set(mx, 0, -my); SG.add(I);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10), lam('#4c6238')); mound.scale.set(C11.CH_R, 3.4, C11.CH_R); mound.position.y = -0.8; I.add(mound);
    const beach = new THREE.Mesh(new THREE.CylinderGeometry(C11.CH_R + 3, C11.CH_R + 6, 0.8, 32), lam('#34362e')); beach.position.y = -0.2; I.add(beach);
    const gab = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 0.9), lam('#6a685e')); gab.position.set(4, 5.5, -6); I.add(gab);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(14, 3.4, 0.8), lam('#6a685e')); w.position.set(-3, 3.5, -6 + s * 3.8); I.add(w); }
    Q.chGlow = G.glowSp(0x9ab0c8, 12, { opacity: 0 }); Q.chGlow.position.set(2, 5, -6); I.add(Q.chGlow); }
}
function c11Sea3d(dt, V) {
  const Q = C11S3, S = RAID.st, W = S.m11; if (!Q.on || !W) return;
  const t = g.t, fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 4.1);
  Q.shK = (Q.shK || 0) + ((W.sh ? 1 : 0) - (Q.shK || 0)) * Math.min(1, dt * 1.2);
  Q.shFire.material.opacity = 0.9 * Q.shK * fl; Q.shFire2.material.opacity = Q.shK * fl; Q.shL.intensity = 4 * Q.shK * fl; Q.shRing.material.opacity = W.sh ? 0 : 0.12 + 0.08 * Math.sin(t * 2);
  Q.lamps.forEach((L, i) => { const k = W.q[i] ? 1 : 0; L.k = (L.k || 0) + (k - (L.k || 0)) * Math.min(1, dt * 3); L.glow.material.opacity = 0.9 * L.k * fl; L.cold.material.opacity = 0.35 * (1 - L.k); L.box.material.color.setRGB(0.16 + 0.84 * L.k, 0.19 + 0.6 * L.k, 0.21 + 0.25 * L.k); });
  if (Q.chGlow) { const d = Math.hypot(C11.CHAPEL[0] - V.x, C11.CHAPEL[1] - V.y) - C11.CH_R; Q.chGlow.material.opacity = clamp(1.3 - d / 110, 0, 0.45) * (0.8 + 0.2 * Math.sin(t * 1.4)); }
  // the haar: as far as you see (a cinematic sees further), and a wall of it past that
  if (GL3D.scene && GL3D.scene.fog) { let far = C11.FOG; if (cpCineOn()) { const D = CPN.on, Sh = D.shots[CPN.shot] || {}; if (Sh.fogFar != null) far = Sh.fogFar; else if (D.fogFar != null) far = D.fogFar; } const F = GL3D.scene.fog; F.near = far * 0.25; F.far = far; frDome(far, C11.FOGC); }
}

// ---------- II. Chapel Islet ----------
const C11C = { R: 46, USE: 2.4, CANDLE: 5, GUST: [12, 16], WARN: 3.4, BLOW: 1.5, LEE: [0.6, 1.1, 1.7, 2.4] };
FPS_ISLES.cpm11chapel = Object.assign({}, FPS_ISLES.chapel, { name: 'Chapel Islet', rocks: [4, 2.5, 4.5, 0.7], fog: [C11.FOGC, 12, 70], tufts: ['#4e6a38', 160], birds: ['bat', 3] });
const C11C_MAP = { start: [0, -(C11C.R - 7)], top: 0, R: C11C.R, isle: 'cpm11chapel', seed: 0xc11c4, shore: () => -999, nav: [-C11C.R, C11C.R, -C11C.R, C11C.R], zones: { isle: { n: 'Chapel Islet', r: [-C11C.R, C11C.R, -C11C.R, C11C.R], sky: true } } };
FPI_GEN.cpm11chapel = {
  built: true,
  set(H) {
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }, { CX, CY, IR } = H;
    FPI_GEN.chapel.set(H);
    const alt = H.I.props.find(p => p.k === 'stone' && p.altar), ch = H.chapel || { cx: CX, cy: CY };
    const a = alt ? alt.ang - Math.PI / 2 : 0, c = Math.cos(a), s = Math.sin(a), L = (u, v) => [ch.cx + u * c - v * s, ch.cy + u * s + v * c];
    // (the altar's own lantern is the candles now: they're out)
    if (alt) { H.I.lights = H.I.lights.filter(l => l.p !== alt); alt.candle = false; }
    // the landing: on the far shore from the chapel
    const ca = Math.atan2(ch.cy - CY, ch.cx - CX) + Math.PI;
    let land = null;
    for (let k = 0; k < 24 && !land; k++) { const aa = ca + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2, [x, y] = H.polar(aa, IR - 7); if (H.clear(x, y, 3, 1)) land = [x, y, aa]; }
    if (!land) { const [x, y] = H.polar(ca, IR - 7); land = [x, y, ca]; }
    { const [bx, by] = H.polar(land[2] + 0.12, IR - 2.5); H.put('boat', bx, by, land[2] + Math.PI / 2 + 0.3, { len: 4.6, beam: 1.6, paint: '#34465a' }); }
    const [sx, sy] = H.polar(land[2] - 0.08, IR - 5.5); H.put('c11lamp', sx, sy, land[2], { src: true });
    // the ring of standing stones, halfway between the landing and the graveyard gate, and its lantern in the middle
    const gate = L(-17.5, 0), mid = [(land[0] + gate[0]) / 2, (land[1] + gate[1]) / 2];
    let ring = mid; for (let k = 0; k < 20; k++) { const p = [mid[0] + H.R(-6, 6), mid[1] + H.R(-6, 6)]; if (H.clear(p[0], p[1], 7.5, 1) && Math.hypot(p[0] - CX, p[1] - CY) < IR - 10) { ring = p; break; } }
    { const n = 7, a0 = H.R(0, H.TAU); for (let i = 0; i < n; i++) { const aa = a0 + i / n * H.TAU, x = ring[0] + Math.cos(aa) * 6.5, y = ring[1] + Math.sin(aa) * 6.5; if (H.clear(x, y, 0.6, 0.3)) H.put('stone', x, y, aa + Math.PI / 2, { w: H.R(1.1, 1.4), d: H.R(0.5, 0.65), hh: H.R(2.0, 2.8), lean: H.R(-0.06, 0.06) }); } }
    H.put('c11lamp', ring[0], ring[1], 0, {});
    const gl = L(-16.6, 2.2); H.put('c11lamp', gl[0], gl[1], a, {});
    const dl = L(-5.2, -2.3); H.put('c11lamp', dl[0], dl[1], a, {});
    H.track([[land[0], land[1]], ring, gate, L(-6.5, 0), L(3.6, 0)]);
    // cover between: a few headstones and stones about the open ground
    fpiScatter(H, 5, 0.6, 12, IR - 9, 3, (x, y) => H.put('stone', x, y, H.R(0, H.TAU), { w: H.R(0.9, 1.2), d: 0.5, hh: H.R(1.4, 2.2), lean: H.R(-0.1, 0.1) }, true));
    fpiScatter(H, 3, 0.6, 20, IR - 8, 3, (x, y) => H.put('tree', x, y, H.R(0, H.TAU), { hh: H.R(3.5, 5.5) }, true));
    fpiScatter(H, 3, 2.5, 20, IR - 6, 2.6, (x, y) => H.put('log', x, y, H.R(0, H.TAU), { len: H.R(2.4, 4), rad: H.R(0.2, 0.3) }, true));
    const W = v => [v[0] - CX, v[1] - CY];
    Z.c11 = { land: W(land), src: W([sx, sy]), relay: [W(ring), W(gl), W(dl)], altar: W(L(4.9, 0)), alt: W(L(3.6, 0)), a };
    ZMD.START = Z.c11.land.slice(); C11C_MAP.start = Z.c11.land.slice();
  },
  props(H) {},
  decor() {},
};
// a lantern on a post: an iron post, an arm, a glazed box (its flame is the stage's 3D). src: the boat's lamp
FPI_K.c11lamp = {
  col: FPI_C.iron,
  sol(p) { return [fpiCirc(p, 0, 0, 0.22, 2.2)]; },
  b3(p, A) {
    if (!p.src) A.cyl(FPI_C.stone3, 0, 0, 0, 0.5, 0.5, 0, 0, 0, 'cyl8');
    A.cyl(FPI_C.iron, 0, 0, 0, 0.08, 2.3, 0, 0, 0, 'cyl6');
    A.box(FPI_C.iron, 0.3, 0, 2.25, 0.7, 0.07, 0.07);
    A.box('#3a3428', 0.6, 0, 1.75, 0.34, 0.34, 0.45);
    A.part('cone', FPI_C.iron, 0.6, 0, 2.28, 0.4, 0.2, 0.4);
  },
};
const c11cZ = () => FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.c11;
// a lantern's flame, in the world (its box hangs off the post's arm)
function c11cLampAt(p, a) { const [x, y] = cpaW(p); return [x + Math.cos(a || 0) * 0.6, y + Math.sin(a || 0) * 0.6]; }
// (hosting) is someone sheltered from a gust from the bearing `from` (something solid between them and it)
function c11cLee(x, y, from) {
  const sx = Math.sin(from), sy = Math.cos(from);
  for (const d of C11C.LEE) { const px = x + sx * d, py = y + sy * d; if (Math.hypot(px - FPSC.CX, py - FPSC.CY) > FPSC.R - 1.6) return false; if (zmBlockedAt(px, py, 0.08, 0)) return true; }
  return false;
}
cpStage('m11chapel', {
  n: 'Chapel Islet', map: C11C_MAP, mend: true, open: true,
  banner: () => ({ text: 'Chapel Islet', t: 4.5, sub: 'Part II · the candles on the altar', col: '#c8d4e0' }),
  music: () => 'cpm11chapel',
  enter() {
    Object.assign(RAID.st, { c: { taper: '', relay: [0, 0, 0], cand: 0, done: 0, gph: 'calm', gT: 14, gDir: 0, gN: 0, snuffN: 0, lee: 1 }, cSeen: { gN: 0, gph: 'calm', snuffN: 0, relay: 0, taper: '' }, spT: 6, t: 0, pend: 0, useT: 0, hp0: FPS.me.hp });
    ZM.round = Math.max(ZM.round, 9);
    if (ZM.net !== 'client') { cpObjective('Take a lit taper from the boat’s lamp'); const Z = c11cZ(); if (Z) cpWaypoint(Z.src[0], Z.src[1], 'The boat’s lamp', 1.8); }
  },
  tick(dt) {
    const S = RAID.st, C = S.c, Z = c11cZ(), n = cpaN(); if (!Z) return;
    if (C.done) { if (C.doneT > 0) { C.doneT -= dt; if (C.doneT <= 0) cpDone(); } return; }
    S.t += dt;
    // the taper: dropped if its holder's down or gone
    if (C.taper && (!cpaUp(C.taper) || (C.taper !== FPS.me.id && !(ZM.hum || []).some(h => h[0] === C.taper)))) { C.taper = ''; C.snuffN++; cpaFeed('The taper fell and went out.'); }
    // the gusts: called, then they blow; a taper in the open goes out
    C.gT -= dt;
    if (C.gph === 'calm' && C.gT <= C11C.WARN) { C.gph = 'warn'; C.gDir = Math.random() * Math.PI * 2; C.gN++; if (C.taper) cpaOnce('g1', 'mate', 'Here comes a gust! Get behind something!', 'cp_m11_14'); }
    if (C.gph === 'warn' && C.gT <= 0) { C.gph = 'blow'; C.gT = C11C.BLOW; }
    if (C.gph === 'blow') {
      if (C.taper) { const p = cpaAt(C.taper); if (p) { C.lee = c11cLee(p.x, p.y, C.gDir) ? 1 : 0; if (!C.lee) { C.taper = ''; C.snuffN++; cpaFeed('The gust caught the taper in the open and blew it out.'); cpaOnce('g2', 'mate', 'Taper’s out. Back to the last lantern and light it again.', 'cp_m11_15'); } } }
      if (C.gT <= 0) { C.gph = 'calm'; C.gT = (C11C.GUST[0] + Math.random() * (C11C.GUST[1] - C11C.GUST[0])) * (1 - 0.25 * Math.min(1, S.t / 200)); }
    } else if (C.taper) { const p = cpaAt(C.taper); if (p) C.lee = c11cLee(p.x, p.y, C.gDir) ? 1 : 0; }
    // the drowned, up out of the shore, more as it goes on
    S.spT -= dt;
    if (S.spT <= 0) { S.spT = (6 - 2 * Math.min(1, S.t / 150)) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (n - 1)); if (ZM.z.filter(z => !z.dead).length < 2 + 2 * n) c11cSpawn({ kind: cpaKind(0.12), hp: cpaHp(3) }); }
    // what's next, and where
    const nx = C.relay.findIndex(v => !v);
    if (!C.taper) { const src = c11cSrcNear(); cpObjective(C.snuffN ? 'The taper’s out: light it again at the boat’s lamp or a lit lantern' : 'Take a lit taper from the boat’s lamp'); cpWaypoint(src[0], src[1], src[2], 1.8); }
    else if (nx >= 0) { cpObjective(['Carry the taper to the lantern in the ring of stones', 'Carry the taper to the lantern at the graveyard gate', 'Carry the taper to the lantern in the chapel door'][nx]); cpWaypoint(Z.relay[nx][0], Z.relay[nx][1], ['The ring of stones', 'The graveyard gate', 'The chapel door'][nx], 1.8); }
    else { cpObjective('Light the candles on the altar (hold Use)'); cpWaypoint(Z.altar[0], Z.altar[1], 'The altar', 1.2); cpaOnce('a1', 'mate', 'Into the chapel. The candles on the altar.', 'cp_m11_17'); }
  },
  q(sid, k, a) {
    const S = RAID.st, C = S.c, Z = c11cZ(); if (!Z || C.done) return;
    if (k === 'taper') { if (!C.taper && cpaUp(sid)) { C.taper = sid; cpaFeed(`${cpaNick(sid)} has the taper, lit.`); if (C.relay[0] === 0) cpaOnce('t1', 'mate', 'Keep it in the lee of the walls and stones. The gusts will have it otherwise.', 'cp_m11_13'); } }
    else if (k === 'relay') { const i = a | 0, nx = C.relay.findIndex(v => !v); if (C.taper === sid && i === nx) { C.relay[i] = 1; cpaFeed(`${cpaNick(sid)} lit the lantern ${['in the ring of stones', 'at the graveyard gate', 'in the chapel door'][i]}.`); if (i === 0) cpaOnce('r1', 'mate', 'That lantern will hold. If the taper goes out, light it again from there.', 'cp_m11_16'); } }
    else if (k === 'candles') { if (C.taper === sid && C.relay.every(Boolean)) { C.cand = 1; C.done = 1; C.doneT = 0.8; C.taper = ''; cpObjective(''); cpWaypoint(null); for (const z of ZM.z) if (!z.dead) zmKill(z, false, '', 'flash'); } }
    else if (k === 'snuff') { if (C.taper === sid) { C.taper = ''; C.snuffN++; cpaFeed(`${cpaNick(sid)} was struck, and the taper went out.`); } }
  },
  pack(o) { const C = RAID.st.c; o.m11c = [C.taper, C.relay.join(''), C.cand, C.gph, Math.round(C.gT * 10), Math.round(C.gDir * 100), C.gN, C.snuffN, C.lee, C.done]; },
  apply(o) {
    const S = RAID.st, C = S.c, a = o.m11c; if (!Array.isArray(a)) return;
    if (!(S.pend > 0)) C.taper = String(a[0] || '');
    C.relay = String(a[1] || '000').split('').map(Number); C.cand = a[2] | 0; C.gph = String(a[3] || 'calm'); C.gT = (+a[4] || 0) / 10; C.gDir = (+a[5] || 0) / 100; C.gN = a[6] | 0; C.snuffN = a[7] | 0; C.lee = a[8] | 0; C.done = a[9] | 0;
  },
  me(dt) {
    const S = RAID.st, C = S.c, Sn = S.cSeen, m = FPS.me, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over && !cpCineOn();
    if (S.pend > 0) S.pend -= dt;
    if (ZM.net === 'client' && C.gT > 0) C.gT = Math.max(0, C.gT - dt);
    // struck while I hold it: it goes out
    if (C.taper === m.id && m.hp < S.hp0 - 0.01) { raidAsk('snuff'); if (ZM.net === 'client') { C.taper = ''; S.pend = 0.8; } }
    S.hp0 = m.hp;
    if (C.gN !== Sn.gN) { Sn.gN = C.gN; c11Sound('warn', 0); }
    if (C.gph !== Sn.gph) { if (C.gph === 'blow') c11Sound('gust', 0); Sn.gph = C.gph; }
    if (C.snuffN !== Sn.snuffN) { if (C.snuffN > Sn.snuffN) c11Sound('snuff', 0); Sn.snuffN = C.snuffN; }
    const nr = C.relay.filter(Boolean).length; if (nr !== Sn.relay) { if (nr > Sn.relay) c11Sound('lamp', 0); Sn.relay = nr; }
    if (C.taper !== Sn.taper) { if (C.taper) c11Sound('taper', 0); Sn.taper = C.taper; }
    // the gust: mist streaming across, and pushing a little
    if (C.gph === 'blow' && !reduceMotion) { const sx = -Math.sin(C.gDir), sy = -Math.cos(C.gDir); for (let i = 0; i < 3; i++) { const ox = (Math.random() - 0.5) * 30, oy = (Math.random() - 0.5) * 30; FPS.parts.push({ x: m.x + ox - sx * 10, y: m.y + oy - sy * 10, z: FPSC.GROUND + 0.3 + Math.random() * 2.5, vx: sx * 16, vy: sy * 16, vz: 0, t: 1.2, c: '170,180,190' }); } }
    // hold Use at the altar with the taper
    const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
    if (hold && o && o.k === 'c11alt' && alive && !(S.pend > 0) && C.taper === m.id) { S.useT += dt; if (S.useT >= C11C.CANDLE) { S.useT = 0; S.pend = 1.5; raidAsk('candles'); } } else S.useT = 0;
  },
  consider(c) {
    const S = RAID.st, C = S.c, Z = c11cZ(), m = FPS.me, mz = m.jz || 0; if (!Z || C.done) return;
    const mine = C.taper === m.id;
    if (!C.taper) { const [x, y] = cpaW(Z.src); c({ k: 'c11src', i: -1 }, x, y, mz, 2.2, false); C.relay.forEach((v, i) => { if (v) { const [x2, y2] = cpaW(Z.relay[i]); c({ k: 'c11src', i }, x2, y2, mz, 2.2, false); } }); }
    if (mine) { const nx = C.relay.findIndex(v => !v); if (nx >= 0) { const [x, y] = cpaW(Z.relay[nx]); c({ k: 'c11relay', i: nx }, x, y, mz, 2.2, false); } else { const [x, y] = cpaW(Z.altar); c({ k: 'c11alt' }, x, y, mz, 2.6, false); } }
  },
  prompt(o) {
    if (o.k === 'c11src') return { text: o.i < 0 ? 'Light a taper at the boat’s lamp' : 'Light the taper again at this lantern', free: true };
    if (o.k === 'c11relay') return { text: 'Light the lantern with the taper', free: true };
    if (o.k === 'c11alt') return { text: 'Hold to light the altar candles', hold: true };
    return null;
  },
  use(o) {
    const S = RAID.st, C = S.c;
    if (o.k === 'c11src') { if (C.taper) { zmSound('no'); return true; } raidAsk('taper'); if (ZM.net === 'client') { C.taper = FPS.me.id; S.pend = 0.9; } return true; }
    if (o.k === 'c11relay') { raidAsk('relay', o.i); if (ZM.net === 'client') { C.relay[o.i] = 1; S.pend = 0.9; } return true; }
    if (o.k === 'c11alt') return true;
    return false;
  },
  players(P) { return P; },
  hud(phone, mono, fell) { c11cHud(phone, mono, fell); },
  b3(grp) { c11c3dBuild(grp); },
  f3(dt) { c11c3d(dt); },
  exit() { C11C3.on = false; cpaNightOff(); },
});
{ const g0 = fbNoGun; fbNoGun = function () { return g0() || (CP.on && RAID.on && RAID.st && RAID.st.c && RAID.st.c.taper === FPS.me.id && RAID_ORDER[RAID.stage] === 'cp_m11chapel'); }; }
// the nearest place to light the taper: the boat's lamp, or a lit lantern
function c11cSrcNear() {
  const C = RAID.st.c, Z = c11cZ(), m = FPS.me; let best = [Z.src[0], Z.src[1], 'The boat’s lamp'], bd = Math.hypot(FPSC.CX + Z.src[0] - m.x, FPSC.CY + Z.src[1] - m.y);
  C.relay.forEach((v, i) => { if (!v) return; const d = Math.hypot(FPSC.CX + Z.relay[i][0] - m.x, FPSC.CY + Z.relay[i][1] - m.y); if (d < bd) { bd = d; best = [Z.relay[i][0], Z.relay[i][1], 'A lit lantern']; } });
  return best;
}
function c11cSpawn(o) {
  const P = ZM.players || [];
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * 6.283, d = C11C.R - 3 - Math.random() * 5, x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (P.some(p => Math.hypot(p.x - x, p.y - y) < 12)) continue;
    if (zmBlockedAt(x, y, 0.5, 0)) continue;
    return raidSpawnAt(x, y, o);
  }
  return null;
}
function c11cHud(phone, mono, fell) {
  const S = RAID.st, C = S.c; if (!C || ZM.over || C.done) return;
  const m = FPS.me, t = g.t, L = Math.max(14, FPS.safeLeft || 0), mine = C.taper === m.id;
  let y = fpsHudTop() + (phone ? 68 : 92);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 12);
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(L - 4, y - 4, phone ? 200 : 300, phone ? 50 : 62);
  ctx.fillStyle = C.taper ? '#ffd88a' : 'rgba(236,228,207,0.6)'; ctx.fillText(C.taper ? `THE TAPER: LIT · ${mine ? 'YOU CARRY IT' : cpaNick(C.taper).toUpperCase() + ' CARRIES IT'}` : 'THE TAPER: OUT', L, y); y += phone ? 14 : 18;
  ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText(`LANTERNS ${C.relay.map(v => v ? '●' : '○').join(' ')}  ·  CANDLES ${C.cand ? '●' : '○'}`, L, y); y += phone ? 14 : 18;
  const gs = C.gph === 'warn' ? `A GUST IN ${Math.max(0, C.gT).toFixed(1)} S` : C.gph === 'blow' ? 'THE GUST IS BLOWING' : 'THE WIND: BETWEEN GUSTS';
  ctx.fillStyle = C.gph === 'calm' ? 'rgba(200,212,224,0.6)' : `rgba(255,190,140,${0.75 + 0.25 * Math.sin(t * 9)})`; ctx.fillText(gs, L, y); y += phone ? 14 : 18;
  fpsHudNote(y + 4);
  // the gust coming: which side, round the sights, and whether you're in the lee
  if (C.gph !== 'calm') {
    const rel = angDiff(C.gDir, m.h), R0 = phone ? 70 : 96, ax = cx + Math.sin(rel) * R0, ay = H / 2 - Math.cos(rel) * R0;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(rel + Math.PI); ctx.fillStyle = `rgba(220,230,240,${0.7 + 0.3 * Math.sin(t * 10)})`;
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(10, 6); ctx.lineTo(0, 1); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    if (mine) {
      ctx.textAlign = 'center'; ctx.font = fell(phone ? 17 : 24); ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
      ctx.fillStyle = C.lee ? 'rgba(170,230,170,0.95)' : `rgba(255,170,130,${0.8 + 0.2 * Math.sin(t * 10)})`;
      ctx.fillText(C.lee ? 'In the lee: the taper is sheltered' : 'In the open! Put something solid between you and the wind', cx, H * 0.36, W * 0.9);
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 10 : 12);
  if (mine) { ctx.fillStyle = '#ffd88a'; ctx.fillText('YOU CARRY THE LIT TAPER · NO GUN · A BLOW OR A GUST IN THE OPEN PUTS IT OUT', cx, H - (phone ? 150 : 110), W - 40); }
  if (S.useT > 0) {
    const k = Math.min(1, S.useT / C11C.CANDLE);
    ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
// in 3D: the lanterns' flames, the candles, the taper (in your hand, or a glow on whoever carries it)
const C11C3 = {};
function c11c3dBuild(grp) {
  const Z = c11cZ(); if (!Z) return;
  const Q = C11C3, G0 = FPSC.GROUND; Q.on = true; Q.grp = grp;
  const soft = Q.soft || (Q.soft = z3Soft('rgba(255,220,150,0.95)', 'rgba(255,160,80,0)'));
  const spr = (op, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); grp.add(sp); return sp; };
  const at = (p, a, z) => { const [x, y] = c11cLampAt(p, a); return z3v(x, y, G0 + fpsIsleH(FPS.g.isle, x, y) + z); };
  Q.src = spr(0.9, 1.2); Q.src.position.copy(at(Z.src, Math.atan2(Z.land[1], Z.land[0]), 1.95));
  Q.srcL = new THREE.PointLight(0xffc070, 1.2, 12, 1.4); Q.srcL.position.copy(Q.src.position); grp.add(Q.srcL);
  Q.relay = Z.relay.map((p, i) => { const s = spr(0, 1.3); s.position.copy(at(p, i ? Z.a : 0, 1.95)); const L = new THREE.PointLight(0xffc070, 0, 14, 1.4); L.position.copy(s.position); grp.add(L); return { s, L }; });
  // the candles: seven on the altar
  Q.cand = []; { const [ax, ay] = cpaW(Z.altar), c = Math.cos(Z.a + Math.PI / 2), s = Math.sin(Z.a + Math.PI / 2);
    for (let i = 0; i < 7; i++) { const u = (i - 3) * 0.22, x = ax + c * u, y = ay + s * u, z = G0 + fpsIsleH(FPS.g.isle, ax, ay) + 1.05; const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.2 + (i % 3) * 0.06, 6), z3Lam('#e8e0c8')); wax.position.copy(z3v(x, y, z)); grp.add(wax); const f = spr(0, 0.25); f.position.copy(z3v(x, y, z + 0.18 + (i % 3) * 0.03)); Q.cand.push(f); }
    Q.candL = new THREE.PointLight(0xffd090, 0, 16, 1.3); Q.candL.position.copy(z3v(ax, ay, G0 + 1.8)); grp.add(Q.candL); }
  // the taper in my hand, and on others
  { const T = Q.taper = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), z3Lam('#e8e0c8')); T.add(st); const f = Q.taperF = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); f.position.y = 0.2; f.scale.set(0.08, 0.14, 1); T.add(f); T.visible = false; grp.add(T);
    Q.taperL = new THREE.PointLight(0xffc070, 0, 7, 1.4); grp.add(Q.taperL); Q.theirs = spr(0, 0.5); }
}
function c11c3d(dt) {
  const Q = C11C3, S = RAID.st, C = S.c; if (!Q.on || !C) return;
  const t = g.t, fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 15) * Math.sin(t * 4.3), G0 = FPSC.GROUND, m = FPS.me;
  Q.src.material.opacity = 0.9 * fl;
  Q.relay.forEach((R, i) => { R.k = (R.k || 0) + ((C.relay[i] ? 1 : 0) - (R.k || 0)) * Math.min(1, dt * 3); R.s.material.opacity = 0.9 * R.k * fl; R.L.intensity = 1.6 * R.k * fl; });
  Q.ck = (Q.ck || 0) + ((C.cand ? 1 : 0) - (Q.ck || 0)) * Math.min(1, dt * 1.5);
  Q.cand.forEach((f, i) => { f.material.opacity = Q.ck * (0.8 + 0.2 * Math.sin(t * 11 + i)); }); Q.candL.intensity = 2.4 * Q.ck * fl;
  const mine = C.taper === m.id, show = mine && !(m.dead > 0) && !zmIsDown() && !fpsThird() && !cpCineOn();
  Q.taper.visible = show; Q.taperL.intensity = mine && !(m.dead > 0) ? 1.1 * fl : 0;
  const h = m.h, p = m.p, ez = G0 + FPSC.EYE + (m.jz || 0) - (FPS.crouchEye || 0), fx = Math.sin(h), fy = Math.cos(h), cp = Math.cos(p), sp = Math.sin(p);
  const F = [fx * cp, fy * cp, sp], Rt = [fy, -fx, 0], U = [-fx * sp, -fy * sp, cp], at = (f, r, u) => z3v(m.x + F[0] * f + Rt[0] * r + U[0] * u, m.y + F[1] * f + Rt[1] * r + U[1] * u, ez + F[2] * f + U[2] * u);
  const Cm = GL3D.camera, D = 0.9, hh = D * Math.tan((Cm.fov || 50) * Math.PI / 360), sc = hh / 0.345 * 0.6;
  if (show) { Q.taper.scale.setScalar(sc); Q.taper.position.copy(at(D, 0.12 * sc, -hh + 0.14 * sc)); Q.taper.rotation.set(0, -h, 0); Q.taper.rotateX(-p * 0.6); Q.taperF.scale.set(0.08 * fl, 0.15 * (2 - fl), 1); }
  Q.taperL.position.copy(z3v(m.x + fx * 0.5, m.y + fy * 0.5, ez - 0.3));
  const r = !mine && C.taper ? FPS.remote.get(C.taper) : null;
  Q.theirs.material.opacity = r && r.x != null ? 0.9 * fl : 0; if (r && r.x != null) Q.theirs.position.copy(z3v(r.x + Math.sin(r.h || 0) * 0.4, r.y + Math.cos(r.h || 0) * 0.4, G0 + (r.jz || 0) + 1.3));
  cpaNight(66, C11.FOGC, 0.3, dt);
}

// ---------- the mission ----------
cpMission({ id: 'm11', act: 4, n: 'Fog Run', when: 'Autumn 1889', where: 'The outer rocks, in the haar',
  blurb: "Something in the haar is putting out the lights of the outer rocks. Light them again, and find what's doing it on Lantern Rock.",
  stages: ['cp_m11sail', 'cp_m11chapel', 'cp_m11rock'], intro: 'm11_intro', outro: 'm11_outro', cut: { 1: 'm11_chapel', 2: 'm11_rock' }, after: { 1: 'm11_candles' },
  music: { default: 'cpm11sail' }, lives: 1,
  stop() { cpaNightOff(); GWS_LEG = null; },
});
