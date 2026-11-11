// Fog Run: the islands (RAID_STAGES['fr_' + kind], registered with frKind, src/frrun.js), and the tools they share.
//
// Each island is a small one (FRI.R, 40 m, across its radius) in one of Wreckers' Night's island looks (FPS_ISLES:
// the Shingle Skerry, Wreckers' Reef, Chapel Islet, Smugglers' Cove, Signal Head, the Salt Marsh), drawn from the run's
// seed, with its own rocks, wrecks and props as that look lays them out, only fewer. The fog on land is the look's own
// fog pulled in to the reach's (frFog). The cutter is run up on its beach: you land at the clearest stretch of shore on
// the side you came from (the landing, the stage's start), and the island's light (its beacon, for a Fight) stands near
// the middle.
//
// The tools (for any island kind):
//   frIsleLook(i)      (prep) the look for plan entry i, into FPS_ISLES.frisle, and the map (FRI_MAP) at its size
//   FPI_GEN.frisle     lays it out: the look's set piece, the landing (a boat drawn up, a lamp on a post), the
//                      beacon (FPI_K.frbeacon) near the middle, then the stage's own set(H, K, Z) and the look's props;
//                      where the landing and the beacon ended up: FPS.g.isle.zm.fr { land: [x, y], bea: [x, y] }
//   frIsleLit()        (hosting or alone) the island's light is lit: everyone lost in the fog is brought back
//                      (frBringBack), the fog pushed back FR_PUSH for the rest of the reach, the drowned on it sink
//                      away, and it's counted (FR.lit)
//   frIsleSpawn(o)     (hosting or alone) one of the drowned rising out of the shore, away from all of you
//   frIsleSay(text, warn)  a line for everyone (the host's, in the stage's word)
//
// One kind so far: the Fight (RAID_STAGES.fr_fight), with one rule of its three, Hold the Light (FRI_RULES.hold):
//  - Light the beacon: hold Use at it for FRI.USE seconds (anyone).
//  - Then hold the drowned off it for FRI.HOLD seconds. They come up out of the shore all the while, more of them
//    the more of you there are, and while it burns they go for it as well as for you: let them crowd it for FRI.DOUSE
//    seconds' worth (two at once count twice) and they put it out. The clock stops until it's lit again (and keeps
//    what it had).
//  - Held: the beacon's beam goes up through the fog (frIsleLit), and FRI.AWAY seconds later you're back aboard
//    (frIslandDone: the salvage, step 3, then the next sail).
// Its other rules (Clear the Shore, the Crab Tide) go in FRI_RULES beside it; the plan's entry names the rule.
// Together it's host-authoritative: the host runs the beacon, its clock and the drowned and sends them in the stage's
// word (fi: phase, clock, how near it is to being put out, how often lit and put out, who lit it last; fsy: a line); a
// joined player asks the host to light it (raidAsk 'light').

const FRI = { R: 40, USE: 4, HOLD: 60, DOUSE: 2.5, DOUSE_R: 2.3, AWAY: 7, FOGC: '#10151b', TOP: 3.2 };
const FRI_PH = ['dark', 'burn', 'out', 'lit'];

// ---------- the island's look, small ----------
function frIsleLook(i) {
  const p = FR.plan[i] || { look: 'shingle', reach: 1 }, B = FPS_ISLES[p.look] || FPS_ISLES.shingle, fog = frFog(typeof frcFogReach === 'function' ? frcFogReach(p) : p.reach) * (typeof frcSee === 'function' ? frcSee() : 1);   // [fogrun cards] (the haar lifted; the Keeper's Oilcan)
  FPS_ISLES.frisle = Object.assign({}, B, {
    look: FPS_ISLES[p.look] ? p.look : 'shingle',
    rocks: [Math.ceil(B.rocks[0] * 0.35), B.rocks[1], Math.min(B.rocks[2], 5), B.rocks[3]],
    wrecks: [Math.min(1, B.wrecks[0]), B.wrecks[1] || 6, Math.min(B.wrecks[2] || 8, 7)],
    fog: [FRI.FOGC, Math.round(fog * 0.2), Math.round(Math.min(B.fog[2], fog))],
    birds: [B.birds[0], Math.min(3, B.birds[1])], pebbles: Math.round(B.pebbles * 0.3), tufts: [B.tufts[0], Math.round(B.tufts[1] * 0.3)], pools: Math.round(B.pools * 0.3), wrack: Math.round(B.wrack * 0.5),
    indoor: false, keep: false, arena: false, noGround: false,
  });
  FRI_MAP.zones.isle.n = B.name;
}
FPS_ISLES.frisle = Object.assign({}, FPS_ISLES.shingle, { look: 'shingle' });
const FRI_MAP = { start: [0, -(FRI.R - 7)], top: 0, R: FRI.R, isle: 'frisle', shore: () => -999, nav: [-FRI.R, FRI.R, -FRI.R, FRI.R], zones: { isle: { n: 'the island', r: [-FRI.R, FRI.R, -FRI.R, FRI.R], sky: true } } };
FPI_GEN.frisle = {
  built: true,
  set(H) {
    const T = H.I.T, L = FPI_GEN[T.look] || {}, S = raidStage() || {}, { R, CX, CY, IR } = H;
    const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] };
    // the look's own set piece first (the chapel, the signal tower, the jetty and boathouse)
    if (L.set) L.set(H);
    // the landing: the clearest stretch of shore on the south side (where she came in from), a boat drawn up, a lamp
    let land = null;
    for (let k = 0; k < 24 && !land; k++) { const a = -Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.22, [x, y] = H.polar(a, IR - 7); if (H.clear(x, y, 3, 1)) land = [x, y, a]; }
    if (!land) { const [x, y] = H.polar(-Math.PI / 2, IR - 7); land = [x, y, -Math.PI / 2]; }
    { const [bx, by] = H.polar(land[2] + 0.12, IR - 2.5); H.put('boat', bx, by, land[2] + Math.PI / 2 + 0.3, { len: 4.6, beam: 1.6, paint: '#34465a' }); }
    { const [lx, ly] = H.polar(land[2] - 0.1, IR - 5); fpiLanternPost(H, lx, ly, land[2]); }
    // the beacon: near the middle, wherever's clear
    const at = H.spot(2.2, 0, 10, 2.4, 200) || H.spot(2.2, 0, 22, 2, 200) || [CX, CY];
    H.put('frbeacon', at[0], at[1], R(0, H.TAU), {});
    H.track([[land[0], land[1]], [(land[0] + at[0]) / 2 + R(-3, 3), (land[1] + at[1]) / 2 + R(-3, 3)], [at[0], at[1]]]);
    Z.fr = { land: [land[0] - CX, land[1] - CY], landA: land[2], bea: [at[0] - CX, at[1] - CY] };
    // (where you come ashore: the landing, a little up the beach)
    ZMD.START = Z.fr.land.slice(); FRI_MAP.start = Z.fr.land.slice();
    if (S.set) S.set(H, zmKit(H, Z), Z);
  },
  props(H) { const L = FPI_GEN[H.I.T.look] || {}; if (L.props) L.props(H); },
  decor() {},
};
// the beacon: a cairn of stones, an iron post up out of it and the cresset on top, full of tarred wood (its fire and
// its beam are the stage's 3D)
FPI_K.frbeacon = {
  col: FPI_C.stone,
  sol(p) { return [fpiCirc(p, 0, 0, 1.15, 1.4)]; },
  b3(p, A) {
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + A.r() * 0.3, d = 0.75 + A.r() * 0.35; A.part('ico', i % 3 ? FPI_C.stone : FPI_C.stone2, Math.cos(a) * d, Math.sin(a) * d, 0.2 + A.r() * 0.3, 0.55, 0.45, 0.5, A.r() * 3); }
    A.cyl(FPI_C.stone3, 0, 0, 0, 0.85, 1.2, 0, 0, 0, 'cyl8');
    A.cyl(FPI_C.iron, 0, 0, 1.1, 0.09, 1.8, 0, 0, 0, 'cyl6');
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; A.part('cyl6', FPI_C.iron, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 2.75, 0.05, 0.7, 0.05, a, 0, 0.45); }
    A.part('cone', FPI_C.iron, 0, 0, 3.05, 0.85, -0.5, 0.85);
    for (let i = 0; i < 5; i++) A.log(FPI_C.tar, (A.r() - 0.5) * 0.35, (A.r() - 0.5) * 0.35, 3.0, 0.07, 0.8, i * 0.7, (A.r() - 0.5) * 0.5);
  },
};
const friLand = () => { const F = FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.fr; return F ? [FPSC.CX + F.land[0], FPSC.CY + F.land[1]] : [FPSC.CX, FPSC.CY - FRI.R + 7]; };
const friBeacon = () => { const F = FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.fr; return F ? [FPSC.CX + F.bea[0], FPSC.CY + F.bea[1]] : [FPSC.CX, FPSC.CY]; };
const friNick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';

// ---------- what every island stage does alike ----------
function frIsleSay(text, warn) { if (ZM.net !== 'client') { const S = RAID.st; S.say = [((S.say || [0])[0] | 0) + 1, text, warn ? 1 : 0]; } frIsleHear(text, warn); }
function frIsleHear(text, warn) { fpsFeed(text); if (warn) ZM.banner = { text, t: 2.8, small: true, col: '#ffe2a8' }; }
// (hosting or alone) the island's light is lit
function frIsleLit() {
  FR.lit = (FR.lit | 0) + 1; frFogPush(FR_PUSH);
  frBringBack();
  for (const z of ZM.z) if (!z.dead) { z.dead = 1; z.deadT = 0; z.burn = true; if (typeof zmKillFx === 'function') zmKillFx(z); }
}
// (hosting or alone) one of the drowned up out of the shore, at least 12 m from everyone; o: raidSpawnAt's
function frIsleSpawn(o) {
  const P = ZM.players || [];
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * 6.283, d = FRI.R - 3 - Math.random() * 5, x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (P.some(p => !p.beacon && Math.hypot(p.x - x, p.y - y) < 12)) continue;
    if (zmBlockedAt(x, y, 0.5, 0)) continue;
    return raidSpawnAt(x, y, o);
  }
  return null;
}
// what kind comes up: more runners the further out you are
function frIsleKindOf() { const u = Math.random(), run = 0.08 + 0.06 * (FR.stop | 0) + 0.05 * (FR.reach - 1); return u < run ? 'run' : u < run + 0.55 ? 'jog' : 'walk'; }
// the island's fog: the look's, pulled in to the reach's (and pushed back as the lights are lit)
function frIsleFog() { if (typeof GL3D === 'undefined' || !GL3D.scene || !GL3D.scene.fog) return; const F = GL3D.scene.fog, far = Math.min(FPS_ISLES.frisle.fog[2] + FR_PUSH * 4, frFog(typeof frcFogReach === 'function' ? frcFogReach(frPlanNow()) : FR.reach) * (typeof frcSee === 'function' ? frcSee() : 1)); F.far += (far - F.far) * 0.04; F.near = F.far * 0.2; }   // [fogrun cards] (the haar lifted; the Keeper's Oilcan)

// ---------- the rules of a Fight ----------
const FRI_RULES = {};
FRI_RULES.hold = {
  n: 'Hold the Light',
  enter() {
    Object.assign(RAID.st, { ph: 'dark', holdT: 0, douse: 0, lightN: 0, outN: 0, by: '', awayT: 0, spT: 4, useT: 0, pend: 0, say: [0, '', 0], seenSay: 0, phSeen: 'dark' });
    fpsFeed('Ashore. Light the beacon (hold Use at it, in the middle of the island), then hold the drowned off it for a minute.');
  },
  tick(dt) {
    const S = RAID.st, n = Math.max(1, ZM.hum.length), [bx, by] = friBeacon();
    // the drowned, up out of the shore: a few while it's dark, a steady stream while it burns
    if (S.ph !== 'lit') {
      S.spT -= dt;
      const alive = ZM.z.filter(z => !z.dead).length, prog = S.holdT / FRI.HOLD, cap = S.ph === 'dark' ? 2 + n : Math.round((4 + 2 * n + prog * 4) * (1 + 0.5 * (n - 1)) / (1 + 0.25 * (n - 1)));
      if (S.spT <= 0) {
        if (alive < cap) frIsleSpawn({ kind: frIsleKindOf(), hp: zmHp(RAIDC.ROUND + (FR.stop | 0) + (FR.reach - 1) * 2) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)) });
        S.spT = (S.ph === 'dark' ? 6 : 2.6 - 1.2 * prog) * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (n - 1));
      }
    }
    if (S.ph === 'burn') {
      S.holdT += dt;
      // crowding it: two at once count twice
      let k = 0; for (const z of ZM.z) if (!z.dead && !(z.rr > 0) && Math.hypot(z.x - bx, z.y - by) < FRI.DOUSE_R) k++;
      S.douse = k ? S.douse + dt * k : Math.max(0, S.douse - dt * 0.6);
      if (S.douse >= FRI.DOUSE) { S.ph = 'out'; S.outN++; S.douse = 0; frIsleSay('They’ve put the beacon out! Light it again.', true); }
      else if (S.holdT >= FRI.HOLD) { S.ph = 'lit'; S.awayT = 0; frIsleLit(); frIsleSay(`The beacon is lit, and its light goes up through the fog. Back aboard in ${FRI.AWAY} seconds.`, true); }
    }
    if (S.ph === 'lit') { S.awayT += dt; if (S.awayT >= FRI.AWAY) frIslandDone(); }
  },
  q(sid, k) {
    const S = RAID.st;
    if (k === 'light' && (S.ph === 'dark' || S.ph === 'out')) { const again = S.ph === 'out'; S.ph = 'burn'; S.lightN++; S.by = sid; S.douse = 0; frIsleSay(`${friNick(sid)} ${again ? 'lit the beacon again' : 'lit the beacon'}. Hold them off it: ${Math.ceil(FRI.HOLD - S.holdT)} s.`, true); }
  },
  players(P) { const S = RAID.st; if (S.ph !== 'burn') return P; const [x, y] = friBeacon(); return P.concat([{ sid: '', x, y, jz: 0, beacon: true }]); },
  pack(o) { const S = RAID.st; o.fi = [FRI_PH.indexOf(S.ph), Math.round(S.holdT * 10), Math.round(S.douse * 10), S.lightN, S.outN, S.by || '', Math.round(S.awayT * 10)]; o.fsy = S.say; },
  apply(o) {
    const S = RAID.st;
    if (Array.isArray(o.fi)) { const a = o.fi; if (!(S.pend > 0) || FRI_PH[a[0] | 0] !== 'dark') S.ph = FRI_PH[a[0] | 0] || 'dark'; S.holdT = (a[1] | 0) / 10; S.douse = (a[2] | 0) / 10; S.lightN = a[3] | 0; S.outN = a[4] | 0; S.by = String(a[5] || ''); S.awayT = (a[6] | 0) / 10; }
    if (Array.isArray(o.fsy)) { const n = o.fsy[0] | 0; if (n > S.seenSay) { if (S.seenSay || n === 1) frIsleHear(String(o.fsy[1] || ''), !!o.fsy[2]); S.seenSay = n; } }
  },
  me(dt) {
    const S = RAID.st, m = FPS.me, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
    if (S.pend > 0) S.pend -= dt;
    // the sound of it catching, going out, going up
    if (S.ph !== S.phSeen) { const was = S.phSeen; S.phSeen = S.ph; try { if (!soundOff()) { if (S.ph === 'burn') sfxFlare(); else if (S.ph === 'lit') { zmSound('round'); sfxBell(); } else if (S.ph === 'out' && was === 'burn') zmSound('over'); } } catch (e) {} }
    // holding Use at the beacon lights it
    const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
    if (hold && o && o.k === 'frbeacon' && alive && !(S.pend > 0) && (S.ph === 'dark' || S.ph === 'out')) {
      S.useT += dt;
      if (S.useT >= FRI.USE) { S.useT = 0; S.pend = 1.2; raidAsk('light'); }
    } else S.useT = 0;
  },
  consider(c) { const S = RAID.st; if (S.ph === 'dark' || S.ph === 'out') { const [x, y] = friBeacon(); c({ k: 'frbeacon' }, x, y, 0, 2.6, false); } },
  prompt(o) { if (o.k === 'frbeacon') return { text: RAID.st.ph === 'out' ? 'Hold to light the beacon again' : 'Hold to light the beacon', hold: true }; return null; },
  use(o) { return o.k === 'frbeacon'; },
  hud(phone, mono, fell) {
    const S = RAID.st, L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t;
    const line = S.ph === 'dark' ? 'Light the beacon: hold Use at it, near the middle of the island'
      : S.ph === 'burn' ? `Hold the Light: keep the drowned off the beacon · ${Math.ceil(FRI.HOLD - S.holdT)} s`
      : S.ph === 'out' ? `They put it out! Light the beacon again · ${Math.ceil(FRI.HOLD - S.holdT)} s still to hold`
      : `The beacon is lit. Back aboard in ${Math.max(0, Math.ceil(FRI.AWAY - S.awayT))} s`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = S.ph === 'out' ? `rgba(255,150,110,${0.75 + 0.25 * Math.sin(t * 6)})` : S.ph === 'lit' ? '#ffe2a8' : 'rgba(236,228,207,0.85)';
    ctx.fillText(line, L, top, W * 0.6); fpsHudNote(top + (phone ? 14 : 18));
    // the hold: a bar of how long it's burned, and under it how near they are to putting it out
    if (S.ph !== 'dark') {
      const x = L, y = top + (phone ? 20 : 26), w = phone ? 150 : 214, h = phone ? 6 : 8;
      ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 4, y - 4, w + 8, h * 2 + 14);
      ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ffc070'; ctx.fillRect(x, y, w * clamp(S.holdT / FRI.HOLD, 0, 1), h);
      ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(x, y + h + 6, w, h * 0.6); ctx.fillStyle = S.douse > FRI.DOUSE * 0.5 ? `rgba(220,90,70,${0.75 + 0.25 * Math.sin(t * 8)})` : '#6a8aa0'; ctx.fillRect(x, y + h + 6, w * clamp(S.douse / FRI.DOUSE, 0, 1), h * 0.6);
      fpsHudNote(y + h * 2 + 12);
    }
    // lighting it: a ring round the sights filling
    if (S.useT > 0) {
      const k = Math.min(1, S.useT / FRI.USE);
      ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
  },
};

// ---------- the Fight's stage ----------
const friRule = () => FRI_RULES[(frPlanNow() || {}).rule] || FRI_RULES.hold;
const friCall = (k, ...a) => { const R = friRule(); return typeof R[k] === 'function' ? R[k](...a) : undefined; };
frKind('fight', { n: 'Fight', mark: '⚔', weight: 3 }, {
  get n() { return (FPS_ISLES.frisle && FPS_ISLES.frisle.name) || 'an island'; },
  map: FRI_MAP, mend: true, open: true,
  music: () => FR_MUSIC.isle,
  prep(i) { frIsleLook(i); },
  enter() { frEnterStage(); friCall('enter'); },
  banner() { const R = FR_REACH[FR.reach] || FR_REACH[1]; return { text: FPS_ISLES.frisle.name, t: 4.5, sub: `${R.n} · stop ${FR.stop} · ${friRule().n}`, col: '#ffe2a8' }; },
  tick(dt) { friCall('tick', dt); },
  me(dt) { friCall('me', dt); },
  q(sid, k, a) { friCall('q', sid, k, a); },
  pack(o) { friCall('pack', o); },
  apply(o) { friCall('apply', o); },
  players(P) { return friCall('players', P) || P; },
  consider(c) { friCall('consider', c); },
  prompt(o) { return friCall('prompt', o) || null; },
  use(o) { return !!friCall('use', o); },
  hud(phone, mono, fell) { friCall('hud', phone, mono, fell); },
  b3(grp) { fri3dBuild(grp); },
  f3(dt) { fri3d(dt); },
  exit() { FRI3.on = false; },
});

// ---------- in 3D: the beacon's fire, and its beam up through the fog ----------
const FRI3 = { on: false };
function fri3dBuild(grp) {
  const [bx, by] = friBeacon(), Z = FPSC.GROUND + fpsIsleH(FPS.g.isle, bx, by);
  const soft = z3Soft('rgba(255,210,150,0.95)', 'rgba(255,170,90,0)');
  FRI3.on = true;
  FRI3.fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  FRI3.fire.position.copy(z3v(bx, by, Z + FRI.TOP + 0.3)); FRI3.fire.scale.set(1.6, 2.2, 1); grp.add(FRI3.fire);
  FRI3.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4, fog: false }));
  FRI3.halo.position.copy(FRI3.fire.position); FRI3.halo.scale.setScalar(9); grp.add(FRI3.halo);
  FRI3.light = new THREE.PointLight(0xffb060, 0, 26, 1.3); FRI3.light.position.copy(z3v(bx, by, Z + FRI.TOP + 0.6)); grp.add(FRI3.light);
  // the beam: a tall pale column of light, up through the fog
  const bm = new THREE.MeshBasicMaterial({ color: 0xffe6b8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  FRI3.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 4.5, 260, 20, 1, true), bm); FRI3.beam.position.copy(z3v(bx, by, Z + FRI.TOP + 130)); grp.add(FRI3.beam);
  FRI3.core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.2, 260, 12, 1, true), bm.clone()); FRI3.core.position.copy(FRI3.beam.position); grp.add(FRI3.core);
  FRI3.beamK = 0;
}
function fri3d(dt) {
  if (!FRI3.on || !FRI3.fire) return;
  const S = RAID.st, t = g.t, lit = S.ph === 'burn' || S.ph === 'lit', fl = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5.3);
  FRI3.fire.visible = FRI3.halo.visible = lit;
  FRI3.fire.scale.set(1.6 * fl, 2.3 * (2 - fl), 1); FRI3.halo.material.opacity = 0.35 * fl * (S.ph === 'lit' ? 1.6 : 1);
  FRI3.light.intensity = lit ? 2.2 * fl : 0;
  FRI3.beamK += ((S.ph === 'lit' ? 1 : 0) - FRI3.beamK) * Math.min(1, dt * 1.2);
  FRI3.beam.visible = FRI3.core.visible = FRI3.beamK > 0.01;
  FRI3.beam.material.opacity = 0.22 * FRI3.beamK; FRI3.core.material.opacity = 0.5 * FRI3.beamK;
  frIsleFog();
}
