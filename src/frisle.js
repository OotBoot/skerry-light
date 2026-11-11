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
// (alone, 'You'; together, the lobby name, since the line goes to everyone as the host wrote it)
const friNick = sid => !ZM.net ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || (sid === FPS.me.id ? 'The host' : 'Someone');

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

// ---------- the stage every island kind is built on ----------
// friStage(rules, o): a RAID_STAGES-style stage for an island kind whose ways of playing are its rules (FRI_RULES for
// the Fight; src/frpuzzle.js's for the Puzzle...). The plan's entry names the rule; if it names none this kind has,
// one's drawn from the run's seed (the same on every screen). A rule has any of the stage's hooks (enter, tick, me,
// q, pack, apply, players, consider, prompt, use, hud, kill, hurt, block, shot, set (laying out its own things, from
// the island's set), b3, f3, exit, music), plus n (its name on the banner) and w (how often it's drawn: 1). What every
// island has alike is done here round the rule's own: the beacon's fire and beam (RAID.st.ph 'burn' or 'lit' light
// them), the fog, and the Lost Man's Bell (below). o: { music } (the kind's music, unless the rule says).
function friPick(rules, n) {
  const ks = Object.keys(rules), tot = ks.reduce((a, k) => a + (rules[k].w == null ? 1 : rules[k].w), 0);
  let u = frRng(300 + (n | 0))() * tot;
  for (const k of ks) { u -= rules[k].w == null ? 1 : rules[k].w; if (u < 0) return k; }
  return ks[0];
}
function friStage(rules, o) {
  o = o || {};
  const rule = () => { const p = frPlanNow() || {}; return rules[p.rule] || rules[friPick(rules, p.n)]; };
  const call = (k, ...a) => { const R = rule(); return R && typeof R[k] === 'function' ? R[k](...a) : undefined; };
  return {
    get n() { return (FPS_ISLES.frisle && FPS_ISLES.frisle.name) || 'an island'; },
    map: FRI_MAP, mend: true, open: true,
    music: () => call('music') || o.music || FR_MUSIC.isle,
    prep(i) { const p = FR.plan[i]; if (p && !rules[p.rule]) p.rule = friPick(rules, p.n); frIsleLook(i); const R = p && rules[p.rule]; if (R && R.prep) R.prep(i); },
    set(H, K, Z) { friBellSet(H); call('set', H, K, Z); },
    enter() { frEnterStage(); friBellEnter(); call('enter'); },
    banner() { const R = FR_REACH[FR.reach] || FR_REACH[1]; return { text: FPS_ISLES.frisle.name, t: 4.5, sub: `${R.n} · stop ${FR.stop} · ${(rule() || {}).n || ''}`, col: '#ffe2a8' }; },
    tick(dt) { call('tick', dt); friBellTick(dt); },
    me(dt) { call('me', dt); friBellMe(dt); },
    q(sid, k, a) { if (k === 'bell') friBellQ(sid); else call('q', sid, k, a); },
    pack(x) { call('pack', x); friBellPack(x); },
    apply(x) { call('apply', x); friBellApply(x); },
    players(P) { return friBellPlayers(call('players', P) || P); },
    consider(c) { call('consider', c); friBellConsider(c); },
    prompt(x) { return friBellPrompt(x) || call('prompt', x) || null; },
    use(x) { return x.k === 'frbell' || !!call('use', x); },
    hud(phone, mono, fell) { call('hud', phone, mono, fell); friBellHud(phone, mono, fell); },
    kill(d, how, by) { call('kill', d, how, by); },
    hurt(d, dmg, code, by) { const r = call('hurt', d, dmg, code, by); return r == null ? dmg : r; },
    block(x, y, pad, feet) { return !!call('block', x, y, pad, feet); },
    shot(...a) { call('shot', ...a); },
    b3(grp) { fri3dBuild(grp); friBell3dBuild(grp); call('b3', grp); },
    f3(dt) { fri3d(dt); friBell3d(dt); call('f3', dt); },
    exit() { FRI3.on = false; FRIB3.on = false; call('exit'); },
  };
}
// the rule playing now (for any island stage)
const friRule = () => { const S = raidStage(), p = frPlanNow() || {}; return S && S.fr === 'fight' ? FRI_RULES[p.rule] || FRI_RULES.hold : null; };
frKind('fight', { n: 'Fight', mark: '⚔', weight: 3 }, friStage(FRI_RULES));

// ---------- the Lost Man's Bell ----------
// Once any of you is lost in the fog, an old ship's bell on a frame rises out of the ground somewhere on the island,
// in the open (where it stands is laid out with the island: Z.fr.bell). Hold Use at it for FRIB.USE seconds and its
// ring brings everyone lost back (frBringBack). While it's up the drowned are drawn to it as to one of you. It sinks
// again once rung, and rises again if anyone else is lost. Host-authoritative: the host sees who's lost (FR.lost, and
// each joined player's frp), raises it, and is asked to ring it (raidAsk 'bell'); its word is fb: [up, rung].
const FRIB = { USE: 5, RISE: 2.5, R: 2.4 };
function friBellSet(H) {
  const Z = H.I.zm, F = Z.fr; if (!F) return;
  const at = H.spot(1.4, 14, FRI.R - 12, 3, 200) || H.spot(1.4, 6, FRI.R - 8, 2, 200) || [H.CX + 8, H.CY + 8];
  F.bell = [at[0] - H.CX, at[1] - H.CY];
}
const friBellAt = () => { const F = FPS.g && FPS.g.isle && FPS.g.isle.zm && FPS.g.isle.zm.fr; return F && F.bell ? [FPSC.CX + F.bell[0], FPSC.CY + F.bell[1]] : [FPSC.CX + 8, FPSC.CY + 8]; };
function friBellEnter() { Object.assign(RAID.st, { lb: 0, lbN: 0, lbUseT: 0, lbPend: 0, lbSeen: 0 }); }
// (hosting or alone) is anyone lost in the fog?
function friAnyLost() {
  if (ZM.ghost && FR.lost) return true;
  if (typeof FPS.remote !== 'undefined') for (const r of FPS.remote.values()) if (!r.left && r.dead && r.frLost) return true;
  return false;
}
function friBellTick() {
  const S = RAID.st; if (ZM.net === 'client' || S.ph === 'lit') return;
  if (!S.lb && friAnyLost()) { S.lb = 1; frIsleSay('A bell rises out of the fog: the Lost Man’s Bell. Ring it (hold Use) to bring back the lost.', true); }
}
function friBellQ(sid) {
  const S = RAID.st; if (!S.lb) return;
  S.lb = 0; S.lbN++; frBringBack();
  frIsleSay(`${friNick(sid)} rang the Lost Man’s Bell. The lost come back out of the fog.`, true);
}
function friBellPack(o) { const S = RAID.st; o.fb = [S.lb | 0, S.lbN | 0]; }
function friBellApply(o) { const S = RAID.st; if (Array.isArray(o.fb)) { if (!(S.lbPend > 0)) S.lb = o.fb[0] | 0; S.lbN = o.fb[1] | 0; } }
function friBellPlayers(P) { if (!RAID.st.lb) return P; const [x, y] = friBellAt(); return P.concat([{ sid: '', x, y, jz: 0, beacon: true }]); }
function friBellConsider(c) { if (RAID.st.lb) { const [x, y] = friBellAt(); c({ k: 'frbell' }, x, y, 0, FRIB.R, false); } }
function friBellPrompt(o) { return o.k === 'frbell' ? { text: 'Hold to ring the Lost Man’s Bell', hold: true } : null; }
function friBellMe(dt) {
  const S = RAID.st, m = FPS.me, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
  if (S.lbPend > 0) S.lbPend -= dt;
  if (S.lbN !== S.lbSeen) { S.lbSeen = S.lbN; try { if (!soundOff()) sfxBell(); } catch (e) {} }
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
  if (hold && o && o.k === 'frbell' && alive && S.lb && !(S.lbPend > 0)) {
    S.lbUseT += dt;
    if (S.lbUseT >= FRIB.USE) { S.lbUseT = 0; S.lbPend = 1.2; S.lb = 0; raidAsk('bell'); }
  } else S.lbUseT = 0;
}
function friBellHud(phone) {
  const S = RAID.st;
  if (S.lbUseT > 0) {
    const k = Math.min(1, S.lbUseT / FRIB.USE);
    ctx.strokeStyle = 'rgba(200,220,240,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 30, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#d8e8f4'; ctx.beginPath(); ctx.arc(cx, H / 2, 30, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
  }
  if (S.lb && !(ZM.ghost)) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = (phone ? '10px' : '12px') + ' monospace'; ctx.fillStyle = `rgba(200,220,240,${0.7 + 0.3 * Math.sin(g.t * 4)})`; ctx.fillText('The Lost Man’s Bell is up: ring it to bring the lost back', cx, H * 0.14); ctx.textBaseline = 'alphabetic'; }
}
// in 3D: the bell on its frame, rising out of the ground while it's up, and a pale light on it
const FRIB3 = { on: false, k: 0 };
function friBell3dBuild(grp) {
  const [bx, by] = friBellAt(), G = friBellMesh(bx, by); grp.add(G);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(210,230,255,0.9)', 'rgba(160,190,230,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
  halo.position.set(0, 2.2, 0); halo.scale.setScalar(5); G.add(halo);
  Object.assign(FRIB3, { on: true, G, bell: G.userData.bell, halo, k: 0, Z: G.userData.Z, bx, by });
}
function friBell3d(dt) {
  if (!FRIB3.on || !FRIB3.G) return;
  const up = RAID.st.lb ? 1 : 0; FRIB3.k += (up - FRIB3.k) * Math.min(1, dt / FRIB.RISE * 3);
  const k = FRIB3.k; FRIB3.G.visible = k > 0.01;
  FRIB3.G.position.copy(z3v(FRIB3.bx, FRIB3.by, FRIB3.Z - 3.2 * (1 - k)));
  FRIB3.bell.rotation.z = reduceMotion ? 0 : Math.sin(g.t * 1.7) * 0.12 * k;
  FRIB3.halo.material.opacity = 0.25 * k * (0.8 + 0.2 * Math.sin(g.t * 3));
}

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

// ---------- the light, for every rule but Hold the Light: lit once the island's job is done ----------
// RAID.st.ph: 'wait' (the job's still to do), 'ready' (hold Use at the beacon, FRL.USE seconds, to light it: anyone),
// 'lit' (its beam goes up: frIsleLit, and FRI.AWAY seconds later back aboard). friLit(rule) wraps a rule's own hooks
// round these; the rule calls FRL.ready(line) when its job's done (or is ready from the start), and can give line()
// (its HUD line while waiting) and bar() (how far along: 0 to 1).
const FRL = { USE: 2, PH: ['wait', 'ready', 'lit'] };
function frlEnter(ph) { Object.assign(RAID.st, { ph: ph || 'wait', awayT: 0, useT: 0, pend: 0, by: '', say: [0, '', 0], seenSay: 0, phSeen: ph || 'wait' }); }
function frlReady(text) { const S = RAID.st; if (S.ph !== 'wait' || ZM.net === 'client') return; S.ph = 'ready'; frIsleSay(text || 'The way’s clear. Light the beacon (hold Use at it) and go back aboard.', true); }
function friLit(R) {
  const X = Object.assign({}, R), S = () => RAID.st;
  X.enter = () => { frlEnter(R.ready0 ? 'ready' : 'wait'); if (R.enter) R.enter(); };
  X.tick = dt => { if (R.tick) R.tick(dt); const s = S(); if (s.ph === 'lit') { s.awayT += dt; if (s.awayT >= FRI.AWAY) frIslandDone(); } };
  X.q = (sid, k, a) => {
    const s = S();
    if (k === 'light') { if (s.ph === 'ready') { s.ph = 'lit'; s.awayT = 0; s.by = sid; frIsleLit(); if (R.lit) R.lit(); frIsleSay(`${friNick(sid)} lit the beacon, and its light goes up through the fog. Back aboard in ${FRI.AWAY} seconds.`, true); } return; }
    if (R.q) R.q(sid, k, a);
  };
  X.pack = o => { const s = S(); o.fl = [FRL.PH.indexOf(s.ph), Math.round(s.awayT * 10)]; o.fsy = s.say; if (R.pack) R.pack(o); };
  X.apply = o => {
    const s = S();
    if (Array.isArray(o.fl)) { const ph = FRL.PH[o.fl[0] | 0] || 'wait'; if (!(s.pend > 0) || ph === 'lit') s.ph = ph; s.awayT = (o.fl[1] | 0) / 10; }
    if (Array.isArray(o.fsy)) { const n = o.fsy[0] | 0; if (n > s.seenSay) { if (s.seenSay || n === 1) frIsleHear(String(o.fsy[1] || ''), !!o.fsy[2]); s.seenSay = n; } }
    if (R.apply) R.apply(o);
  };
  X.me = dt => {
    const s = S(), m = FPS.me, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
    if (s.pend > 0) s.pend -= dt;
    if (s.ph !== s.phSeen) { s.phSeen = s.ph; try { if (!soundOff()) { if (s.ph === 'lit') { sfxFlare(); zmSound('round'); sfxBell(); } else if (s.ph === 'ready') zmSound('round'); } } catch (e) {} }
    const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
    if (hold && o && o.k === 'frbeacon' && alive && !(s.pend > 0) && s.ph === 'ready') { s.useT += dt; if (s.useT >= FRL.USE) { s.useT = 0; s.pend = 1.2; raidAsk('light'); } }
    else s.useT = 0;
    if (R.me) R.me(dt);
  };
  X.consider = c => { if (S().ph === 'ready') { const [x, y] = friBeacon(); c({ k: 'frbeacon' }, x, y, 0, 2.6, false); } if (R.consider) R.consider(c); };
  X.prompt = o => o.k === 'frbeacon' ? { text: R.lightText || 'Hold to light the beacon', hold: true } : R.prompt ? R.prompt(o) : null;
  X.use = o => o.k === 'frbeacon' || !!(R.use && R.use(o));
  X.hud = (phone, mono, fell) => {
    const s = S(), L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t;
    const line = s.ph === 'wait' ? (R.line ? R.line() : '') : s.ph === 'ready' ? (R.readyLine ? R.readyLine() : 'Light the beacon: hold Use at it, and go back aboard') : `The beacon is lit. Back aboard in ${Math.max(0, Math.ceil(FRI.AWAY - s.awayT))} s`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = s.ph === 'lit' ? '#ffe2a8' : 'rgba(236,228,207,0.85)';
    ctx.fillText(line, L, top, W * 0.6); fpsHudNote(top + (phone ? 14 : 18));
    const b = s.ph === 'wait' && R.bar ? R.bar() : null;
    if (b != null) {
      const x = L, y = top + (phone ? 20 : 26), w = phone ? 150 : 214, h = phone ? 6 : 8;
      ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ffc070'; ctx.fillRect(x, y, w * clamp(b, 0, 1), h);
      fpsHudNote(y + h + 6);
    }
    if (s.useT > 0) {
      const k = Math.min(1, s.useT / FRL.USE);
      ctx.strokeStyle = 'rgba(255,192,112,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = '#ffc070'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
    if (R.hud) R.hud(phone, mono, fell);
  };
  return X;
}

// ---------- shared: the drowned coming up, a boss already in, a chest's gift ----------
const friN = () => Math.max(1, ZM.hum.length);
// how strong the drowned are out here: the stop and the reach
const friHp = () => zmHp(RAIDC.ROUND + (FR.stop | 0) + (FR.reach - 1) * 2) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (friN() - 1));
// (hosting or alone) a few drowned all the while: up to cap alive, one every gap seconds or so
function friTrickle(dt, cap, gap) {
  const S = RAID.st; S.trT = (S.trT == null ? 3 : S.trT) - dt; if (S.trT > 0) return;
  S.trT = gap * (0.75 + Math.random() * 0.5) / Math.sqrt(1 + 0.5 * (friN() - 1));
  if (ZM.z.filter(z => !z.dead && !z.boss).length < cap) frIsleSpawn({ kind: frIsleKindOf(), hp: friHp() });
}
// (hosting or alone) one of the Lighthouse's bosses, already in at (x, y), at strength k of its own
function friBoss(kind, x, y, k) {
  const T = ZBT[kind], hp = zbHpOf(kind, RAIDC.ROUND + (FR.stop | 0) + FR.reach * 2, friN()) * k, zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, boss: true, bt: kind, zn, id: 'z' + zn.toString(36), n: T.n, kind: 'boss',
    x, y, jz: 0, fl: 0, hp, max: hp, sp: T.sp(ZM.round),
    st: 'in', win: null, t: 0, ph: 0, hitT: 0, atk: 0, swing: -1, stuck: 0, lost: 0, h: Math.random() * 6.28, seed: (Math.random() * 1e6) | 0, rise: 1, hist: [],
    act: null, at: 0, aseq: 0, slamCd: 3, swCd: 0.5, ix: x, iy: y, ax: 0, ay: 0, lx: x, ly: y,
  };
  if (T.init) T.init(z);
  zbMake(z, kind);
  ZM.z.push(z); FPS.drowned = ZM.z;
  if (ZB.seen) ZB.seen.add(zn);
  ZM.banner = { text: T.N, t: 3.6, col: T.col, sub: T.sub };
  try { T.sound('arrive'); } catch (e) {}
  return z;
}
// (each of us, our own) what a wreck's chest (or a sunk hoard) gives you: a gun from the wreck chest's odds, or, one
// time in four (with a gun in hand that can be), your gun reforged a tier
function friGift(why) {
  const id = FPS.weapon;
  if (Math.random() < 0.25 && ZM_PAP_W[id] && ZM.own.includes(id)) { ZM.forge.id = id; ZM.forge.cost = 0; zmpDone(); fpsFeed(`${why}: a lampwright’s spark, and your gun’s reforged.`); return; }
  const g2 = zmBoxRoll(ZM.own); zmGive(g2);
  ZM.banner = { text: FPSW[g2].n, t: 3, col: '#ffc070', sub: why }; fpsFeed(`${why}: the ${FPSW[g2].n}.`);
}
// (hosting or alone) a rare card earned (an Elite down, the drowned man's bell rung in time)
// (src/frcards.js frcDeal: that stop's hands each lead with a Captain's card, as an Elite's do)
function friRare() { FR.rareAt = FR.stop | 0; }

// ---------- the Fight's other rules ----------
// Clear the Shore: a fixed number of the drowned (FRI_CLEAR by the reach, half as many again for each of you after
// the first) come up in waves; send them all back, then light the beacon.
const FRI_CLEAR = [0, 20, 30, 40];
FRI_RULES.clear = friLit({
  n: 'Clear the Shore',
  enter() {
    const n = friN(); Object.assign(RAID.st, { need: Math.round(FRI_CLEAR[FR.reach] * (1 + 0.5 * (n - 1))), killed: 0, spawned: 0, waveN: 0, spT: 3, lull: 0 });
    fpsFeed(`Ashore. The drowned are coming up out of the shore in waves: send back all ${RAID.st.need}, then light the beacon.`);
  },
  tick(dt) {
    const S = RAID.st; if (S.ph !== 'wait') return;
    const alive = ZM.z.filter(z => !z.dead).length, wave = Math.ceil(S.need / 4);
    if (S.spawned >= Math.min(S.need, wave * (S.waveN + 1)) && S.spawned < S.need) { if (alive <= 2) { S.lull += dt; if (S.lull > 3) { S.waveN++; S.lull = 0; frIsleSay(`Another wave comes up out of the shore: ${S.need - S.killed} still to send back.`, true); } } return; }
    S.spT -= dt;
    if (S.spT <= 0 && S.spawned < S.need) { if (frIsleSpawn({ kind: frIsleKindOf(), hp: friHp() })) S.spawned++; S.spT = (0.5 + Math.random() * 0.5) / Math.sqrt(friN()); }
  },
  kill(d) { const S = RAID.st; if (S.ph !== 'wait' || d.boss) return; S.killed++; if (S.killed >= S.need) frlReady('The shore is clear. Light the beacon (hold Use at it) and go back aboard.'); },
  line() { const S = RAID.st; return `Clear the Shore: ${Math.max(0, S.need - S.killed)} of the drowned still to send back`; },
  bar() { const S = RAID.st; return S.need ? S.killed / S.need : 0; },
  pack(o) { const S = RAID.st; o.fc = [S.need | 0, S.killed | 0]; },
  apply(o) { const S = RAID.st; if (Array.isArray(o.fc)) { S.need = o.fc[0] | 0; S.killed = o.fc[1] | 0; } },
});
// The Crab Tide: a swarm of crabs (src/zmswarm.js's) up out of the waterline, and the tide coming in: every
// FRT.EVERY seconds the beach shrinks (the water's edge comes FRT.STEP m nearer the middle, never past FRT.MIN).
// Standing in the tide drags at you (a knock every FRT.WET seconds). Send back the swarm, then light the beacon; the
// tide goes out as it's lit.
const FRT = { NEED: [0, 24, 36, 48], EVERY: 15, STEP: 4, MIN: 14, START: FRI.R - 3, WET: 1.6, ALIVE: 10 };
FRI_RULES.crabs = friLit({
  n: 'The Crab Tide',
  enter() {
    const n = friN(); Object.assign(RAID.st, { need: Math.round(FRT.NEED[FR.reach] * (1 + 0.5 * (n - 1))), killed: 0, spT: 3, tideR: FRT.START, tideT: FRT.EVERY, wetT: 0 });
    fpsFeed(`Ashore, and the tide is coming in. Crabs, up out of the water’s edge: send back all ${RAID.st.need}, and keep out of the sea.`);
  },
  tick(dt) {
    const S = RAID.st;
    if (S.ph === 'lit') { S.tideR = Math.min(FRT.START, S.tideR + dt * 3); return; }
    if (S.ph !== 'wait') return;
    S.tideT -= dt;
    if (S.tideT <= 0) { S.tideT = FRT.EVERY; if (S.tideR > FRT.MIN) { S.tideR = Math.max(FRT.MIN, S.tideR - FRT.STEP); frIsleSay('The tide comes in: the beach is smaller.', true); } }
    S.spT -= dt;
    const alive = ZM.z.filter(z => !z.dead).length, left = S.need - S.killed - alive;
    if (S.spT <= 0 && left > 0 && alive < FRT.ALIVE + 4 * (friN() - 1)) { friCrab(S.tideR); S.spT = (0.35 + Math.random() * 0.4) / Math.sqrt(friN()); }
  },
  kill(d) { const S = RAID.st; if (S.ph !== 'wait' || d.boss) return; S.killed++; if (S.killed >= S.need) frlReady('The swarm is gone. Light the beacon (hold Use at it), and the tide goes out.'); },
  me(dt) {
    const S = RAID.st, m = FPS.me, alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
    if (alive && S.ph === 'wait' && Math.hypot(m.x - FPSC.CX, m.y - FPSC.CY) > S.tideR + 0.5 && !(m.protect > 0)) {
      S.wetT += dt; if (S.wetT >= FRT.WET) { S.wetT = 0; fpsHurt(1, null, null); zmSound('hit'); fpsFeed('The tide drags at you. Get up the beach.'); }
    } else S.wetT = Math.max(0, S.wetT - dt);
  },
  line() { const S = RAID.st; return `The Crab Tide: ${Math.max(0, S.need - S.killed)} crabs still to send back · the tide rises in ${Math.ceil(S.tideT)} s`; },
  bar() { const S = RAID.st; return S.need ? S.killed / S.need : 0; },
  pack(o) { const S = RAID.st; o.ft = [S.need | 0, S.killed | 0, Math.round(S.tideR * 10), Math.round(S.tideT)]; },
  apply(o) { const S = RAID.st; if (Array.isArray(o.ft)) { S.need = o.ft[0] | 0; S.killed = o.ft[1] | 0; S.tideR = (o.ft[2] | 0) / 10; S.tideT = o.ft[3] | 0; } },
  b3(grp) { friTide3dBuild(grp); },
  f3(dt) { friTide3d(dt); },
  exit() { FRT3.on = false; FRT3.mesh = null; },
});
// (hosting or alone) one crab, up out of the water's edge, away from all of you
function friCrab(r) {
  const P = ZM.players || [];
  for (let t = 0; t < 20; t++) {
    const a = Math.random() * 6.283, d = r + 0.5 + Math.random() * 2, x = FPSC.CX + Math.cos(a) * d, y = FPSC.CY + Math.sin(a) * d;
    if (P.some(p => !p.beacon && Math.hypot(p.x - x, p.y - y) < 7)) continue;
    if (zmBlockedAt(x, y, 0.5, 0)) continue;
    const z = raidSpawnAt(x, y, { kind: 'jog', hp: friHp() * ZWC.HP, rise: 0.5 });
    zwDress(z); z.sp = ZWC.SP[0] + Math.random() * (ZWC.SP[1] - ZWC.SP[0]);
    return z;
  }
  return null;
}
// in 3D: the tide, a flat sheet of grey water from its edge out past the shore
const FRT3 = { on: false };
function friTide3dBuild(grp) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x2a3a46, transparent: true, opacity: 0.82, depthWrite: false });
  const foam = new THREE.MeshBasicMaterial({ color: 0xc8d4dc, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  Object.assign(FRT3, { on: true, grp, mat, foam, r: -1, mesh: null, edge: null });
}
function friTide3d() {
  if (!FRT3.on) return;
  const r = RAID.st.tideR || FRT.START; if (Math.abs(r - FRT3.r) < 0.04) return;
  FRT3.r = r;
  if (FRT3.mesh) { FRT3.grp.remove(FRT3.mesh); FRT3.mesh.geometry.dispose(); FRT3.grp.remove(FRT3.edge); FRT3.edge.geometry.dispose(); }
  // (the water's height: the island's ground just inside its edge, on average, and a little over it)
  let h = 0; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; h += fpsIsleH(FPS.g.isle, FPSC.CX + Math.cos(a) * r, FPSC.CY + Math.sin(a) * r); }
  const Z = FPSC.GROUND + h / 16 + 0.18;
  FRT3.mesh = new THREE.Mesh(new THREE.RingGeometry(r, FRI.R + 60, 72, 1), FRT3.mat); FRT3.mesh.rotation.x = -Math.PI / 2;
  FRT3.mesh.position.copy(z3v(FPSC.CX, FPSC.CY, Z)); FRT3.grp.add(FRT3.mesh);
  FRT3.edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r + 0.6, 72, 1), FRT3.foam); FRT3.edge.rotation.x = -Math.PI / 2;
  FRT3.edge.position.copy(z3v(FPSC.CX, FPSC.CY, Z + 0.02)); FRT3.grp.add(FRT3.edge);
}

// ---------- the Elite: one of the Lighthouse's bosses, weaker, and the drowned ----------
// Its rule is the boss (the Diver, the Mooncusser or the Keelback, ZBT's diver, moon and crab), at FRE.K of its
// strength by the reach (zbHpOf, with the players). It comes up a few seconds after you land, on the far side of the
// beacon; put it down and light the beacon. It pays a rare card (friRare).
const FRE = { K: [0, 0.6, 0.8, 1], WAKE: 4, CAP: 2, GAP: 5 };
const friEliteRule = (kind, n) => friLit({
  n,
  enter() { Object.assign(RAID.st, { bz: 0, wake: FRE.WAKE, down: 0 }); fpsFeed(`Ashore. Something big is waiting on this one: ${n}.`); },
  tick(dt) {
    const S = RAID.st; if (S.ph !== 'wait') return;
    if (!S.bz) { S.wake -= dt; if (S.wake <= 0) { const [bx, by] = friBeacon(), [lx, ly] = friLand(), a = bearingOf(bx - lx, by - ly), x = bx + Math.sin(a) * 8, y = by + Math.cos(a) * 8; const z = friBoss(kind, x, y, FRE.K[FR.reach]); S.bz = z.zn; frIsleSay(`${ZBT[kind].N} comes up out of the island. Put it down.`, true); } return; }
    friTrickle(dt, FRE.CAP + friN(), FRE.GAP);
    // (lost in the sea somehow: counted as down)
    if (!ZM.z.some(z => z.zn === S.bz && !z.dead)) friEliteDown();
  },
  kill(d) { if (d.boss && d.zn === RAID.st.bz) friEliteDown(); },
  line() { const S = RAID.st; return S.bz ? `Put down ${ZBT[kind].n}` : `Something stirs under the island…`; },
  pack(o) { o.fe = [RAID.st.bz | 0]; },
  apply(o) { if (Array.isArray(o.fe)) RAID.st.bz = o.fe[0] | 0; },
});
function friEliteDown() { const S = RAID.st; if (S.down) return; S.down = 1; friRare(); frlReady('It’s down: a rare card in the salvage. Light the beacon (hold Use at it) and go back aboard.'); }
const FRI_ELITE = { diver: friEliteRule('diver', 'The Diver'), moon: friEliteRule('moon', 'The Mooncusser'), crab: friEliteRule('crab', 'The Keelback') };
frKind('elite', { n: 'Elite', mark: '☠', weight: 1, rules: Object.keys(FRI_ELITE), rn: r => (FRI_ELITE[r] || {}).n || '' }, friStage(FRI_ELITE));

// ---------- the Wreck: a chest from the wrecks, each of you your own ----------
// A wreck drawn up on the beach, and its sea chest beside it. Hold Use at the chest (FRW.OPEN s) and it gives you a
// gun (the wreck chest's odds) or, one time in four, reforges the gun in your hand (friGift): once each. No fight,
// unless it's guarded (one wreck in three: FRI_WRECK.guarded): then come within FRW.WAKE m of it and the Keelback
// comes up out of the sand, and the chest won't open till it's down. The beacon can be lit whenever you're ready.
const FRW = { OPEN: 1.5, WAKE: 9, K: [0, 0.4, 0.55, 0.7] };
FPI_K.frchest = {
  col: FPI_C.wood2,
  sol(p) { return [fpiBox(p, 0, 0, 0.55, 0.36, 0.7)]; },
  b3(p, A) {
    A.box('#5a3e26', 0, 0, 0, 1.1, 0.72, 0.5);
    A.box('#6a4a2c', 0, 0, 0.5, 1.14, 0.76, 0.2);
    for (const u of [-0.38, 0, 0.38]) A.box(FPI_C.iron, u, 0, 0, 0.07, 0.78, 0.72);
    A.box('#c8a050', 0, -0.39, 0.42, 0.14, 0.04, 0.16);
  },
};
function friWreckSet(H) {
  const Z = H.I.zm, F = Z.fr; if (!F) return;
  const a0 = F.landA + Math.PI * 0.35;
  let at = null; for (let k = 0; k < 20 && !at; k++) { const [x, y] = H.polar(a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.18, H.IR - 10); if (H.clear(x, y, 4, 1)) at = [x, y, a0]; }
  if (!at) { const [x, y] = H.polar(a0, H.IR - 10); at = [x, y, a0]; }
  H.put('boat', at[0], at[1], at[2] + 0.4, { len: 7.5, beam: 2.6, paint: '#2a2620' });
  const [cx2, cy2] = [at[0] - Math.cos(at[2]) * 3.2, at[1] - Math.sin(at[2]) * 3.2];
  H.put('frchest', cx2, cy2, at[2] + Math.PI / 2, {});
  H.put('barrels', cx2 + 1.8 * Math.cos(at[2] + 1.6), cy2 + 1.8 * Math.sin(at[2] + 1.6), 0, { items: [{ u: 0, v: 0, r: 0.4, hh: 1.0 }, { u: 0.9, v: 0.2, r: 0.4, hh: 1.0, lie: true, ry: 0.6 }] });
  F.chest = [cx2 - H.CX, cy2 - H.CY];
}
const friChest = () => { const F = FPS.g.isle.zm.fr; return F && F.chest ? [FPSC.CX + F.chest[0], FPSC.CY + F.chest[1]] : friLand(); };
const friWreckRule = guarded => friLit({
  n: guarded ? 'A Guarded Wreck' : 'A Wreck', ready0: true,
  set(H) { friWreckSet(H); },
  enter() { Object.assign(RAID.st, { gd: guarded ? 1 : 0, bz: 0, mine: 0, openT: 0 }); fpsFeed(guarded ? 'A wreck on the beach, and her sea chest. The sand round it looks disturbed.' : 'A wreck on the beach, and her sea chest: something in it for each of you. Light the beacon when you’re ready.'); },
  tick() {
    const S = RAID.st;
    if (S.gd === 1) { const [x, y] = friChest(); if ((ZM.players || []).some(p => !p.beacon && Math.hypot(p.x - x, p.y - y) < FRW.WAKE)) { S.gd = 2; const z = friBoss('crab', x + 4, y + 4, FRW.K[FR.reach]); S.bz = z.zn; frIsleSay('The sand heaves: the Keelback was sleeping under her. Put it down, and the chest is yours.', true); } }
    else if (S.gd === 2 && !ZM.z.some(z => z.zn === S.bz && !z.dead)) { S.gd = 3; frIsleSay('The Keelback is down. The chest is yours: something in it for each of you.', true); }
  },
  kill(d) { if (d.boss && d.zn === RAID.st.bz && RAID.st.gd === 2) { RAID.st.gd = 3; frIsleSay('The Keelback is down. The chest is yours: something in it for each of you.', true); } },
  me(dt) {
    const S = RAID.st, hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near, m = FPS.me;
    if (hold && o && o.k === 'frchest' && !S.mine && (S.gd === 0 || S.gd === 3) && !(m.dead > 0) && !zmIsDown()) { S.openT += dt; if (S.openT >= FRW.OPEN) { S.openT = 0; S.mine = 1; zmSound('open'); friGift('From the wreck’s chest'); } }
    else S.openT = 0;
  },
  consider(c) { if (!RAID.st.mine) { const [x, y] = friChest(); c({ k: 'frchest' }, x, y, 0, 2.2, false); } },
  prompt(o) { if (o.k !== 'frchest') return null; const g2 = RAID.st.gd; return g2 === 1 || g2 === 2 ? { text: 'The chest won’t open: something’s guarding it' } : { text: 'Hold to open the wreck’s chest', hold: true }; },
  use(o) { return o.k === 'frchest'; },
  readyLine() { const S = RAID.st; return S.gd === 2 ? 'Put down the Keelback' : S.mine ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Open the wreck’s chest, then light the beacon (hold Use at it)'; },
  hud() { const S = RAID.st; if (S.openT > 0) { const k = Math.min(1, S.openT / FRW.OPEN); ctx.strokeStyle = '#ffc070'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); } },
  pack(o) { const S = RAID.st; o.fw = [S.gd | 0, S.bz | 0]; },
  apply(o) { const S = RAID.st; if (Array.isArray(o.fw)) { S.gd = o.fw[0] | 0; S.bz = o.fw[1] | 0; } },
});
// (a guarded wreck: no lighting the beacon and leaving while the Keelback's up)
const FRI_WRECK = { open: Object.assign(friWreckRule(false), { w: 2 }), guarded: friWreckRule(true) };
{ const G = FRI_WRECK.guarded, q0 = G.q; G.q = (sid, k, a) => { if (k === 'light' && RAID.st.gd === 2) return; q0(sid, k, a); }; }
frKind('wreck', { n: 'Wreck', mark: '⚓', weight: 1, rules: ['open', 'open', 'guarded'], rn: () => 'A Wreck' }, friStage(FRI_WRECK));

// ---------- the Chapel: a rest ----------
// Always Chapel Islet's look. Everyone back to full health as you come ashore; everyone lost in the fog is brought
// back, and every extra life given back (frBringBack, frRestoreLife). Light the candles at the beacon to go on. A
// hook for the salvage's card swap: frChapelCard() (src/frcards.js), if it's there, as you land.
const FRI_CHAPEL = { rest: friLit({
  n: 'A Rest', ready0: true, lightText: 'Hold to light the chapel’s beacon',
  prep(i) { const p = FR.plan[i]; if (p) { p.look = 'chapel'; frIsleLook(i); } },
  enter() {
    Object.assign(RAID.st, { healed: 0 });
    if (ZM.net !== 'client') { frBringBack(); frRestoreLife(); }
    fpsFeed('Chapel Islet. A rest: you’re mended, the lost come home, and every extra life is given back. Light the beacon when you’re ready to go on.');
    if (typeof frChapelCard === 'function') try { frChapelCard(); } catch (e) {}
  },
  me() { const S = RAID.st, m = FPS.me; if (!S.healed && !(m.dead > 0) && !zmIsDown()) { S.healed = 1; m.hp = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP; try { zmSound('drink'); } catch (e) {} } },
  readyLine: () => 'A rest. Light the beacon (hold Use at it) when you’re ready to go on',
}) };
frKind('chapel', { n: 'Chapel', mark: '🕯', weight: 1, look: 'chapel', rules: ['rest'], rn: () => 'A Rest' }, friStage(FRI_CHAPEL));

// ---------- the Unknown: one of a handful of things out in the fog ----------
// Its rule is drawn from the seed like any other, and you only learn which as you land:
//  - stranger: a stranger in a rowing boat, drawn up on the beach. Each of you can trade with him once: a card (frTradeCard(),
//    src/frcards.js, if it's there; otherwise FRU.PRICE points) for your health back in full and a tonic you haven't got.
//  - bellman: a drowned man stands at the water's edge and asks you to ring his bell. Speak to him (Use) and a bell
//    rises on the far side of the island: ring it (hold Use) inside FRU.BELL seconds for a rare card (friRare). The
//    drowned come while the clock runs.
//  - hoard: a sunk hoard in a deep pool by the shore. Each of you can dive for it once: hold Use in the pool for FRU.DIVE
//    seconds, before your breath (FRU.BREATH) runs out, and it gives you what a wreck's chest would (friGift).
//  - fight: Clear the Shore.
// The beacon can be lit whenever you're ready (but for the fight, once it's won).
const FRU = { PRICE: 750, BELL: 30, DIVE: 5, BREATH: 9, POOL: 2.6 };
// a figure (the stranger, the drowned man): a dark coat and a head, built in 3D at (x, y), facing h
function friFigure(grp, x, y, h, col, skin) {
  const G = new THREE.Group(), Z = FPSC.GROUND + fpsIsleH(FPS.g.isle, x, y);
  const coat = new THREE.MeshLambertMaterial({ color: col }), face = new THREE.MeshLambertMaterial({ color: skin });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 1.45, 10), coat); body.position.y = 0.72; G.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), face); head.position.y = 1.62; G.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 10), coat); hood.position.y = 1.8; G.add(hood);
  G.position.copy(z3v(x, y, Z)); G.rotation.y = h; grp.add(G); return G;
}
// a ship's bell on a frame, as a group at (x, y) (the Lost Man's and the drowned man's)
function friBellMesh(x, y) {
  const G = new THREE.Group(), Z = FPSC.GROUND + fpsIsleH(FPS.g.isle, x, y);
  const wood = new THREE.MeshLambertMaterial({ color: 0x4a3a2a }), brass = new THREE.MeshLambertMaterial({ color: 0x9a7a40, emissive: 0x2a2010, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), wood); p.position.set(s * 0.8, 1.3, 0); G.add(p); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.22), wood); bar.position.set(0, 2.6, 0); G.add(bar);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.48, 0.75, 14, 1, true), brass); bell.position.set(0, 2.1, 0); G.add(bell);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, 6.283, 0, Math.PI / 2), brass); top.position.set(0, 2.47, 0); G.add(top);
  G.position.copy(z3v(x, y, Z)); G.userData = { Z, bell }; return G;
}
// where the Unknown's things stand (laid out with the island): the stranger's boat or the drowned man by the landing,
// the bell or the pool across the island
function friUnknownSet(H) {
  const F = H.I.zm.fr; if (!F) return;
  const a0 = F.landA + 0.55, [x, y] = H.polar(a0, H.IR - 6); F.who = [x - H.CX, y - H.CY, a0];
  const far = H.spot(1.6, 12, H.IR - 10, 3, 300) || [H.CX - F.land[0] * 0.5, H.CY - F.land[1] * 0.5];
  F.far = [far[0] - H.CX, far[1] - H.CY];
  if (H.I.T && raidStage() && (frPlanNow() || {}).rule === 'stranger') H.put('boat', x + Math.cos(a0) * 2.5, y + Math.sin(a0) * 2.5, a0 + Math.PI / 2, { len: 4.2, beam: 1.5, paint: '#3a2e24', upright: true });
}
const friWho = () => { const F = FPS.g.isle.zm.fr; return F && F.who ? [FPSC.CX + F.who[0], FPSC.CY + F.who[1], F.who[2]] : [...friLand(), 0]; };
const friFar = () => { const F = FPS.g.isle.zm.fr; return F && F.far ? [FPSC.CX + F.far[0], FPSC.CY + F.far[1]] : friBeacon(); };
const friHold = () => FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse;
const friAble = () => { const m = FPS.me; return !(m.dead > 0) && !zmIsDown() && !ZM.over; };
function friRing(t, k, col) { if (!(t > 0)) return; ctx.strokeStyle = col || '#ffc070'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + Math.min(1, t / k) * 6.283); ctx.stroke(); }

const FRI_UNKNOWN = {
  stranger: friLit({
    n: 'A Stranger', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { done: 0 }); fpsFeed('A stranger in a rowing boat, drawn up on the beach, hood up. He’ll trade, once each.'); },
    consider(c) { if (!RAID.st.done) { const [x, y] = friWho(); c({ k: 'frwho' }, x, y, 0, 2.4, false); } },
    prompt(o) { if (o.k !== 'frwho') return null; const card = typeof frTradeCard === 'function'; return { text: card ? 'Trade the stranger a card: your health back, and a tonic' : `Trade with the stranger (${FRU.PRICE} points): your health back, and a tonic`, cost: card ? undefined : FRU.PRICE }; },
    use(o) {
      if (o.k !== 'frwho') return false;
      const S = RAID.st, m = FPS.me; if (S.done) return true;
      if (typeof frTradeCard === 'function') { if (!frTradeCard()) { zmSound('no'); return true; } }
      else { if (ZM.pts < FRU.PRICE) { zmSound('no'); fpsFeed('Not enough points.'); return true; } ZM.pts -= FRU.PRICE; ZM.spent += FRU.PRICE; }
      S.done = 1; m.hp = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
      const ks = Object.keys(ZM_PERKS).filter(k => k !== 'wind' && !ZM.perks[k]), k = ks[(Math.random() * ks.length) | 0];
      if (k) { ZM.perks[k] = true; if (k === 'stout') m.hp = ZMC.HP_STOUT; fpsFeed(`The stranger mends you, and leaves you a tonic: ${ZM_PERKS[k].n} (${ZM_PERKS[k].what}).`); } else fpsFeed('The stranger mends you.');
      zmSound('drink'); return true;
    },
    readyLine: () => RAID.st.done ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Trade with the stranger if you like, then light the beacon (hold Use at it)',
    b3(grp) { const [x, y, a] = friWho(); friFigure(grp, x, y, -a + Math.PI / 2, 0x1c1a22, 0x8a7a6a); },
  }),
  bellman: friLit({
    n: 'The Drowned Man’s Bell', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { bm: 0, bmT: 0, ringT: 0, pend2: 0 }); fpsFeed('A drowned man stands at the water’s edge, quite still. He isn’t coming for you. He wants something.'); },
    tick(dt) {
      const S = RAID.st; if (S.bm !== 1) return;
      S.bmT -= dt; friTrickle(dt, 3 + friN(), 3.2);
      if (S.bmT <= 0) { S.bm = 3; frIsleSay('Too late: his bell sinks back into the ground, unrung. He turns away into the fog.', true); }
    },
    q(sid, k) {
      const S = RAID.st;
      if (k === 'bmtalk' && !S.bm) { S.bm = 1; S.bmT = FRU.BELL; frIsleSay(`“Ring my bell,” says the drowned man, “before they take me.” A bell rises across the island: ${FRU.BELL} seconds.`, true); }
      else if (k === 'bmring' && S.bm === 1) { S.bm = 2; friRare(sid); frIsleSay(`${friNick(sid)} rang the drowned man’s bell. He’s gone home, and he’s left you a rare card.`, true); }
    },
    me(dt) {
      const S = RAID.st, o = ZM.near; if (S.pend2 > 0) S.pend2 -= dt;
      if (S.bm === 2 && !S.rung) { S.rung = 1; try { if (!soundOff()) sfxBell(); } catch (e) {} }
      if (friHold() && o && o.k === 'frbm' && friAble() && S.bm === 1 && !(S.pend2 > 0)) { S.ringT += dt; if (S.ringT >= 1) { S.ringT = 0; S.pend2 = 1.2; raidAsk('bmring'); } } else S.ringT = 0;
    },
    consider(c) { const S = RAID.st; if (!S.bm) { const [x, y] = friWho(); c({ k: 'frwho' }, x, y, 0, 2.4, false); } else if (S.bm === 1) { const [x, y] = friFar(); c({ k: 'frbm' }, x, y, 0, 2.4, false); } },
    prompt(o) { return o.k === 'frwho' ? { text: 'Speak to the drowned man' } : o.k === 'frbm' ? { text: 'Hold to ring the drowned man’s bell', hold: true } : null; },
    use(o) { if (o.k === 'frwho') { raidAsk('bmtalk'); return true; } return o.k === 'frbm'; },
    readyLine() { const S = RAID.st; return S.bm === 1 ? `Ring the drowned man’s bell, across the island · ${Math.ceil(S.bmT)} s` : S.bm ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Speak to the drowned man by the water, or light the beacon (hold Use at it) and go'; },
    hud() { friRing(RAID.st.ringT, 1); },
    pack(o) { const S = RAID.st; o.fu = [S.bm | 0, Math.round(S.bmT)]; },
    apply(o) { const S = RAID.st; if (Array.isArray(o.fu)) { if (!(S.pend2 > 0)) S.bm = o.fu[0] | 0; S.bmT = o.fu[1] | 0; } },
    b3(grp) { const [x, y, a] = friWho(); FRU3.who = friFigure(grp, x, y, -a + Math.PI / 2, 0x26302c, 0x5a6a62); const [fx, fy] = friFar(); FRU3.bell = friBellMesh(fx, fy); FRU3.bk = 0; grp.add(FRU3.bell); FRU3.on = true; },
    f3(dt) {
      if (!FRU3.on) return; const S = RAID.st, up = S.bm === 1 || S.bm === 2 ? 1 : 0, B = FRU3.bell; FRU3.bk += (up - FRU3.bk) * Math.min(1, dt * 1.5);
      B.visible = FRU3.bk > 0.01; const [fx, fy] = friFar(); B.position.copy(z3v(fx, fy, B.userData.Z - 3.2 * (1 - FRU3.bk)));
      B.userData.bell.rotation.z = S.bm === 2 && !reduceMotion ? Math.sin(g.t * 6) * 0.3 : 0;
      if (FRU3.who) FRU3.who.visible = S.bm < 2;
    },
    exit() { FRU3.on = false; },
  }),
  hoard: friLit({
    n: 'A Sunk Hoard', ready0: true,
    set(H) { friUnknownSet(H); },
    enter() { Object.assign(RAID.st, { mine: 0, diveT: 0, breath: FRU.BREATH }); fpsFeed('A deep pool by the shore, and something glinting at the bottom of it: a sunk hoard. Each of you can dive for it once.'); },
    me(dt) {
      const S = RAID.st, o = ZM.near;
      if (friHold() && o && o.k === 'frpool' && friAble() && !S.mine) {
        S.diveT += dt; S.breath -= dt;
        if (S.diveT >= FRU.DIVE) { S.mine = 1; S.diveT = 0; zmSound('open'); friGift('Up from the sunk hoard'); }
        else if (S.breath <= 0) { S.diveT = 0; S.breath = FRU.BREATH; fpsHurt(1, null, null); zmSound('hit'); fpsFeed('Your breath gave out. Up, gasping: try again.'); }
      } else { S.diveT = Math.max(0, S.diveT - dt * 2); S.breath = Math.min(FRU.BREATH, S.breath + dt * 2); }
    },
    tick(dt) { friTrickle(dt, 2 + friN(), 6); },
    consider(c) { if (!RAID.st.mine) { const [x, y] = friFar(); c({ k: 'frpool' }, x, y, 0, FRU.POOL + 0.6, false); } },
    prompt(o) { return o.k === 'frpool' ? { text: 'Hold to dive for the hoard', hold: true } : null; },
    use(o) { return o.k === 'frpool'; },
    readyLine: () => RAID.st.mine ? 'Light the beacon (hold Use at it) when you’re ready to go' : 'Dive for the sunk hoard (hold Use in the pool), then light the beacon',
    hud(phone, mono) {
      const S = RAID.st; friRing(S.diveT, FRU.DIVE, '#9ad0e8');
      if (S.diveT > 0) { const w = 160, x = cx - w / 2, y = H / 2 + 40; ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x - 3, y - 3, w + 6, 12); ctx.fillStyle = S.breath < 3 ? '#e06a50' : '#9ad0e8'; ctx.fillRect(x, y, w * clamp(S.breath / FRU.BREATH, 0, 1), 6); ctx.font = mono(10); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText('BREATH', cx, y + 20); }
    },
    b3(grp) {
      const [x, y] = friFar(), Z = FPSC.GROUND + fpsIsleH(FPS.g.isle, x, y) + 0.06;
      const m = new THREE.Mesh(new THREE.CircleGeometry(FRU.POOL, 28), new THREE.MeshLambertMaterial({ color: 0x0c1a22, emissive: 0x051018 })); m.rotation.x = -Math.PI / 2; m.position.copy(z3v(x, y, Z)); grp.add(m);
      const rim = new THREE.Mesh(new THREE.RingGeometry(FRU.POOL - 0.1, FRU.POOL + 0.5, 28), new THREE.MeshLambertMaterial({ color: 0x4a4a44 })); rim.rotation.x = -Math.PI / 2; rim.position.copy(z3v(x, y, Z + 0.01)); grp.add(rim);
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: z3Soft('rgba(255,220,140,0.9)', 'rgba(255,200,100,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glint.position.copy(z3v(x + 0.4, y - 0.3, Z + 0.05)); glint.scale.setScalar(0.9); grp.add(glint);
    },
  }),
  fight: FRI_RULES.clear,
};
const FRU3 = { on: false };
frKind('unknown', { n: 'Unknown', mark: '?', weight: 1, rules: Object.keys(FRI_UNKNOWN), rn: () => 'Who knows' }, friStage(FRI_UNKNOWN));
