// Fog Run: a roguelike voyage through the haar, a game of its own (its own card on the title screen, its own lobby, a
// line of its own on the scoreboard to come), alone or up to four together. The crew sails the keeper's cutter out from
// Skerry Light into a fog that thickens with every reach; each island is a short fight (or, later, a puzzle) on foot;
// light its light, go back aboard, and on to the next. The design: /fogrun/design.md (Ryan's decisions at its foot).
//
// How it's built. It's a raid (src/raid.js): its own map, ZM_MAPS.fogrun, its own entry in RAIDS (kept off the raid
// card's picker: RAIDS.fogrun.own), the callings (src/rclass.js), going down and getting up, the raids' victory
// screen (src/raidmvp.js), and playing together through the Lighthouse's lobby (src/zmnet.js, its own mode 'fr', kept
// apart from nights and raids). What's its own:
//  - The run's state, FR (below): the seed (drawn at random by the host for every run and sent once, in the start of
//    the run, st.fs, src/zmnet.js znStart), the reach (I, II, III) and how far the fog lets you see in it, the stop
//    (how many islands so far), the plan, and each player's lives.
//  - A stage order built as the run is played. RAID_ORDER starts as one sail; each time a stage ends (raidNextStage)
//    frGrow adds the next: after a sail, the island it sailed to; after an island, a sail to the next stop that
//    frNextStop picks, or nothing (past the last stop: won). FR.plan runs alongside RAID_ORDER, one entry a stage:
//      { key: its RAID_STAGES key, n: the stop it's for (1, 2...), reach, kind: the island's kind, rule, look }
//    The host sends the plan in its word (frw); a joined player's RAID_ORDER is rebuilt from it before the stage
//    number in the same word is followed, so everyone lays out the same thing.
//  - Lives (Ryan's rule). Alone, going down ends the run (as in every raid alone). Together, everyone has one extra
//    life: the first time you bleed out it goes, and you're back on your feet FRC.BACK seconds later at the stage's
//    start (the landing, or the deck), with what you carried. After that a bleed-out leaves you lost in the fog,
//    watching the others, until someone brings you back. The run ends when everyone is lost at once, or the cutter
//    sinks (src/gwsail.js), or (alone) when you go down. Each player keeps their own lives (FR.life, FR.lost,
//    FR.backT) and says them in their presence (frp), so the host knows when everyone's lost.
//
// The hook API, for the parts still to come:
//  - A new island kind (step 4): frKind(kind, def, stage). def: { n: its name on the chart, mark: its mark (a short
//    word or glyph), weight: how often the chart offers it } and stage: a RAID_STAGES-style object (src/raid.js's
//    hooks, plus prep(i) to read FR.plan[i] before its world is laid out). It's registered as RAID_STAGES['fr_' +
//    kind]. src/frisle.js has the shared island tools: frIsleLook (a small FPS_ISLES island, FRI.R across, fog pulled
//    in by the reach), the landing, the beacon prop, and frIsleLit (the island's light lit: everyone lost is brought
//    back, the fog pushed back, and after FRI.AWAY seconds back aboard). An island stage ends with frIslandDone().
//  - The chart (step 2): replace frNextStop() (below). It's asked, hosting or alone, for the stop after the one just
//    finished, and returns { kind, rule, look, n, reach } or null when there's nothing left (the run is won). The vote
//    can run during the sail before it (the chart table on the deck, raidAsk 'vote'): set FR.next and the sail's
//    island follows it. FR_SKEL is today's hard-coded route; frRng(k) is the run's own random numbers, for anything
//    that has to be the same on every screen.
//  - Rewards (step 3): frAfterIsland(done) runs, hosting, between an island's end and the sail after it. Open the
//    salvage there and call done() once the picks are in (or the 20 s are up); the sail begins after it. Crew cards
//    can call frBringBack() and frRestoreLife() below.
//  - The boss (step 5): a stop of kind 'boss' (frKind('boss', ...)), made the last by frNextStop; its stage ends the
//    run with frWin() (the victory screen, as the raids).
//  - Anyone can bring the lost back or give an extra life back (hosting or alone; a joined player asks the stage,
//    which calls these on the host): frBringBack(sid) (sid left out: everyone lost) and frRestoreLife(sid).
//  - frFog(): how far you can see now (by the reach, plus what lit islands have pushed it back); frFogPush(m).
//  - frDebug(stageKey, seed): straight to a stage ('frsail', 'fr_fight' or 'win') with a fixed seed, for tests.
// Hooks in shared files are marked [fogrun]: src/raid.js (raidBegin frBegin, raidAfterStart frAfterStart,
// raidMapFor prep and FPSC.R, raidNextStage frGrow, raidUseStage frStageGhost and a stage's banner, raidHostSend frPack,
// raidApply frApplyRun, raidMe frMe, raidHud, raidStaminaHud frLifeHud, raidShowOver frOverStats, raidStop frStop,
// raidPick), src/zombies.js (zmCheckOver frCheckOver, zmBleedOut frBledOut), src/zmnet.js (the lobby's third card,
// the seed in the start, presence frp, rejoin), src/gwsail.js (GWS_LEG), src/raidmvp.js, src/raidmusic.js,
// src/share.js (?mode=fogrun&lobby=...), index.html (its card).

// FRC: BACK, seconds from bleeding out (with an extra life) to back on your feet; LIVES, the extra lives each player
// starts with together (none alone)
const FRC = { BACK: 10, LIVES: 1 };
// the reaches: their names, how far you can see in each (m), and how many stops each has (the chart's, later)
const FR_REACH = [null, { n: 'The Near Skerries', fog: 140, stops: 2 }, { n: 'The Grey Reach', fog: 90, stops: 3 }, { n: 'The Haar', fog: 50, stops: 2 }];
// what each lit island pushes the fog back, for the rest of its reach (m)
const FR_PUSH = 10;
// the island looks (FPS_ISLES) an island can be laid out in, small
const FR_LOOKS = ['shingle', 'reef', 'chapel', 'cove', 'cliff', 'marsh'];
// the route of step 1 (two Fight islands, then won), kept for reference: the chart (src/frchart.js) has taken over frNextStop
const FR_SKEL = [{ kind: 'fight', rule: 'hold', reach: 1 }, { kind: 'fight', rule: 'hold', reach: 1 }];
// the music each part plays (src/raidmusic.js; the fog horn, frhorn, is a sound for the Bell Buoys' tune)
var FR_MUSIC = { sail: 'frsail', isle: 'frisle', puzzle: 'frpuzzle', boss: 'frboss', boss2: 'frboss2', win: 'frwin', horn: 'frhorn' };
// the island kinds, by name (frKind)
var FR_KINDS = {};
var FR = { at: -1, on: false, seed: 0, want: null, debug: null, reach: 1, stop: 0, push: 0, pushR: 1, plan: [], next: null, life: 0, lost: false, backT: 0, kit: null,
  ev: [], eseq: 0, evSeen: -1, won: false, lit: 0, leaving: false };

// ---------- the map, as src/zombies.js and src/raid.js see it ----------
ZM_MAPS.fogrun = Object.assign({}, ZM_MAPS.raid, { n: 'Fog Run', N: 'Fog Run', seed: 0xf06, fr: true,
  blurb: 'A voyage through the haar, alone or up to four: sail, land, light the islands’ lights.',
  land: n => `The keeper’s cutter, at the foot of the Light${n ? ', ' + n + ' of you aboard' : ''}. Out there, the haar.` });
RAIDS.fogrun = { n: 'Fog Run', own: true, order: ['frsail'], at: {},
  // (the victory screen shows whenever the run is won, whatever its last stage)
  get mvp() { return FR.won ? RAID_ORDER[RAID_ORDER.length - 1] : '-'; },
  lost: n => `Lost in the fog, at ${n}`, won: 'The lights are lit again', again: 'Set out again' };
function frKind(kind, def, stage) { def.kind = kind; def.key = def.key || 'fr_' + kind; FR_KINDS[kind] = def; stage.fr = kind; RAID_STAGES[def.key] = stage; return def; }

// ---------- the run's own random numbers ----------
const frSeedNew = () => ((Math.random() * 4294967296) >>> 0) || 1;
// (k: what they're for, so each thing draws its own and the order things are asked in doesn't matter)
const frRng = k => seeded(((FR.seed ^ Math.imul((k | 0) + 1, 0x9e3779b1)) >>> 0) || 1);
function frSeedOf(i) { return ((FR.seed >>> 1) + i * 977) & 0x7fffffff; }
// (src/zmnet.js znBegin) the seed the host drew, before the run begins on this side
function frSeedFrom(st) { if (st && ZM_MAPS[st.map] && ZM_MAPS[st.map].fr && st.fs) FR.want = st.fs >>> 0; }

// ---------- the fog ----------
function frFog(reach) { const r = reach || FR.reach, R = FR_REACH[r] || FR_REACH[1]; return R.fog + (r === FR.pushR ? FR.push : 0); }
function frFogPush(m) { if (FR.pushR !== FR.reach) { FR.pushR = FR.reach; FR.push = 0; } FR.push += m; }

// ---------- the route ----------
// [chart] the stop after the one just finished (hosting or alone): { kind, rule, look, n, reach }, or null (won)
function frNextStop() { return frChartNext(); }   // [chart] src/frchart.js: the route, drawn from the seed, and the crew's vote
// [cards] between an island and the sail after it (hosting or alone): the salvage goes here; call done() when it's over
function frAfterIsland(done) { done(); }
// a stage's entry in the plan: a sail to a stop, or the stop itself
const frSailTo = s => ({ key: 'frsail', n: s.n, reach: s.reach, kind: s.kind, rule: s.rule, look: s.look });
const frIsleOf = s => ({ key: (FR_KINDS[s.kind] || FR_KINDS.fight).key, n: s.n, reach: s.reach, kind: s.kind, rule: s.rule, look: s.look });
const frPlanNow = () => FR.plan[RAID.stage] || null;
function frOrderFromPlan() { RAID_ORDER.length = 0; for (const p of FR.plan) RAID_ORDER.push(p.key); }
// (raidNextStage, hosting or alone, with nothing after this stage yet) what comes next
function frGrow() {
  const cur = frPlanNow(); if (!cur) return;
  if (cur.key === 'frsail') { frChartEnsure(); FR.plan.push(frIsleOf(frPlanNow())); }   // [chart] (the vote settled first)
  else { const nx = frNextStop(); if (!nx) { FR.won = true; return; } FR.next = nx; FR.plan.push(frSailTo(nx)); }   // (no stop left: won)
  frOrderFromPlan();
}
// (an island stage, hosting or alone) its light is lit and everyone's had time to get back aboard: the salvage, then on
function frIslandDone() {
  if (!FR.on || ZM.net === 'client' || FR.leaving || ZM.over) return;
  FR.leaving = true;
  frAfterIsland(() => { FR.leaving = false; if (FR.on && !ZM.over) raidNextStage(); });
}
// (hosting or alone) the run is won: the victory screen
function frWin() { if (!FR.on || ZM.net === 'client' || FR.won) return; FR.won = true; raidWin(); }

// ---------- starting, and stopping ----------
// (raidBegin, with RAID.map set) is this a fog run? Its seed, its first stop, the first sail
function frBegin() {
  FR.on = RAID.map === 'fogrun';
  if (!FR.on) return;
  FR.seed = FR.want != null ? FR.want >>> 0 : frSeedNew(); FR.want = null;
  Object.assign(FR, { reach: 1, stop: 0, push: 0, pushR: 1, plan: [], next: null, life: 0, lost: false, backT: 0, kit: null, ev: [], eseq: 0, evSeen: -1, won: false, lit: 0, leaving: false });
  const first = frNextStop(); FR.next = first; FR.reach = first.reach;
  FR.plan = [frSailTo(first)]; frOrderFromPlan();
}
// (raidAfterStart) once the run's laid out and we know who's in it: the lives, and a test's jump
function frAfterStart() {
  FR.life = ZM.net ? FRC.LIVES : 0;
  if (FR.debug) { const k = FR.debug; FR.debug = null; if (typeof RCL !== 'undefined' && RCL.picking) rclChoose(RCL.last || 'merc'); if (k !== 'frsail') frJump(k); }
}
function frStop() { FR.on = false; FR.leaving = false; FR.backT = 0; FR.lost = false; }
// (raidUseStage) entering a stage: which reach and stop it is
function frEnterStage() { const p = frPlanNow(); if (!p) return; FR.stop = p.key === 'frsail' ? p.n - 1 : p.n; if (p.reach !== FR.reach) { FR.reach = p.reach; } }

// ---------- lives ----------
// (zmBleedOut, together) the time on the floor ran out: your extra life, if you have it, or lost in the fog
function frBledOut(kit) {
  FR.kit = kit || null;
  if (FR.life > 0) {
    FR.life--; FR.backT = FRC.BACK;
    ZM.banner = { text: 'Your extra life is spent', t: 3, sub: `Back on your feet in ${FRC.BACK} seconds`, col: '#ffe2a8' };
    fpsFeed(`You bled out. Your extra life goes: you’re back on your feet in ${FRC.BACK} seconds.`);
  } else {
    FR.lost = true; FR.backT = 0;
    ZM.banner = { text: 'Lost in the fog', t: 3.5, sub: 'Watching the others until the island’s light is lit', col: '#c8d4e0' };
    fpsFeed('You bled out, and you’re lost in the fog. When the island’s light is lit, you’re brought back.');
  }
}
// back on your feet, at the stage's start, with what you carried (how: 'life', 'call' or 'stage')
function frBack(how) {
  if (!ZM.ghost) { FR.lost = false; FR.backT = 0; return; }
  const m = FPS.me;
  ZM.ghost = false; ZM.downT = 0; m.dead = 0; m.hp = ZMC.HP; m.protect = 3; m.iframe = ZMC.IFRAME_UP; FR.lost = false; FR.backT = 0;
  if (FR.kit) { ZM.downKit = FR.kit; FR.kit = null; zmDownDisarm(); } else raidLoadout();
  frPlaceAtStart();
  ZM.banner = { text: 'Back on your feet', t: 2.5, small: true, col: '#ffe2a8' };
  fpsFeed(how === 'call' ? 'The light brought you back out of the fog.' : 'You’re back on your feet.');
  try { zmSound('wind'); } catch (e) {}
}
function frPlaceAtStart() {
  const m = FPS.me, slot = Math.max(0, ZM.hum.findIndex(h => h[0] === m.id));
  m.x = FPSC.CX + ZMD.START[0] + [0, 1.5, -1.5, 0][slot % 4]; m.y = FPSC.CY + ZMD.START[1] + [0, -1.6, -1.6, 1.8][slot % 4];
  m.jz = m.fl = ZMD.TOP; m.vz = 0;
}
// (raidUseStage, bled out at the change of stage) waiting on an extra life: back now, at its start; lost: still lost
function frStageGhost() { if (!FR.on) return false; if (!FR.lost) frBack('stage'); return true; }
// (zmCheckOver, hosting) the run's over when everyone is lost at once (waiting on an extra life isn't lost)
function frCheckOver() {
  if (!(ZM.ghost && FR.lost)) return;
  for (const r of FPS.remote.values()) { if (r.left) continue; if (!r.dead || r.frLost === false) return; }
  fpsFeed('Everyone is lost in the fog.');
  zmEnd();
}
// things the host says to everyone once: [seq, kind, who ('' everyone)]: 'back' (the lost brought back), 'life' (an
// extra life given back)
function frRunEvent(k, who) {
  if (ZM.net === 'client') return;
  FR.ev.push([++FR.eseq, k, who || '']); if (FR.ev.length > 8) FR.ev.shift();
  frRunEventHere(k, who || '');
}
function frRunEventHere(k, who) {
  if (who && who !== FPS.me.id) return;
  if (k === 'back' && ZM.ghost && FR.lost) frBack('call');
  else if (k === 'life' && ZM.net && FR.life < FRC.LIVES) { FR.life = FRC.LIVES; fpsFeed('Your extra life is back.'); }
}
// (hosting or alone) everyone lost in the fog brought back (or only sid)
function frBringBack(sid) { frRunEvent('back', sid); }
// (hosting or alone) an extra life given back to everyone (or only sid); together only, as alone there are none
function frRestoreLife(sid) { frRunEvent('life', sid); }
// (raidMe) each frame, everyone: the wait for your extra life
function frMe(dt) {
  if (FR.backT > 0 && !ZM.over) { FR.backT -= dt; if (FR.backT <= 0) { FR.backT = 0; frBack('life'); } }
}

// ---------- playing together (src/zmnet.js) ----------
// the host's word for the run: frw = [reach, stop, push, the plan, the run's events, won, the reach pushed, islands lit]
const frPlanPack = p => [p.key, p.kind || '', p.rule || '', p.look || '', p.n | 0, p.reach | 0];
function frPack(z) { frChartPack(z); z.frw = [FR.reach, FR.stop, FR.push, FR.plan.map(frPlanPack), FR.ev, FR.won ? 1 : 0, FR.pushR, FR.lit | 0]; }
// (raidApply, first of all) joined: the plan, so the stage number that follows lays out what the host has
function frApplyRun(hz) {
  const a = hz.frw; if (!Array.isArray(a)) return;
  FR.reach = clamp(a[0] | 0, 1, 3); FR.stop = Math.max(0, a[1] | 0); FR.push = Math.max(0, +a[2] || 0); FR.pushR = clamp(a[6] | 0 || 1, 1, 3); FR.won = !!a[5]; FR.lit = Math.max(0, a[7] | 0);
  if (Array.isArray(a[3]) && a[3].length) {
    const plan = a[3].filter(e => Array.isArray(e) && RAID_STAGES[e[0]]).map(e => ({ key: String(e[0]), kind: String(e[1] || ''), rule: String(e[2] || ''), look: FR_LOOKS.includes(e[3]) ? e[3] : 'shingle', n: e[4] | 0, reach: clamp(e[5] | 0 || 1, 1, 3) }));
    if (plan.length) { FR.plan = plan; if (plan.map(p => p.key).join() !== RAID_ORDER.join()) frOrderFromPlan(); }
  }
  if (Array.isArray(a[4])) {
    // (the first word heard: what's already happened isn't done again)
    if (FR.evSeen < 0) { FR.evSeen = 0; for (const e of a[4]) if (Array.isArray(e)) FR.evSeen = Math.max(FR.evSeen, e[0] | 0); }
    for (const e of a[4]) { if (!Array.isArray(e) || !((e[0] | 0) > FR.evSeen)) continue; FR.evSeen = e[0] | 0; frRunEventHere(String(e[1]), String(e[2] || '')); }
  }
  frChartApply(hz);   // [chart]
}
// my lives, in my presence: [extra lives, lost, waiting to come back]
function frPresence(z) { if (FR.on) z.frp = [FR.life, FR.lost ? 1 : 0, FR.backT > 0 ? 1 : 0]; }
function frHeard(r, z) { if (Array.isArray(z.frp)) { r.frLife = z.frp[0] | 0; r.frLost = !!z.frp[1]; r.frBack = !!z.frp[2]; } }
// dropping out and coming back (src/rejoin.js, through src/zmnet.js znRjSnap and znRjAfter): the run's seed and stage
// (for the record), and my lives
function frRjSnap() { return FR.on ? { seed: FR.seed, st: RAID.stage, life: FR.life, lost: FR.lost ? 1 : 0, back: Math.ceil(FR.backT) } : null; }
function frRjAfter(fr) {
  if (!FR.on || !fr || typeof fr !== 'object') return;
  FR.life = clamp(fr.life | 0, 0, FRC.LIVES);
  if (ZM.ghost) { FR.lost = !!fr.lost; FR.backT = FR.lost ? 0 : Math.max(1, Math.min(FRC.BACK, +fr.back || FRC.BACK)); }
}

// ---------- painted on top ----------
function frHudTitle(S) { const p = frPlanNow(), R = FR_REACH[FR.reach] || FR_REACH[1]; return `Fog Run · ${R.n} · ${p && p.key === 'frsail' ? 'at sea, to stop ' + p.n : (S.n || 'an island')}`; }
// (raidHud) lost, or waiting on your extra life
function frHud(phone, mono, fell) {
  if (!(ZM.ghost && !ZM.over)) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 18 : 26);
  ctx.fillStyle = FR.lost ? 'rgba(200,212,224,0.92)' : '#ffe2a8';
  ctx.fillText(FR.lost ? 'Lost in the fog' : `Back on your feet in ${Math.ceil(FR.backT)} s`, cx, H * 0.22);
  ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = 'rgba(236,228,207,0.7)';
  if (FR.lost) ctx.fillText('When the island’s light is lit, everyone lost is brought back', cx, H * 0.22 + (phone ? 24 : 34));
  ctx.textBaseline = 'alphabetic';
}
// (raidStaminaHud) the extra life: a little lamp after the stamina bar, lit while you still have it (together only)
function frLifeHud(x, y, h, phone, mono) {
  if (!FR.on || !ZM.net) return;
  const on = FR.life > 0, s = h + 6, X = x + 4, t = g.t;
  ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(X - 3, y - 3, s + 6, h + 6);
  ctx.fillStyle = on ? `rgba(255,214,140,${0.8 + 0.2 * Math.sin(t * 3)})` : 'rgba(120,110,96,0.6)';
  ctx.beginPath(); ctx.arc(X + s / 2, y + h / 2, Math.max(2, h / 2 - 1), 0, 6.283); ctx.fill();
  ctx.fillRect(X + s / 2 - 2, y - 2, 4, 2);
  ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = on ? 'rgba(255,226,168,0.75)' : 'rgba(236,228,207,0.45)';
  ctx.fillText(on ? 'EXTRA LIFE' : 'NO EXTRA LIFE', X - 3, y - 3); ctx.textBaseline = 'alphabetic';
}
// (raidShowOver) the end card's line
function frOverStats() {
  const lit = FR.lit | 0, R = FR_REACH[FR.reach] || FR_REACH[1];
  return (ZM.net ? `${ZM.hum.length} of you. ` : '') + `${lit} ${lit === 1 ? 'island' : 'islands'} lit, out as far as ${R.n}, in ${raidClock(RAID.t)}. ${ZM.kills} of the drowned sent back (${ZM.heads} through the head).`;
}

// ---------- for tests ----------
// frDebug(stageKey, seed): straight to a stage ('frsail', 'fr_fight', or 'win'), with a fixed seed. Not in a run: a run
// alone is begun with that seed (the calling picked for you) and then on to the stage. In one (alone or hosting):
// straight there.
function frDebug(key, seed) {
  key = key || 'frsail';
  if (!(FPS.on && FR.on && RAID.on)) {
    if (FPS.on) return false;
    FR.want = seed == null ? 0x5eed : seed >>> 0; FR.debug = key;
    zmStart({ map: 'fogrun' });
    return true;
  }
  if (ZM.net === 'client') return false;
  if (seed != null) FR.seed = seed >>> 0;
  if (key === 'win') { frWin(); return true; }
  frJump(key);
  return true;
}
// (alone or hosting) on to a stage of that key now, for the next stop (or the one this stage is for)
function frJump(key) {
  if (!RAID_STAGES[key]) return false;
  const cur = frPlanNow(), stop = cur && cur.key === 'frsail' ? FR.next : frNextStop() || FR.next;
  const s = Object.assign({}, stop || { kind: 'fight', rule: 'hold', look: 'shingle', n: 1, reach: 1 });
  if (key !== 'frsail') { const k = Object.keys(FR_KINDS).find(k => FR_KINDS[k].key === key); if (k) s.kind = k; }
  FR.next = s;
  FR.plan.length = RAID.stage + 1; FR.plan.push(key === 'frsail' ? frSailTo(s) : frIsleOf(s)); frOrderFromPlan();
  raidUseStage(RAID.stage + 1);
  return true;
}

// ---------- its card on the title screen ----------
(() => {
  if (!$('frTitle')) return;
  $('frPlay').addEventListener('click', () => { if (typeof ZN !== 'undefined' && ZN.code) return; zmStart({ map: 'fogrun' }); });
  $('frSettings').addEventListener('click', () => $('titleSettings').click());
  $('frWcrate').addEventListener('click', () => $('wcrateBtn').click());
  $('frOcrate').addEventListener('click', () => $('ocrateBtn').click());
  if ($('frBanner')) $('frBanner').addEventListener('click', () => { $('frTitle').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('frPlay').focus({ preventScroll: true }), 400); });
})();
