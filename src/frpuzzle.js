// Fog Run: the Puzzle islands (RAID_STAGES.fr_puzzle, a lens on the chart), built on friStage (src/frisle.js) with
// four rules, FRP_RULES, one drawn per island. No fight unless you get it wrong; each is 60 to 90 seconds' work, made
// for two to four of you together but each can be done alone. The island's beacon stays dark (RAID.st.ph 'dark')
// until it's solved; then it's lit (ph 'lit', frIsleLit), and FRI.AWAY seconds later you're back aboard
// (frIslandDone), as Hold the Light.
//  - Bend the Beam (beam): a lamp on a pillar at the island's edge (the Light's beam from the cliff) throws its beam
//    inland, and three mirror posts (four out past the Near Skerries) stand between it and the beacon. Each post sends
//    the beam on along the way its head faces; Use turns the head a step (45 degrees). Carry the beam post to post to
//    the beacon and it catches. The beam stops at the first post it reaches, or at anything solid, or runs off into
//    the fog. The posts are laid out backwards from the beacon (so there's always a way), and their heads start
//    turned wrong, from the island's seed. Each minute you take, a few of the drowned come up.
//  - Knock's Garden (knock): a field of carved figureheads on plinths between the landing and the beacon. Each moves
//    only while none of you can see it (the Knock rule: inside someone's view, FRP.KN_FOV across for the others and
//    your own screen for you, near enough to make out in the fog, and with nothing solid between). Unwatched, it
//    comes for the nearest of you, knocking as it goes; if it reaches you it knocks you flat (FRP.KN_HURT) and stands
//    a while. Reach the beacon and hold Use at it (FRP.USE s) to light it.
//  - The Bell Buoys (bells): four bells on posts round the island (five past the Near Skerries), each with its own
//    note. A fog horn sounds a tune of three, four or five notes (by the reach); ring the bells (Use) in its order.
//    A wrong note wakes some of the drowned and the tune starts again; the horn post by the landing sounds it again
//    on Use. With the sound off the tune is shown in the bells' colours instead.
//  - The Tide Stones (tide): the beacon stands on a rock cut off by the tide (a ring of water, blocked). Four stones
//    are set in the ground round the island; stand on them all at once and the causeway rises out of the water to
//    the beacon; then light it (hold Use, FRP.USE s). A stone stays down a while after you step off (FRP.HOLDT, by
//    how many of you there are: long enough alone to run round all four). Each minute you take, a few drowned come up.
// Each rule lays out its own things in set (H.R: the same on every screen) into FRP_L, and keeps the look's props off
// them with flat solids that are taken out again once the island's laid out (frpKeep, frpUnkeep).
// Together it's host-authoritative, as the Fight: the host runs every puzzle's state and the drowned, and sends them
// in the stage's word: fpq (lit, the time to go back aboard, the clock), fpy (a line for everyone), and one key per
// rule: fpb (the posts' turns), fpk (the figureheads, and who was last knocked down), fpl (the bells: how many rung
// right, the horn, the last bell rung), fpt (the stones' timers, who's on them, the causeway). A joined player asks
// the host with raidAsk: 'turn' (a post, by number), 'ring' (a bell, by number), 'horn' (sound the tune again) and
// 'light' (the beacon, in Knock's Garden and the Tide Stones).

const FRP = {
  USE: 3, MIN: 60, POST_R: 2.4, HIT: 0.65, BEA_HIT: 1.3, POST_Z: 1.45, LAMP_Z: 1.75,
  KN_SP: 2.4, KN_REACH: 1.15, KN_FOV: 1.05, KN_VFOV: 0.75, KN_SEE: 48, KN_REST: 4, KN_HURT: 2, KN_PAD: 0.45,
  BELL_R: 2.4, NOTE: 1.8, PENT: [0, 2, 4, 7, 9], BCOL: ['#e0704a', '#e8c64e', '#5aa4e0', '#6cc47a', '#b884e0'], BNAME: ['red', 'yellow', 'blue', 'green', 'violet'],
  PLATE_R: 1.35, HOLDT: [16, 9, 6, 4], MOAT: [3.3, 7.0],
};
// this island's puzzle as laid out (set, the same on every screen)
var FRP_L = { kind: '' };
// (the figurehead being moved, so it doesn't stand in its own way)
var FRP_MV = null;
const frpU = d => [Math.sin(d * Math.PI / 4), Math.cos(d * Math.PI / 4)];
const frpGz = (x, y) => FPSC.GROUND + fpsIsleH(FPS.g && FPS.g.isle, x, y);
// who did it, for a line everyone sees (alone: you)
const frpWho = sid => !ZM.net ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
const frpN = () => Math.max(1, (ZM.hum || []).length);
const frpAlive = () => !(FPS.me.dead > 0) && !zmIsDown() && !ZM.over && !ZM.ghost;
const frpHeld = () => FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;

// ---------- laying out: keeping the look's props off the puzzle ----------
// flat solids no higher than the ground (nothing walks into them) that H.spot and H.clear see, so nothing's put there;
// taken out once the island's laid out (frpUnkeep, from enter)
function frpKeep(H, s) { H.I.solids.push(Object.assign({ z1: FPSC.GROUND + 0.01, ray: false, occ: false, frpTmp: 1, p: null }, s)); }
function frpKeepLine(H, a, b, hd) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L > 0.1) frpKeep(H, { s: 'b', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ang: Math.atan2(dy, dx), hw: L / 2, hd, br: Math.hypot(L / 2, hd) }); }
function frpKeepCirc(H, x, y, r) { frpKeep(H, { s: 'c', x, y, ang: 0, r, br: r }); }
function frpUnkeep() { const I = FPS.g && FPS.g.isle; if (!I) return; for (let i = I.solids.length - 1; i >= 0; i--) if (I.solids[i].frpTmp) I.solids.splice(i, 1); }
const frpFr = Z => { const F = Z.fr, X = FPSC.CX, Y = FPSC.CY; return { F, B: [X + F.bea[0], Y + F.bea[1]], L: [X + F.land[0], Y + F.land[1]] }; };

// ---------- what every puzzle does alike ----------
function frpEnter(o) { Object.assign(RAID.st, { ph: 'dark', t: 0, awayT: 0, spN: 0, useT: 0, pend: 0, say: [0, '', 0], seenSay: 0, phSeen: 'dark' }, o || {}); frpUnkeep(); }
// (hosting or alone) solved: the beacon's lit
function frpSolve(text) { const S = RAID.st; if (S.ph === 'lit') return; S.ph = 'lit'; S.awayT = 0; frIsleLit(); frIsleSay(text, true); }
// (hosting or alone) the clock, a few drowned each minute (if said: what's said when they come), and back aboard once lit
function frpTick(dt, said) {
  const S = RAID.st;
  if (S.ph === 'lit') { S.awayT += dt; if (S.awayT >= FRI.AWAY) frIslandDone(); return false; }
  S.t += dt;
  if (said && S.t >= (S.spN + 1) * FRP.MIN) { S.spN++; frpSpawn(1 + frpN() + (FR.reach - 1)); frIsleSay(said, true); }
  return true;
}
function frpSpawn(k) { const n = frpN(); for (let i = 0; i < k; i++) frIsleSpawn({ kind: frIsleKindOf(), hp: zmHp(RAIDC.ROUND + (FR.stop | 0) + (FR.reach - 1) * 2) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) }); }
function frpPack(o) { const S = RAID.st; o.fpq = [S.ph === 'lit' ? 1 : 0, Math.round(S.awayT * 10), Math.round(S.t)]; o.fpy = S.say; }
function frpApply(o) {
  const S = RAID.st;
  if (Array.isArray(o.fpq)) { S.ph = o.fpq[0] ? 'lit' : 'dark'; S.awayT = (o.fpq[1] | 0) / 10; S.t = o.fpq[2] | 0; }
  if (Array.isArray(o.fpy)) { const n = o.fpy[0] | 0; if (n > S.seenSay) { if (S.seenSay || n === 1) frIsleHear(String(o.fpy[1] || ''), !!o.fpy[2]); S.seenSay = n; } }
}
// (everyone) the sound of it catching
function frpMe(dt) {
  const S = RAID.st; if (S.pend > 0) S.pend -= dt;
  if (S.ph !== S.phSeen) { S.phSeen = S.ph; try { if (!soundOff() && S.ph === 'lit') { sfxFlare(); zmSound('round'); sfxBell(); } } catch (e) {} }
}
// holding Use at the beacon lights it (when can)
function frpLightMe(dt, can) {
  const S = RAID.st, o = ZM.near;
  if (can && frpHeld() && o && o.k === 'frplight' && frpAlive() && !(S.pend > 0)) { S.useT += dt; if (S.useT >= FRP.USE) { S.useT = 0; S.pend = 1.2; raidAsk('light'); } }
  else S.useT = 0;
}
function frpLightConsider(c, can) { if (can) { const [x, y] = friBeacon(); c({ k: 'frplight' }, x, y, 0, 2.6, false); } }
// the HUD's line (as Hold the Light's); answers where the next thing under it goes
function frpLine(text, col, phone, mono) {
  const L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = col || 'rgba(236,228,207,0.85)';
  ctx.fillText(text, L, top, W * 0.6); fpsHudNote(top + (phone ? 14 : 18));
  return [L, top + (phone ? 20 : 26)];
}
const frpLitLine = () => `The beacon is lit. Back aboard in ${Math.max(0, Math.ceil(FRI.AWAY - RAID.st.awayT))} s`;
const frpDrownIn = () => Math.max(0, Math.ceil(FRP.MIN - (RAID.st.t % FRP.MIN)));
// lighting it: a ring round the sights filling
function frpUseRing() {
  const S = RAID.st; if (!(S.useT > 0)) return;
  const k = Math.min(1, S.useT / FRP.USE);
  ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
}
// where a sound is, from me: [pan, volume]
function frpEar(x, y, far) { const m = FPS.me, d = Math.hypot(x - m.x, y - m.y); return [clamp(Math.sin(angDiff(bearingOf(x - m.x, y - m.y), m.h)), -1, 1) * 0.8, clamp(1 - d / (far || 45), 0.2, 1)]; }
function frpThud(vol) { try { if (soundOff()) return; noise('lowpass', 220, 1, 0.005, 0.4 * vol, 0.35); tone(72, 'sine', 0.005, 0.35 * vol, 0.45, { to: 48 }); } catch (e) {} }
// 3D bits
const FRP3 = { on: false };
const frpMat = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000 });
const frpGlow = (inner, outer, s, op) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft(inner, outer), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op == null ? 1 : op, fog: false })); m.scale.setScalar(s); return m; };
const frpMesh = (geo, mat, x, y, z, P) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (P) P.add(m); return m; };

// ---------- the props (static: their 3D merged with the island's) ----------
// a mirror post: a stone plinth and a stout post; its turning head is the stage's 3D
FPI_K.frmirror = {
  col: FPI_C.stone,
  sol(p) { return [fpiCirc(p, 0, 0, 0.45, 1.25, { ray: false })]; },
  b3(p, A) {
    A.box(FPI_C.stone3, 0, 0, 0, 0.9, 0.9, 0.35); A.box(FPI_C.stone, 0, 0, 0.35, 0.7, 0.7, 0.12);
    A.cyl(FPI_C.wood3, 0, 0, 0.45, 0.13, 0.85, 0, 0, 0, 'cyl8'); A.cyl(FPI_C.iron, 0, 0, 1.2, 0.17, 0.08, 0, 0, 0, 'cyl8');
  },
};
// the lamp at the island's edge: a stone pillar with a great iron lantern on it, turned inland
FPI_K.frlamp = {
  col: FPI_C.stone,
  sol(p) { return [fpiCirc(p, 0, 0, 0.7, 1.4, { ray: false })]; },
  b3(p, A) {
    A.part('taper', FPI_C.stone, 0, 0, 0.7, 1.2, 1.4, 1.2); A.box(FPI_C.stone3, 0, 0, 1.35, 1.0, 1.0, 0.12);
    A.box(FPI_C.iron, 0, 0, 1.47, 0.6, 0.6, 0.06); A.box(FPI_C.iron, 0, 0, 2.05, 0.66, 0.66, 0.07);
    A.part('cone', FPI_C.iron, 0, 0, 2.25, 0.7, 0.32, 0.7);
    for (const [du, dv] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]]) A.box(FPI_C.iron, du, dv, 1.5, 0.05, 0.05, 0.56);
    A.glow('#fff0c0', 0, 0, 1.76, 0.42); A.part('cyl8', FPI_C.brass, 0.32, 0, 1.76, 0.5, 0.12, 0.5, 0, 0, Math.PI / 2);
  },
};
// a bell post: a tall post with an arm, the bell hangs from its end (the bell is the stage's 3D)
FPI_K.frbellpost = {
  col: FPI_C.wood3,
  sol(p) { return [fpiCirc(p, 0, 0, 0.3, 2.7)]; },
  b3(p, A) {
    A.part('ico', FPI_C.stone2, 0, 0, 0.12, 0.8, 0.35, 0.8);
    A.cyl(FPI_C.wood3, 0, 0, -0.2, 0.12, 2.95, 0, 0, 0, 'cyl6'); A.box(FPI_C.wood3, 0.32, 0, 2.55, 0.78, 0.12, 0.12);
    A.box(FPI_C.wood3, 0.12, 0, 2.2, 0.08, 0.08, 0.5, 0, 0, -0.7); A.cyl(FPI_C.rope, 0, 0, 1.6, 0.14, 0.1, 0, 0, 0, 'cyl6');
  },
};
// the horn post by the landing: a post with a brass fog horn on it
FPI_K.frhornpost = {
  col: FPI_C.wood3,
  sol(p) { return [fpiCirc(p, 0, 0, 0.35, 1.7)]; },
  b3(p, A) {
    A.part('ico', FPI_C.stone2, 0, 0, 0.12, 0.7, 0.3, 0.7);
    A.cyl(FPI_C.wood3, 0, 0, -0.2, 0.14, 1.7, 0, 0, 0, 'cyl6');
    A.part('cone', FPI_C.brass, 0.25, 0, 1.55, 0.36, 0.9, 0.36, 0, 0, Math.PI / 2); A.cyl(FPI_C.brass, -0.25, 0, 1.55, 0.07, 0.25, 0, 0, Math.PI / 2, 'cyl6');
    A.box(FPI_C.iron, 0, 0, 1.38, 0.5, 0.06, 0.06);
  },
};

const FRP_RULES = {};

// ---------- Bend the Beam ----------
// the beam's way from the lamp, for these turns of the posts: { pts: [[x, y, z]...], lit: the posts it reaches, in
// order, hit: what stops it ('beacon', 'post' turned back, 'loop', 'solid', 'edge') }. solid: stopped by the island's
// props (and with heights); without, the plain lay of it (for laying out)
function frpBeamTrace(L, aims, solid) {
  const pts = [], lit = [], P = L.posts, B = L.bea, I = solid && FPS.g && FPS.g.isle;
  let x = L.lamp[0], y = L.lamp[1], d = L.d0, from = -1, z = solid ? frpGz(x, y) + FRP.LAMP_Z : 0, hit = 'edge';
  pts.push([x, y, z]);
  for (let step = 0; step <= P.length; step++) {
    const [ux, uy] = frpU(d);
    let best, kind = 'edge', j = -1;
    { const ox = x - FPSC.CX, oy = y - FPSC.CY, b = ox * ux + oy * uy, c = ox * ox + oy * oy - Math.pow(FPSC.R - 1, 2), disc = b * b - c; best = disc > 0 ? Math.max(0.5, -b + Math.sqrt(disc)) : 1; }
    for (let i = 0; i < P.length; i++) { if (i === from) continue; const ox = P[i][0] - x, oy = P[i][1] - y, al = ox * ux + oy * uy; if (al < 0.5 || al >= best) continue; if (Math.abs(ox * uy - oy * ux) < FRP.HIT) { best = al; kind = 'post'; j = i; } }
    { const ox = B[0] - x, oy = B[1] - y, al = ox * ux + oy * uy; if (al > 0.5 && al < best && Math.abs(ox * uy - oy * ux) < FRP.BEA_HIT) { best = al; kind = 'beacon'; } }
    let ze = z;
    if (solid) {
      ze = kind === 'post' ? frpGz(P[j][0], P[j][1]) + FRP.POST_Z : kind === 'beacon' ? frpGz(B[0], B[1]) + FRI.TOP + 0.2 : z;
      const tp = (ze - z) / best, lim = kind === 'beacon' ? best - 1.7 : kind === 'post' ? best - 0.5 : best;
      if (I && lim > 0.3) { const r = fpsIsleRay(FPS.g, x, y, z, ux, uy, tp, { t: lim }); if (r.kind) { best = r.t; kind = 'solid'; ze = z + tp * r.t; } }
    }
    x += ux * best; y += uy * best; z = ze; hit = kind;
    if (kind === 'post') { x = P[j][0]; y = P[j][1]; }
    pts.push([x, y, z]);
    if (kind !== 'post') break;
    if (lit.includes(j)) { hit = 'loop'; break; }
    lit.push(j);
    const nd = aims[j]; if (nd === (d + 4) % 8) { hit = 'back'; break; }
    d = nd; from = j;
  }
  return { pts, lit, hit };
}
FRP_RULES.beam = {
  n: 'Bend the Beam',
  // laid out backwards from the beacon: the last post straight along one of the eight ways from it, the one before
  // that along another, and so on, and the lamp back along the first way at the shore; the heads then turned wrong
  set(H, K, Z) {
    const { B, L: Ld } = frpFr(Z), C = [H.CX, H.CY], k = FR.reach > 1 ? 4 : 3, IR = H.IR, far = (a, b, m) => Math.hypot(a[0] - b[0], a[1] - b[1]) >= m;
    let Lay = null;
    for (let t = 0; t < 900 && !Lay; t++) {
      const strict = t < 700, s = new Array(k + 1), P = new Array(k);
      s[k] = H.RI(0, 7);
      let p = B, ok = true;
      for (let i = k - 1; i >= 0; i--) {
        const len = H.R(7, 13), [ux, uy] = frpU(s[i + 1]); p = [p[0] - ux * len, p[1] - uy * len]; P[i] = p;
        let d = H.RI(0, 7); if (d === s[i + 1] || d === (s[i + 1] + 4) % 8) d = (d + 2) % 8; s[i] = d;
        if (Math.hypot(p[0] - C[0], p[1] - C[1]) > IR - 9 || !far(p, B, 5) || !far(p, Ld, 6)) { ok = false; break; }
        for (let q = i + 1; q < k; q++) if (!far(p, P[q], 5)) ok = false;
        if (strict && !H.clear(p[0], p[1], 0.6, 1.4)) ok = false;
        if (!ok) break;
      }
      if (!ok) continue;
      const [ux, uy] = frpU(s[0]), ox = P[0][0] - C[0], oy = P[0][1] - C[1], ou = ox * ux + oy * uy, rr = IR - 6, disc = ou * ou - (ox * ox + oy * oy - rr * rr);
      if (disc <= 0) continue;
      const tl = ou + Math.sqrt(disc); if (tl < 6 || tl > 34) continue;
      const lamp = [P[0][0] - ux * tl, P[0][1] - uy * tl];
      if (!far(lamp, Ld, 9) || (strict && !H.clear(lamp[0], lamp[1], 0.8, 1.2))) continue;
      const Lc = { lamp, d0: s[0], posts: P, bea: B, sol: s.slice(1) };
      const tr = frpBeamTrace(Lc, Lc.sol, false); if (tr.hit !== 'beacon' || tr.lit.length !== k) continue;
      // (nothing already standing in the beam's way)
      if (strict) {
        const way = [lamp].concat(P, [B]);
        for (let i = 0; i < way.length - 1 && ok; i++) { const a = way[i], b = way[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let u = 1.6; u < L - (i === way.length - 2 ? 2.2 : 1.2); u += 1.4) if (!H.clear(a[0] + (b[0] - a[0]) * u / L, a[1] + (b[1] - a[1]) * u / L, 0.15, 0.5)) { ok = false; break; } }
        if (!ok) continue;
      }
      Lay = Lc;
    }
    // (nothing fitted: a plain zigzag in from the south-west)
    if (!Lay) {
      const P = [], s = []; let p = B;
      for (let i = k - 1; i >= 0; i--) { const d = (k - 1 - i) % 2 ? 2 : 0, [ux, uy] = frpU(d); s[i + 1] = d; p = [p[0] - ux * 6, p[1] - uy * 6]; P[i] = p; }
      s[0] = (s[1] + 2) % 8; const [ux, uy] = frpU(s[0]);
      Lay = { lamp: [P[0][0] - ux * 8, P[0][1] - uy * 8], d0: s[0], posts: P, bea: B, sol: s.slice(1) };
    }
    // the heads turned wrong, each by a step or more
    let aims;
    for (let t = 0; t < 12; t++) { aims = Lay.sol.map(a => (a + H.RI(1, 7)) % 8); if (frpBeamTrace(Lay, aims, false).hit !== 'beacon') break; }
    FRP_L = Object.assign({ kind: 'beam', aim0: aims }, Lay);
    const a0 = Math.PI / 2 - Lay.d0 * Math.PI / 4;
    H.put('frlamp', Lay.lamp[0], Lay.lamp[1], a0, {});
    { const lx = Lay.lamp[0] + Math.cos(a0) * 0.3, ly = Lay.lamp[1] + Math.sin(a0) * 0.3; H.light(lx, ly, 1.8, '#ffe6b0', 11, 'lantern'); }
    for (const p of Lay.posts) H.put('frmirror', p[0], p[1], H.R(0, H.TAU), {});
    const way = [Lay.lamp].concat(Lay.posts, [B]);
    for (let i = 0; i < way.length - 1; i++) frpKeepLine(H, way[i], way[i + 1], 0.9);
  },
  enter() {
    frpEnter({ aim: (FRP_L.aim0 || []).slice(), turns: 0, turnSeen: 0 });
    fpsFeed('Ashore. The Light’s beam comes in off the cliff: turn the mirror posts (Use) to carry it to the beacon.');
  },
  tick(dt) { frpTick(dt, 'More of the drowned come up. Quicker with those mirrors!'); },
  q(sid, k, a) {
    const S = RAID.st, i = a | 0;
    if (k !== 'turn' || S.ph === 'lit' || !(i >= 0 && i < S.aim.length)) return;
    S.aim[i] = (S.aim[i] + 1) % 8; S.turns++;
    if (frpBeamTrace(FRP_L, S.aim, false).hit === 'beacon') frpSolve(`${frpWho(sid)} turned the last mirror: the beam reaches the beacon.`);
  },
  pack(o) { frpPack(o); o.fpb = [RAID.st.aim.join(''), RAID.st.turns]; },
  apply(o) { frpApply(o); const S = RAID.st; if (Array.isArray(o.fpb)) { const a = String(o.fpb[0] || ''); if (a.length === S.aim.length) S.aim = a.split('').map(c => clamp(c | 0, 0, 7)); S.turns = o.fpb[1] | 0; } },
  me(dt) { frpMe(dt); const S = RAID.st; if (S.turns !== S.turnSeen) { S.turnSeen = S.turns; try { if (!soundOff()) { sfxCreak(); tone(260, 'triangle', 0.002, 0.08, 0.08); } } catch (e) {} } },
  consider(c) { if (RAID.st.ph === 'lit') return; FRP_L.posts.forEach((p, i) => c({ k: 'frpost', i }, p[0], p[1], 0, FRP.POST_R, false)); },
  prompt(o) { return o.k === 'frpost' ? { text: 'Turn the mirror post' } : null; },
  use(o) { if (o.k !== 'frpost') return false; raidAsk('turn', o.i); return true; },
  hud(phone, mono) {
    const S = RAID.st, n = FRP_L.posts.length, tr = FRP3.tr, got = tr ? tr.lit.length : 0;
    const line = S.ph === 'lit' ? frpLitLine() : `Bend the Beam: turn the mirror posts (Use) to carry the beam to the beacon · ${got} of ${n} posts lit · more drowned in ${frpDrownIn()} s`;
    frpLine(line, S.ph === 'lit' ? '#ffe2a8' : null, phone, mono);
    ctx.textBaseline = 'alphabetic';
  },
  b3(grp) {
    const L = FRP_L; if (L.kind !== 'beam') return;
    const up = new THREE.Vector3(0, 1, 0), bm = new THREE.MeshBasicMaterial({ color: 0xffe8b8, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const core = bm.clone(); core.opacity = 0.75; core.color.set(0xfff6e0);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), segs = [];
    for (let i = 0; i < L.posts.length + 2; i++) { const a = new THREE.Mesh(cyl, bm), b = new THREE.Mesh(cyl, core); a.visible = b.visible = false; grp.add(a); grp.add(b); segs.push([a, b]); }
    const spark = frpGlow('rgba(255,240,200,0.95)', 'rgba(255,200,120,0)', 1.6); spark.visible = false; grp.add(spark);
    const lampGlow = frpGlow('rgba(255,236,190,0.9)', 'rgba(255,200,120,0)', 3.2, 0.7); lampGlow.position.copy(z3v(L.lamp[0], L.lamp[1], frpGz(L.lamp[0], L.lamp[1]) + FRP.LAMP_Z)); grp.add(lampGlow);
    const brass = frpMat(0x8a6a2c, 0x1a1408), glass = frpMat(0xd8e4ec, 0x000000), heads = [];
    for (const p of L.posts) {
      const G = new THREE.Group(), z = frpGz(p[0], p[1]) + FRP.POST_Z; G.position.copy(z3v(p[0], p[1], z)); grp.add(G);
      // the yoke turns to the way the post sends the beam; a spout on it points that way; the mirror inside it
      // swings to stand between the way the beam comes in and that
      frpMesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), brass, 0, -0.3, 0, G);
      for (const s of [-1, 1]) frpMesh(new THREE.BoxGeometry(0.07, 0.62, 0.1), brass, s * 0.42, 0, 0, G);
      const spout = frpMesh(new THREE.ConeGeometry(0.09, 0.5, 8), brass, 0, 0.42, -0.25, G); spout.rotation.x = -Math.PI / 2;
      const M = new THREE.Group(); G.add(M);
      const gm = glass.clone(), disc = frpMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18), gm, 0, 0, 0, M); disc.rotation.x = Math.PI / 2;
      const rim = frpMesh(new THREE.TorusGeometry(0.35, 0.04, 6, 18), brass, 0, 0, 0, M);
      const glow = frpGlow('rgba(255,236,190,0.9)', 'rgba(255,200,120,0)', 1.4, 0); G.add(glow);
      heads.push({ G, M, gm, glow, r: null, m: 0 });
    }
    Object.assign(FRP3, { on: true, kind: 'beam', up, segs, spark, lampGlow, heads, key: '', tr: null });
  },
  f3(dt) {
    if (!FRP3.on || FRP3.kind !== 'beam') return;
    const S = RAID.st, L = FRP_L, lit = S.ph === 'lit', aims = lit ? L.sol : S.aim, key = aims.join('') + (lit ? 'L' : '');
    if (key !== FRP3.key || !FRP3.tr || (FRP3.reT = (FRP3.reT || 0) - dt) <= 0) { FRP3.key = key; FRP3.reT = 1; FRP3.tr = frpBeamTrace(L, aims, !lit); if (lit && FRP3.tr.hit !== 'beacon') FRP3.tr = frpBeamTrace(L, aims, false); }
    const tr = FRP3.tr, fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(g.t * 9);
    FRP3.segs.forEach(([a, b], i) => {
      const p = tr.pts[i], q = tr.pts[i + 1];
      if (!q) { a.visible = b.visible = false; return; }
      const A = z3v(p[0], p[1], p[2] || frpGz(p[0], p[1]) + FRP.POST_Z), Bv = z3v(q[0], q[1], q[2] || frpGz(q[0], q[1]) + FRP.POST_Z), dv = Bv.clone().sub(A), len = dv.length();
      a.visible = b.visible = len > 0.05; if (!a.visible) return;
      dv.divideScalar(len);
      for (const [m, r] of [[a, 0.13 * fl], [b, 0.045]]) { m.position.copy(A).addScaledVector(dv, len / 2); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(FRP3.up, dv); }
    });
    // where it stops: a spark (unless it's run off into the fog)
    const e = tr.pts[tr.pts.length - 1]; FRP3.spark.visible = tr.hit !== 'edge';
    if (FRP3.spark.visible) { FRP3.spark.position.copy(z3v(e[0], e[1], e[2])); FRP3.spark.scale.setScalar((tr.hit === 'beacon' ? 3 : 1.2) * fl); }
    FRP3.lampGlow.material.opacity = 0.6 * fl;
    // the heads: turning (eased), and lit while the beam's on them
    FRP3.heads.forEach((h, i) => {
      const want = -aims[i] * Math.PI / 4; if (h.r == null) h.r = want; h.r += angDiff(want, h.r) * Math.min(1, dt * 8); h.G.rotation.y = h.r;
      const at = tr.lit.indexOf(i), on = at >= 0;
      let off = 0;
      if (on) { const pin = tr.pts[at], pc = L.posts[i], inB = bearingOf(pin[0] - pc[0], pin[1] - pc[1]); off = -angDiff(inB, aims[i] * Math.PI / 4) / 2; }
      h.m += ((on ? 1 : 0) - h.m) * Math.min(1, dt * 5);
      h.M.rotation.y += angDiff(off, h.M.rotation.y) * Math.min(1, dt * 8);
      h.gm.emissive.setRGB(0.9 * h.m, 0.8 * h.m, 0.55 * h.m); h.glow.material.opacity = 0.55 * h.m * fl;
    });
  },
  exit() { FRP3.on = false; },
};

// ---------- Knock's Garden ----------
function frpSeeClear(x, y, ez, tx, ty, tz) {
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy); if (d < 0.3) return true;
  const r = fpsIsleRay(FPS.g, x, y, ez, dx / d, dy / d, (tz - ez) / d, { t: d });
  return r.t >= d - 0.4;
}
// does someone at (x, y, jz), looking along h (and p up), see this figurehead? (hf, vf: their view's half width and
// height; far: as far as they can make it out in the fog)
function frpSees(x, y, jz, h, p, hf, vf, s, far) {
  const dx = s.x - x, dy = s.y - y, d = Math.hypot(dx, dy);
  if (d > far) return false;
  if (d > 0.7 && Math.abs(angDiff(bearingOf(dx, dy), h)) > hf + Math.atan2(0.5, d)) return false;
  const ez = FPSC.GROUND + (jz || 0) + FPSC.EYE, g0 = frpGz(s.x, s.y);
  for (const hz of [2.05, 1.3, 0.6]) {
    const tz = g0 + hz, el = Math.atan2(tz - ez, Math.max(0.3, d));
    if (Math.abs(el - (p || 0)) > vf + Math.atan2(0.5, Math.max(0.3, d))) continue;
    if (frpSeeClear(x, y, ez, s.x, s.y, tz)) return true;
  }
  return false;
}
// (hosting or alone) is it watched by any of you: mine from my own screen, the others' from where they are and look
function frpWatched(s) {
  const m = FPS.me, fog = (FPS_ISLES.frisle.fog || [])[2] || 60, far = Math.min(FRP.KN_SEE, fog + 4);
  if (frpAlive()) {
    const C = typeof GL3D !== 'undefined' && GL3D.camera, vf = C ? C.fov * Math.PI / 360 : 0.6, hf = C ? Math.min(1.3, Math.atan(Math.tan(vf) * (C.aspect || 1.6))) : FRP.KN_FOV;
    if (frpSees(m.x, m.y, m.jz || 0, m.h, m.p || 0, hf, vf, s, far)) return true;
  }
  if (ZM.net === 'host') for (const r of FPS.remote.values()) if (!r.dead && !r.down && !r.left && r.tx != null && frpSees(r.tx, r.ty, r.tjz != null ? r.tjz : r.jz || 0, r.th != null ? r.th : r.h || 0, r.p || 0, FRP.KN_FOV, FRP.KN_VFOV, s, far)) return true;
  return false;
}
FRP_RULES.knock = {
  n: 'Knock’s Garden',
  // the figureheads: between the landing and the beacon, across the way, none too near either
  set(H, K, Z) {
    const { B, L: Ld } = frpFr(Z), n = 3 + 2 * FR.reach, D = Math.hypot(B[0] - Ld[0], B[1] - Ld[1]) || 1, ux = (B[0] - Ld[0]) / D, uy = (B[1] - Ld[1]) / D, st = [];
    for (let t = 0; t < 600 && st.length < n; t++) {
      const u = H.R(8, Math.max(10, D - 3.5)), v = H.R(-10, 10), x = Ld[0] + ux * u - uy * v, y = Ld[1] + uy * u + ux * v;
      if (!H.inside(x, y, 1) || !H.clear(x, y, 0.6, t < 400 ? 1.0 : 0.4)) continue;
      if (Math.hypot(x - B[0], y - B[1]) < 4.5 || Math.hypot(x - Ld[0], y - Ld[1]) < 8 || st.some(s => Math.hypot(s[0] - x, s[1] - y) < 3.4)) continue;
      st.push([x, y, bearingOf(Ld[0] - x, Ld[1] - y) + H.R(-0.5, 0.5), H.RI(0, 2)]);
    }
    for (const s of st) frpKeepCirc(H, s[0], s[1], 0.8);
    FRP_L = { kind: 'knock', st };
  },
  enter() {
    frpEnter({ st: FRP_L.st.map(s => ({ x: s[0], y: s[1], tx: s[0], ty: s[1], h: s[2], th: s[2], mv: 0, seen: 1, rest: 0, jz: 0, fl: 0, zpad: FRP.KN_PAD, c: s[3] })), kn: [0, ''], knSeen: ZM.net === 'client' ? -1 : 0, seeT: 0, scT: 0 });
    fpsFeed('Ashore. Figureheads stand between you and the beacon. They move only when no one is looking at them.');
  },
  tick(dt) {
    const S = RAID.st; if (!frpTick(dt)) return;
    S.seeT -= dt; if (S.seeT <= 0) { S.seeT = 1 / 15; for (const s of S.st) s.seen = frpWatched(s); }
    const P = (ZM.players || []).filter(p => !p.beacon), sp = FRP.KN_SP + 0.4 * (FR.reach - 1);
    for (const s of S.st) {
      s.mv = 0;
      if (s.rest > 0) { s.rest -= dt; continue; }
      if (s.seen || !P.length) continue;
      let best = null, bd = 1e9; for (const p of P) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = p; } }
      if (bd < FRP.KN_REACH) { s.rest = FRP.KN_REST; S.kn = [S.kn[0] + 1, best.sid]; s.h = bearingOf(best.x - s.x, best.y - s.y); frIsleSay(ZM.net ? `A figurehead reached ${frpWho(best.sid)} and knocked them flat.` : 'A figurehead reached you and knocked you flat.', true); continue; }
      const want = bearingOf(best.x - s.x, best.y - s.y), step = Math.min(bd - FRP.KN_REACH * 0.6, sp * dt);
      s.h += angDiff(want, s.h) * Math.min(1, dt * 8);
      const x0 = s.x, y0 = s.y; FRP_MV = s;
      for (const dh of [0, 0.5, -0.5, 1.0, -1.0]) { const a = want + dh; if (zmMove(s, Math.sin(a) * step, Math.cos(a) * step) && Math.hypot(s.x - x0, s.y - y0) > step * 0.3) break; }
      FRP_MV = null; s.mv = Math.hypot(s.x - x0, s.y - y0) > 0.001 ? 1 : 0;
    }
  },
  q(sid, k) { if (k === 'light' && RAID.st.ph === 'dark') frpSolve(`${frpWho(sid)} lit the beacon. The figureheads stand still.`); },
  block(x, y, pad) { const S = RAID.st; if (FRP_L.kind !== 'knock' || !Array.isArray(S.st)) return false; for (const s of S.st) if (s !== FRP_MV && Math.hypot(s.x - x, s.y - y) < pad + FRP.KN_PAD) return true; return false; },
  pack(o) { frpPack(o); const S = RAID.st; o.fpk = [S.st.map(s => [Math.round((s.x - FPSC.CX) * 20), Math.round((s.y - FPSC.CY) * 20), Math.round(s.h * 100), (s.mv ? 1 : 0) | (s.seen ? 2 : 0)]), S.kn[0], S.kn[1]]; },
  apply(o) {
    frpApply(o); const S = RAID.st, a = o.fpk; if (!Array.isArray(a)) return;
    if (Array.isArray(a[0])) a[0].forEach((e, i) => { const s = S.st[i]; if (!s || !Array.isArray(e)) return; s.tx = FPSC.CX + (e[0] | 0) / 20; s.ty = FPSC.CY + (e[1] | 0) / 20; s.th = (e[2] | 0) / 100; s.mv = e[3] & 1; s.seen = (e[3] & 2) ? 1 : 0; });
    S.kn = [a[1] | 0, String(a[2] || '')];
  },
  me(dt) {
    frpMe(dt); const S = RAID.st, m = FPS.me;
    // (joined: the figureheads glide to where the host has them)
    if (ZM.net === 'client') for (const s of S.st) { const k = Math.min(1, dt * 10); s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; s.h += angDiff(s.th, s.h) * k; }
    // knocked down: hard, and pushed back off it
    if (S.kn[0] !== S.knSeen) {
      const mine = S.knSeen >= 0 && S.kn[1] === m.id; S.knSeen = S.kn[0];
      if (mine && frpAlive()) {
        let n = null, nd = 1e9; for (const s of S.st) { const d = Math.hypot(s.x - m.x, s.y - m.y); if (d < nd) { nd = d; n = s; } }
        m.iframe = 0; m.protect = 0; fpsHurt(Math.max(FRP.KN_HURT, Math.ceil((ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP) / 2)), null, null); FPS.hurtT = 1;
        if (n && nd > 0.01) for (let i = 0; i < 6; i++) zmMove(m, (m.x - n.x) / nd * 0.3, (m.y - n.y) / nd * 0.3);
        try { if (!soundOff()) { sfxKnock(0, 1, 0.08); zmSound('hit'); } } catch (e) {}
        fpsFeed('A figurehead knocked you flat. Keep your eyes on them.');
      }
    }
    // the knock, knock of one moving where you can hear it
    S.scT -= dt;
    if (S.scT <= 0) { S.scT = 0.6; let best = null, bd = 18; for (const s of S.st) if (s.mv) { const d = Math.hypot(s.x - m.x, s.y - m.y); if (d < bd) { bd = d; best = s; } } if (best && frpAlive()) { const [pan, vol] = frpEar(best.x, best.y, 20); try { if (!soundOff()) sfxKnock(pan, vol * 0.8, 0.11); } catch (e) {} } }
    frpLightMe(dt, S.ph === 'dark');
  },
  consider(c) { frpLightConsider(c, RAID.st.ph === 'dark'); },
  prompt(o) { return o.k === 'frplight' ? { text: 'Hold to light the beacon', hold: true } : null; },
  use(o) { return o.k === 'frplight'; },
  hud(phone, mono) {
    const S = RAID.st, m = FPS.me, near = S.st.some(s => s.mv && Math.hypot(s.x - m.x, s.y - m.y) < 14);
    const line = S.ph === 'lit' ? frpLitLine() : 'Knock’s Garden: cross to the beacon and light it (hold Use). The figureheads move only while no one is looking';
    const [L, y] = frpLine(line, S.ph === 'lit' ? '#ffe2a8' : null, phone, mono);
    if (S.ph !== 'lit') {
      const moving = S.st.filter(s => s.mv).length;
      ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = near ? `rgba(255,150,110,${0.75 + 0.25 * Math.sin(g.t * 7)})` : 'rgba(236,228,207,0.6)';
      ctx.fillText(near ? 'Something moves behind you…' : moving ? `${moving} of them moving where none of you can see` : 'Every one of them watched', L, y, W * 0.6); fpsHudNote(y + (phone ? 12 : 15));
    }
    frpUseRing(); ctx.textBaseline = 'alphabetic';
  },
  b3(grp) {
    if (FRP_L.kind !== 'knock') return;
    const stone = frpMat(0x5e605a), stone2 = frpMat(0x4a4c48), paints = [[0x5a3624, 0x2a3644], [0x3e4a56, 0x4a2418], [0x5e5440, 0x203024]], skin = frpMat(0x7e6a50), dark = frpMat(0x1e1812), gilt = frpMat(0x5a4620, 0x0a0702);
    const figs = RAID.st.st.map(s => {
      const G = new THREE.Group(), [c1, c2] = paints[s.c % 3], coat = frpMat(c1), sash = frpMat(c2), eye = new THREE.MeshLambertMaterial({ color: 0x101010, emissive: 0x000000 });
      frpMesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), stone, 0, 0.22, 0, G); frpMesh(new THREE.BoxGeometry(1.05, 0.1, 1.05), stone2, 0, 0.47, 0, G);
      const F = new THREE.Group(); F.position.y = 0.52; G.add(F);
      frpMesh(new THREE.CylinderGeometry(0.34, 0.44, 0.38, 12), gilt, 0, 0.19, 0, F);   // (a carved scroll of waves under it)
      frpMesh(new THREE.CylinderGeometry(0.36, 0.27, 1.0, 12), coat, 0, 0.88, 0, F);
      const sh = frpMesh(new THREE.SphereGeometry(0.4, 12, 8), coat, 0, 1.36, 0, F); sh.scale.set(1.05, 0.42, 0.7);
      const arms = frpMesh(new THREE.BoxGeometry(0.66, 0.15, 0.18), coat, 0, 1.02, -0.24, F); arms.rotation.z = 0.08;
      frpMesh(new THREE.BoxGeometry(0.08, 0.7, 0.04), sash, 0.12, 1.0, -0.3, F).rotation.z = 0.5;
      frpMesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8), skin, 0, 1.5, 0, F);
      const head = frpMesh(new THREE.SphereGeometry(0.23, 14, 10), skin, 0, 1.72, 0, F); head.scale.set(0.95, 1.15, 1);
      for (const sx of [-1, 1]) frpMesh(new THREE.SphereGeometry(0.04, 8, 6), eye, sx * 0.08, 1.77, -0.2, F);
      const nose = frpMesh(new THREE.ConeGeometry(0.04, 0.12, 6), skin, 0, 1.7, -0.24, F); nose.rotation.x = -Math.PI / 2;
      frpMesh(new THREE.BoxGeometry(0.16, 0.025, 0.03), dark, 0, 1.6, -0.21, F);
      frpMesh(new THREE.CylinderGeometry(0.2, 0.25, 0.14, 12), dark, 0, 1.95, 0.02, F);
      grp.add(G);
      return { G, F, eye, k: 0 };
    });
    Object.assign(FRP3, { on: true, kind: 'knock', figs });
  },
  f3(dt) {
    if (!FRP3.on || FRP3.kind !== 'knock') return;
    RAID.st.st.forEach((s, i) => {
      const f = FRP3.figs[i]; if (!f) return;
      f.G.position.copy(z3v(s.x, s.y, frpGz(s.x, s.y))); f.G.rotation.y = -s.h;
      // (moving: a jolt with each step, and the eyes catch a dim red)
      f.k += ((s.mv ? 1 : 0) - f.k) * Math.min(1, dt * 6);
      f.F.rotation.z = reduceMotion ? 0 : Math.sin(g.t * 11 + i) * 0.05 * f.k; f.F.position.y = 0.52 + (reduceMotion ? 0 : Math.abs(Math.sin(g.t * 11 + i)) * 0.06 * f.k);
      f.eye.emissive.setRGB(0.6 * f.k, 0.08 * f.k, 0.04 * f.k);
    });
  },
  exit() { FRP3.on = false; FRP_MV = null; },
};

// ---------- The Bell Buoys ----------
// a bell's note (semi: semitones up), from where it hangs
function frpBellTone(semi, pan, vol) {
  try { if (soundOff()) return; const k = Math.pow(2, semi / 12); for (const [f, a, d] of [[392, 0.42, 2.6], [988, 0.2, 1.8], [1567, 0.1, 1.2], [196, 0.16, 3]]) tone(f * k, 'sine', 0.004, a * vol, d, { pan }); } catch (e) {}
}
// a note of the fog horn: its recording (frhorn) pitched by its playback rate, cut short so the notes don't run
// together; without the recording yet, a reedy synthesised one
function frpHornNote(semi, delay) {
  const c = AUD.ctx; if (!c || soundOff()) return;
  const L = typeof SFXB !== 'undefined' && SFXB.buf[FR_MUSIC.horn];
  if (L && L.length) {
    const b = FRP3.hornBuf && L.includes(FRP3.hornBuf) ? FRP3.hornBuf : (FRP3.hornBuf = L[0]), t = c.currentTime + delay, s = c.createBufferSource(), gn = c.createGain();
    s.buffer = b; s.playbackRate.value = Math.pow(2, (semi - 4) / 12);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.95, t + 0.08); gn.gain.setValueAtTime(0.95, t + FRP.NOTE - 0.5); gn.gain.linearRampToValueAtTime(0.0001, t + FRP.NOTE - 0.08);
    s.connect(gn).connect(AUD.master); s.start(t); s.stop(t + FRP.NOTE);
    return;
  }
  const f = 110 * Math.pow(2, semi / 12);
  tone(f, 'sawtooth', 0.15, 0.09, FRP.NOTE - 0.4, { delay }); tone(f * 2, 'triangle', 0.12, 0.05, FRP.NOTE - 0.5, { delay }); tone(f / 2, 'sine', 0.15, 0.12, FRP.NOTE - 0.3, { delay });
}
const frpTuneLen = () => (FRP_L.tune || []).length * FRP.NOTE + 0.6;
FRP_RULES.bells = {
  n: 'The Bell Buoys',
  // the bells round the island, each its own note; the horn post by the landing; the tune (from the seed)
  set(H, K, Z) {
    const { B, L: Ld } = frpFr(Z), nb = FR.reach > 1 ? 5 : 4, a0 = H.R(0, H.TAU), bells = [];
    for (let i = 0; i < nb; i++) {
      let at = null;
      for (let t = 0; t < 50 && !at; t++) { const [x, y] = H.polar(a0 + i / nb * H.TAU + H.R(-0.3, 0.3), H.R(15, 26)); if (H.clear(x, y, 0.6, t < 35 ? 1.6 : 0.6) && Math.hypot(x - Ld[0], y - Ld[1]) > 7 && Math.hypot(x - B[0], y - B[1]) > 6 && bells.every(b => Math.hypot(b[0] - x, b[1] - y) > 8)) at = [x, y]; }
      if (!at) at = H.spot(0.6, 12, 28, 1.2) || H.polar(a0 + i / nb * H.TAU, 20);
      const ang = H.R(0, H.TAU); bells.push([at[0], at[1], ang]); H.put('frbellpost', at[0], at[1], ang, {});
    }
    const pit = FRP.PENT.slice(); for (let i = pit.length - 1; i > 0; i--) { const j = H.RI(0, i); [pit[i], pit[j]] = [pit[j], pit[i]]; }
    const tune = []; for (let i = 0; i < 2 + FR.reach; i++) { let b; do b = H.RI(0, nb - 1); while (b === tune[i - 1]); tune.push(b); }
    const hp = H.near(Ld[0], Ld[1], 0.5, 3, 7, 1.2) || [Ld[0] + 2.5, Ld[1] + 1.5], ha = Math.atan2(B[1] - hp[1], B[0] - hp[0]);
    H.put('frhornpost', hp[0], hp[1], ha, {});
    FRP_L = { kind: 'bells', bells, semi: pit.slice(0, nb), tune, horn: hp, hornA: ha };
  },
  enter() {
    frpEnter({ got: 0, hornN: 0, hornSeen: 0, hornT: 4, hornLock: 0, rg: [0, -1, 0], rgSeen: 0, wrong: 0, hornAt: -99 });
    fpsFeed('Ashore. Listen for the fog horn’s tune, then ring the island’s bells (Use) in that order.');
  },
  tick(dt) {
    const S = RAID.st; if (!frpTick(dt)) return;
    if (S.hornLock > 0) S.hornLock -= dt;
    if (S.hornT > 0) { S.hornT -= dt; if (S.hornT <= 0) frpHornSound(); }
  },
  q(sid, k, a) {
    const S = RAID.st, L = FRP_L; if (S.ph === 'lit') return;
    if (k === 'horn') { if (!(S.hornLock > 0)) frpHornSound(); return; }
    if (k !== 'ring') return;
    const i = a | 0; if (!(i >= 0 && i < L.bells.length)) return;
    const ok = L.tune[S.got] === i;
    S.rg = [S.rg[0] + 1, i, ok ? 1 : 2];
    if (ok) { S.got++; if (S.got >= L.tune.length) frpSolve(`${frpWho(sid)} rang the last note: the beacon catches.`); return; }
    S.got = 0; S.wrong++; frpSpawn(1 + frpN() + (FR.reach - 1));
    frIsleSay(`A wrong note${ZM.net ? ' (' + frpWho(sid) + ')' : ''}: the drowned wake. Listen again.`, true);
    S.hornT = 3.5;
  },
  pack(o) { frpPack(o); const S = RAID.st; o.fpl = [S.got, S.hornN, S.rg, S.wrong]; },
  apply(o) { frpApply(o); const S = RAID.st, a = o.fpl; if (!Array.isArray(a)) return; S.got = a[0] | 0; S.hornN = a[1] | 0; if (Array.isArray(a[2])) S.rg = [a[2][0] | 0, a[2][1] | 0, a[2][2] | 0]; S.wrong = a[3] | 0; },
  me(dt) {
    frpMe(dt); const S = RAID.st, L = FRP_L;
    if (S.hornN !== S.hornSeen) { S.hornSeen = S.hornN; S.hornAt = g.t; L.tune.forEach((b, i) => frpHornNote(L.semi[b], 0.15 + i * FRP.NOTE)); }
    if (S.rg[0] !== S.rgSeen) {
      S.rgSeen = S.rg[0]; const i = S.rg[1], b = L.bells[i];
      if (b) { const [pan, vol] = frpEar(b[0], b[1]); frpBellTone(L.semi[i], pan, vol); if (FRP3.kind === 'bells' && FRP3.bells && FRP3.bells[i]) FRP3.bells[i].sw = 1; }
      if (S.rg[2] === 2) try { if (!soundOff()) zmSound('over'); } catch (e) {}
    }
  },
  consider(c) {
    if (RAID.st.ph === 'lit') return; const L = FRP_L;
    L.bells.forEach((b, i) => c({ k: 'frpbell', i }, b[0], b[1], 0, FRP.BELL_R, false));
    c({ k: 'frphorn' }, L.horn[0], L.horn[1], 0, 2.2, false);
  },
  prompt(o) { return o.k === 'frpbell' ? { text: soundOff() ? `Ring the ${FRP.BNAME[o.i]} bell` : 'Ring the bell' } : o.k === 'frphorn' ? { text: 'Sound the fog horn (the tune again)' } : null; },
  use(o) { if (o.k === 'frpbell') { raidAsk('ring', o.i); return true; } if (o.k === 'frphorn') { raidAsk('horn'); return true; } return false; },
  hud(phone, mono) {
    const S = RAID.st, L = FRP_L, n = L.tune.length, lit = S.ph === 'lit';
    const line = lit ? frpLitLine() : `The Bell Buoys: ring the bells (Use) in the order of the fog horn’s tune · ${S.got} of ${n} · the horn post by the landing sounds it again`;
    const [x, y] = frpLine(line, lit ? '#ffe2a8' : null, phone, mono);
    if (lit) { ctx.textBaseline = 'alphabetic'; return; }
    // a pip a note: lit as they're rung right; while the horn sounds, the note it's on (and, with the sound off, its
    // bell's colour)
    const playing = g.t - S.hornAt < frpTuneLen(), on = playing ? Math.floor((g.t - S.hornAt - 0.15) / FRP.NOTE) : -1, deaf = soundOff(), r = phone ? 5 : 7;
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 4, y - 4, n * r * 3 + 8 + (phone ? 90 : 130), r * 2 + 8);
    for (let i = 0; i < n; i++) {
      const px = x + r + i * r * 3, py = y + r;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283);
      ctx.fillStyle = i < S.got ? '#ffd88a' : i === on ? (deaf ? FRP.BCOL[L.tune[i]] : '#e8f0f8') : 'rgba(80,70,60,0.7)'; ctx.fill();
    }
    ctx.font = mono(phone ? 9 : 11); ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(236,228,207,0.7)';
    ctx.fillText(playing ? 'the horn sounds…' : S.wrong ? `${S.wrong} wrong` : '', x + n * r * 3 + 6, y + r);
    fpsHudNote(y + r * 2 + 6); ctx.textBaseline = 'alphabetic';
  },
  b3(grp) {
    const L = FRP_L; if (L.kind !== 'bells') return;
    const bells = L.bells.map((b, i) => {
      const [hx, hy] = [b[0] + Math.cos(b[2]) * 0.62, b[1] + Math.sin(b[2]) * 0.62], z = frpGz(b[0], b[1]) + 2.5, col = new THREE.Color(FRP.BCOL[i]);
      const G = new THREE.Group(); G.position.copy(z3v(hx, hy, z)); G.rotation.y = b[2]; grp.add(G);
      const brass = frpMat(0x9a7a40, 0x1a1408), band = frpMat(col.getHex(), col.clone().multiplyScalar(0.25).getHex());
      const bell = frpMesh(new THREE.CylinderGeometry(0.17, 0.36, 0.55, 14, 1, true), brass, 0, -0.32, 0); bell.material.side = THREE.DoubleSide;
      const S = new THREE.Group(); G.add(S); S.add(bell);
      frpMesh(new THREE.SphereGeometry(0.17, 10, 6, 0, 6.283, 0, Math.PI / 2), brass, 0, -0.05, 0, S);
      frpMesh(new THREE.TorusGeometry(0.33, 0.035, 6, 16), band, 0, -0.52, 0, S).rotation.x = Math.PI / 2;
      // a pennant in its colour, on the post's top
      const pen = frpMesh(new THREE.PlaneGeometry(0.5, 0.28), new THREE.MeshLambertMaterial({ color: col.getHex(), emissive: col.clone().multiplyScalar(0.2).getHex(), side: THREE.DoubleSide }), -0.42, 0.42, 0, G);
      const flash = frpGlow('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)', 2.4, 0); flash.material.color = col; flash.position.set(0, -0.3, 0); G.add(flash);
      return { G, S, pen, flash, sw: 0 };
    });
    Object.assign(FRP3, { on: true, kind: 'bells', bells });
  },
  f3(dt) {
    if (!FRP3.on || FRP3.kind !== 'bells') return;
    const S = RAID.st, L = FRP_L, playing = g.t - S.hornAt < frpTuneLen(), on = playing ? Math.floor((g.t - S.hornAt - 0.15) / FRP.NOTE) : -1, deaf = soundOff();
    FRP3.bells.forEach((b, i) => {
      b.sw = Math.max(0, b.sw - dt * 0.5);
      b.S.rotation.z = reduceMotion ? 0 : Math.sin(g.t * 9) * 0.4 * b.sw;
      b.pen.rotation.y = reduceMotion ? 0 : Math.sin(g.t * 2.3 + i) * 0.25;
      // (with the sound off, the bell the horn's on glows as it sounds)
      const hint = deaf && on >= 0 && L.tune[on] === i ? 0.6 : 0;
      b.flash.material.opacity = Math.max(b.sw * 0.8, hint);
    });
  },
  exit() { FRP3.on = false; },
};
// (hosting or alone) the fog horn sounds the tune (for everyone)
function frpHornSound() { const S = RAID.st; S.hornN++; S.hornLock = frpTuneLen(); S.hornT = 0; }

// ---------- The Tide Stones ----------
FRP_RULES.tide = {
  n: 'The Tide Stones',
  // the four stones round the island, the ring of water round the beacon's rock, the causeway's stones under it
  set(H, K, Z) {
    const { F, B, L: Ld } = frpFr(Z), [R0, R1] = FRP.MOAT, a0 = H.R(0, H.TAU), plates = [];
    for (let i = 0; i < 4; i++) {
      let at = null;
      for (let t = 0; t < 60 && !at; t++) { const [x, y] = H.polar(a0 + i * Math.PI / 2 + H.R(-0.3, 0.3), H.R(13, 19)); if (H.inside(x, y, 1.5) && H.clear(x, y, 1.3, t < 40 ? 1.0 : 0.3) && Math.hypot(x - B[0], y - B[1]) > R1 + 4 && Math.hypot(x - Ld[0], y - Ld[1]) > 5 && plates.every(p => Math.hypot(p[0] - x, p[1] - y) > 9)) at = [x, y]; }
      if (!at) at = H.spot(1.3, 12, 26, 0.5) || H.polar(a0 + i * Math.PI / 2, 16);
      plates.push(at); frpKeepCirc(H, at[0], at[1], 1.6);
    }
    frpKeepCirc(H, B[0], B[1], R1 + 0.6);
    const ca = bearingOf(Ld[0] - B[0], Ld[1] - B[1]), stones = [];
    for (let j = 0; j < 4; j++) { const d = R0 + 0.5 + j * (R1 - R0 - 1.0) / 3; stones.push([B[0] + Math.sin(ca) * d, B[1] + Math.cos(ca) * d]); }
    // (the Lost Man's Bell mustn't come up in the water)
    if (F.bell && Math.hypot(H.CX + F.bell[0] - B[0], H.CY + F.bell[1] - B[1]) < R1 + 2.5) for (let t = 0; t < 30; t++) { const at = H.spot(1.4, 12, FRI.R - 10, 2, 50); if (at && Math.hypot(at[0] - B[0], at[1] - B[1]) > R1 + 2.5) { F.bell = [at[0] - H.CX, at[1] - H.CY]; break; } }
    FRP_L = { kind: 'tide', plates, ca, stones, bea: B };
  },
  enter() {
    frpEnter({ pl: [0, 0, 0, 0], on: [0, 0, 0, 0], onSeen: [0, 0, 0, 0], up: 0, upSeen: 0 });
    fpsFeed('Ashore. The beacon’s rock is cut off by the tide. Hold all four stones down at once to raise the causeway.');
  },
  tick(dt) {
    const S = RAID.st, L = FRP_L; if (!frpTick(dt, 'More of the drowned come up out of the tide.')) return;
    const hold = FRP.HOLDT[Math.min(4, frpN()) - 1], P = (ZM.players || []).filter(p => !p.beacon);
    L.plates.forEach((p, i) => { const on = P.some(q => Math.hypot(q.x - p[0], q.y - p[1]) < FRP.PLATE_R && (q.jz || 0) < 1.2); S.on[i] = on ? 1 : 0; S.pl[i] = on ? hold : Math.max(0, S.pl[i] - dt); });
    if (!S.up && S.pl.every(t => t > 0)) { S.up = 1; frIsleSay('All four stones are down: the causeway rises to the beacon.', true); }
  },
  q(sid, k) { const S = RAID.st; if (k === 'light' && S.up && S.ph === 'dark') frpSolve(`${frpWho(sid)} lit the beacon on its rock.`); },
  // the water round the beacon's rock: in the way, but for the causeway once it's up
  block(x, y, pad) {
    const L = FRP_L, S = RAID.st; if (L.kind !== 'tide' || S.ph == null) return false;
    const [R0, R1] = FRP.MOAT, dx = x - L.bea[0], dy = y - L.bea[1], d = Math.hypot(dx, dy);
    if (d < R0 - pad || d > R1 + pad) return false;
    if (S.up) { const ux = Math.sin(L.ca), uy = Math.cos(L.ca); if (dx * ux + dy * uy > 0 && Math.abs(dx * uy - dy * ux) < 1.15) return false; }
    return true;
  },
  pack(o) { frpPack(o); const S = RAID.st; o.fpt = [S.pl.map(t => Math.round(t * 10)), S.on.join(''), S.up]; },
  apply(o) { frpApply(o); const S = RAID.st, a = o.fpt; if (!Array.isArray(a)) return; if (Array.isArray(a[0])) S.pl = a[0].slice(0, 4).map(t => (t | 0) / 10); const s = String(a[1] || ''); if (s.length === 4) S.on = s.split('').map(c => c === '1' ? 1 : 0); S.up = a[2] ? 1 : 0; },
  me(dt) {
    frpMe(dt); const S = RAID.st, L = FRP_L;
    S.on.forEach((v, i) => { if (v !== S.onSeen[i]) { S.onSeen[i] = v; if (v && S.pl[i] > 0) { const [, vol] = frpEar(L.plates[i][0], L.plates[i][1], 40); frpThud(vol); } } });
    if (S.up !== S.upSeen) { S.upSeen = S.up; if (S.up) try { if (!soundOff()) { zmSound('open'); noise('lowpass', 160, 1, 0.4, 0.4, 2.6); } } catch (e) {} }
    frpLightMe(dt, S.up && S.ph === 'dark');
  },
  consider(c) { const S = RAID.st; frpLightConsider(c, S.up && S.ph === 'dark'); },
  prompt(o) { return o.k === 'frplight' ? { text: 'Hold to light the beacon', hold: true } : null; },
  use(o) { return o.k === 'frplight'; },
  hud(phone, mono) {
    const S = RAID.st, n = frpN(), hold = FRP.HOLDT[Math.min(4, n) - 1], lit = S.ph === 'lit';
    const line = lit ? frpLitLine() : S.up ? 'The causeway is up: cross to the beacon and light it (hold Use)'
      : `The Tide Stones: hold all four stones down at once to raise the causeway (a stone stays down ${hold} s after you step off) · more drowned in ${frpDrownIn()} s`;
    const [x, y] = frpLine(line, lit ? '#ffe2a8' : S.up ? '#ffe2a8' : null, phone, mono);
    if (!lit && !S.up) {
      // four pips: lit while each stone's down, emptying as its time runs out
      const s = phone ? 16 : 22, gap = phone ? 6 : 8;
      ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 4, y - 4, 4 * (s + gap) + 4, s + (phone ? 20 : 24));
      ctx.font = mono(phone ? 8 : 10); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      S.pl.forEach((t, i) => {
        const px = x + i * (s + gap), k = clamp(t / hold, 0, 1);
        ctx.fillStyle = 'rgba(80,70,60,0.7)'; ctx.fillRect(px, y, s, s);
        ctx.fillStyle = S.on[i] ? '#ffd88a' : `rgba(140,200,220,${0.55 + 0.3 * k})`; ctx.fillRect(px, y + s * (1 - k), s, s * k);
        ctx.fillStyle = 'rgba(236,228,207,0.75)'; ctx.fillText(S.on[i] ? 'on' : t > 0 ? `${Math.ceil(t)} s` : 'up', px + s / 2, y + s + 3);
      });
      ctx.textAlign = 'left'; fpsHudNote(y + s + (phone ? 16 : 20));
    }
    frpUseRing(); ctx.textBaseline = 'alphabetic';
  },
  b3(grp) {
    const L = FRP_L; if (L.kind !== 'tide') return;
    const [R0, R1] = FRP.MOAT, B = L.bea;
    // the water: as high as the ground anywhere round it, a little over
    let wz = -9; for (let i = 0; i < 24; i++) for (const d of [R0, (R0 + R1) / 2, R1]) wz = Math.max(wz, frpGz(B[0] + Math.sin(i / 24 * 6.283) * d, B[1] + Math.cos(i / 24 * 6.283) * d));
    wz += 0.07;
    const water = frpMesh(new THREE.RingGeometry(R0, R1, 56, 1), new THREE.MeshLambertMaterial({ color: 0x0c1a22, emissive: 0x02070a, transparent: true, opacity: 0.94, side: THREE.DoubleSide }), 0, 0, 0, grp);
    water.rotation.x = -Math.PI / 2; water.position.copy(z3v(B[0], B[1], wz));
    const foam = frpMesh(new THREE.RingGeometry(R1 - 0.1, R1 + 0.12, 56, 1), new THREE.MeshBasicMaterial({ color: 0x6a8890, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, grp);
    foam.rotation.x = -Math.PI / 2; foam.position.copy(z3v(B[0], B[1], wz + 0.01));
    const sm = frpMat(0x585a54), stones = L.stones.map(([x, y]) => { const m = frpMesh(new THREE.CylinderGeometry(0.72, 0.85, 0.5, 10), sm, 0, 0, 0, grp); m.position.copy(z3v(x, y, wz - 0.45)); m.rotation.y = x * 3.1; return m; });
    const plates = L.plates.map(([x, y]) => {
      const G = new THREE.Group(), z = frpGz(x, y); G.position.copy(z3v(x, y, z)); grp.add(G);
      frpMesh(new THREE.CylinderGeometry(1.45, 1.55, 0.12, 20), frpMat(0x3a3c38), 0, 0.02, 0, G);
      const mat = frpMat(0x6a6c66), slab = frpMesh(new THREE.CylinderGeometry(1.2, 1.28, 0.26, 20), mat, 0, 0.16, 0, G);
      const rm = new THREE.MeshBasicMaterial({ color: 0x9adcf0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const rune = frpMesh(new THREE.RingGeometry(0.55, 0.85, 24, 1), rm, 0, 0.3, 0, slab); rune.rotation.x = -Math.PI / 2; rune.position.y = 0.14;
      const glow = frpGlow('rgba(160,230,255,0.9)', 'rgba(120,200,240,0)', 3.2, 0); glow.position.y = 0.6; G.add(glow);
      return { slab, mat, rm, glow, k: 0 };
    });
    Object.assign(FRP3, { on: true, kind: 'tide', water, stones, plates, wz, upK: 0 });
  },
  f3(dt) {
    if (!FRP3.on || FRP3.kind !== 'tide') return;
    const S = RAID.st, L = FRP_L, hold = FRP.HOLDT[Math.min(4, frpN()) - 1];
    FRP3.upK += ((S.up ? 1 : 0) - FRP3.upK) * Math.min(1, dt * 1.5);
    FRP3.stones.forEach((m, j) => { const k = clamp(FRP3.upK * 1.6 - j * 0.2, 0, 1); m.position.copy(z3v(L.stones[j][0], L.stones[j][1], FRP3.wz - 0.45 + 0.55 * k + (reduceMotion ? 0 : Math.sin(g.t * 1.3 + j) * 0.02))); });
    FRP3.water.position.copy(z3v(L.bea[0], L.bea[1], FRP3.wz + (reduceMotion ? 0 : Math.sin(g.t * 0.9) * 0.03)));
    FRP3.plates.forEach((p, i) => {
      const k = S.up ? 1 : clamp(S.pl[i] / hold, 0, 1), down = S.up || S.pl[i] > 0 ? 1 : 0;
      p.k += (down - p.k) * Math.min(1, dt * 6);
      p.slab.position.y = 0.16 - 0.14 * p.k;
      p.mat.emissive.setRGB(0.08 * p.k * k, 0.28 * p.k * k, 0.36 * p.k * k);
      p.rm.opacity = 0.15 + 0.7 * p.k * k; p.glow.material.opacity = 0.45 * p.k * k * (S.on[i] ? 1 : 0.6 + 0.4 * Math.sin(g.t * 6));
    });
  },
  exit() { FRP3.on = false; },
};

frKind('puzzle', { n: 'Puzzle', mark: '🔍', weight: 2, rules: Object.keys(FRP_RULES), rn: r => (FRP_RULES[r] || {}).n || '' }, friStage(FRP_RULES, { music: FR_MUSIC.puzzle }));
