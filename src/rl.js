'use strict';
// Skerry Clash: a duel of lights for two, in real time. Two keepers' rocks face each other across a tidal race; each
// keeps a Great Light (at the back, in the middle) and two Lamp Towers (one forward on each lane). Each player holds
// four cards from a deck of eight (src/rlcards.js) and spends lamp oil on them: crews, crabs, the drowned and the
// birds walk or fly over the two causeways at the towers across the water; spells fall anywhere; buildings stand
// where they're set down and wear away. A fallen Lamp Tower is a crown, the Great Light falling is all three and ends
// it. Three minutes; the last minute fills oil twice as fast; level at time is a minute of overtime, sudden death;
// still level, the side whose weakest tower is lower loses (rlTieBreak). Against the bot (src/rlbot.js) or online (src/rlnet.js, the host runs the match).
//
// This file is the rules and the match: the state (RL, its shape agreed in design.md, read by the view src/rl3d.js,
// the HUD src/rlhud.js, the bot and the net code), the simulation, the snapshots that carry it to another screen, and
// the way in and out of the mode (state 'rival', drawn from src/main.js's frame loop through rlFrame).
//
// The simulation runs in fixed ticks of a twentieth of a second (rlTick), so that a match plays the same on every
// screen and at any frame rate; what's drawn between ticks is interpolated (rlAlpha: each unit keeps px, py, where it
// was at the last tick). Arena units are tiles: x 0 to 18 across, y 0 to 32 from side 0's back edge to side 1's; the
// race (water) is y 15 to 17, crossed by two causeways two tiles wide centred on x 3.5 and x 14.5.
// Ground troops walk to the near end of the better causeway, cross, and go for the nearest thing they may hit within
// sight (5.5 tiles), else the next enemy tower down their lane (the Lamp Tower, then the Great Light). Flyers go
// straight. Everyone keeps a little apart (circle separation; towers and buildings don't give way). A unit that has
// begun to strike keeps its target while it stays in reach. Towers shoot the nearest enemy in range; the Great Light
// sleeps until it's hit or one of its Lamp Towers falls.
// The abilities on the cards (see the top of src/rlcards.js) are all here: revive, bomb, cloak, charge, slowhit for
// troops; lob, stun, wave, haar and bolts for spells; lure and spawn for buildings. And those that came with the second
// 32 cards: burst, leap, shield, drain, heal, spin, rally, deathspawn and chain for troops; pull, mend, haste, dot,
// summon and whirl for spells; tar, blast, lob (a Mortar Pit's arcing shell, with its least range minr), ramp and oil
// for buildings, and spawn's sn (how many come at a time).
// How they work, in short: a burst flies at the nearest foe and goes off on it (like a bomb, but at anything); a leap
// is a pounce of up to lp tiles onto a target on the same dry rock, biting as it lands, then 3 s before the next; a
// shell (sh) is spent before hit points; drain mends the striker by half of each hit; a healer never strikes, keeps
// beside the friend nearest it (the furthest forward if there's a choice) and mends all friends within its reach hl
// once a second; spin lands each blow on everyone round the swinger; rally makes friends within 4 tiles strike 30%
// faster; deathspawn lets sn of the sp card out where it fell; chain leaps from the struck to ch more within 3 tiles,
// each at full damage. Pull drags every enemy on foot in r most of the way to the middle at once (never over the race)
// and then strikes; mend, haste, dot and whirl are lasting zones in Z (haste: 40% faster moving and striking while
// inside; dot: dmg a second, struck every half second; whirl: dragged 3 tiles a second to the middle, dmg every half
// second); summon strikes, then sets the sp card's troops down there for the caster (on the nearer bank if it falls
// in the race). Tar halves the speed of enemy walkers within its rng; blast, when its breath is back (hit seconds) and
// a walker is within rng, strikes every walker there and knocks them kb tiles away; a lob building's shell doesn't
// home, and it never aims at anything nearer than minr; ramp burns its target without a shot, x1, then x3 after 2 s
// on the same one, x8 after 4 s; oil adds one to its owner's oil every ev seconds.
// Speeds: a unit's pace and its striking are slowed by a slowing hit (35%) and the haar (45%) and hastened by Fair
// Wind (40%); tar halves the pace only, a rally quickens the striking only.
//
// The state's arrays: T the six towers (fixed order: side 0's Great Light, left lamp, right lamp, then side 1's), U the
// units (troops and buildings), P the projectiles (each knows where it left from, sx sy, and where it's going, tx ty,
// homing on its target; its place is the straight line between, with an arc for the lobbed ones), Z the lasting
// spells (the haar's fog bank, the rogue wave rolling), and FX the events for the view and the sound (ids rise through
// the match; each consumer remembers the highest id it has handled; most are kept two seconds, hits a little less).
// The snapshot (rlSnap) is all of it in short arrays, numbers in tenths; rlApply puts it into the RL of another screen,
// the guest's, which doesn't step the simulation, only interpolates between snapshots and draws.
//
// Hooks into the other parts, all optional (typeof checks): rlDeckMine(), rlSkinMine() (the deck and the tower skin,
// src/rldeck.js, src/rlcrates.js), rlRecord(r) at the end (stats and crates), rlnRequest(play) for the guest's cards,
// rlnTick(dt) every frame online, rlnStop() on leaving an online match, rlnBackToLobby() back on the title card.
// Watching online (net: { spec: true }, src/rlnet.js): a watcher is a guest that never plays (rlTry does nothing), is
// never recorded or rated, sees the board from side 0's end (rlSpecFlip turns it round) and has no hand on its HUD.
// The champions (v206, src/rlcards.js RL_CHAMPS): Maren, Plimsoll and Verity, one at most in a deck. While one is on
// the field its card stays out of the cycle (RL.ch[side]: { c, u its unit, cd }), and its ability is played through
// rlPlay(side, '!ab') (rlAbility), for oil, once its cooldown is over; u.abT is the time the ability has left.
// FX champ { c, x, y, side, r } as one is used. Snapshot: ch [[card, unit, cd]...], and flag 8192 on a unit while abT.
// For three (v208, src/rl3.js): RL.n3 set, three of everything, and the parts of the rules that depend on the ground
// (rlCanPlace, rlWay, rlWater, rlDry, rlDrag, rlLaneTower, the towers falling and the end) handed to rl3* there.
// Tests: rlDebugSpeed(x) runs the clock x times as fast; rlDebugBots(on) lets a second bot play side 0 as well.
//
// For the view (what src/rl3d.js and the sound may key off, on the host and, through rlSnap/rlApply, the guest; the
// same list is kept in rl-kinds.md for the view's side of the merge). Kinds added with the second 32 cards (v200):
//   FX  heal    { c, x, y, side, r }       a Surgeon's pulse (at it, r its reach 3), or a Siren's drain (at her, r 0)
//       leap    { c, x, y, tx, ty, side }  a Ship's Cat pounces from (x, y) to (tx, ty); it's already there (instant)
//       chain   { c, pts, side, x, y }     the Stormcaller's lightning: pts [[x, y], ...] the first struck, then each
//                                          it leapt on to; x, y the first
//       pull    { c, x, y, r, side }       a Tide Pull drags everything on foot in r to (x, y), at once
//       blast   { c, x, y, r, side }       a Fog Horn bellows (r its reach); the walkers in it are knocked back
//       oil     { c, x, y, side }          an Oil Store gives its owner one oil
//       shield  { c, x, y, side }          a Lobster Knight's shell breaks
//       burst   { c, x, y, r, side }       a Will-o'-the-Wisp goes off (r its splash); it dies with no 'die'
//       summon  { c, x, y, r, side }       a Shipwreck's crew comes out: c the card that comes ('wreckers'), r the spell's
//       spin    { c, x, y, r, side }       an Anchor Swinger's blow lands all round her (r its splash)
//       spawn   (as before)                now also each crab out of a fallen Crab Mother
//   Z   mend, haste, dot, whirl            { id, k, x, y, r, side, t (seconds since it began), dur }: time left dur - t
//       (a Tar Barrel's mire is no zone: it's the unit's own, radius RL_CARD.tarpit.rng)
//   P   herring (fishwives), net (netthrower), grenade (grenadier: arcs, doesn't home, splash), rocket (rocketcrew),
//       song (siren), bolt2 (stormcaller; a 'chain' follows), mortar (Mortar Pit: arcs high, doesn't home, splash),
//       gale (petrel); the Martello Tower fires the Sea Battery's 'ball'; the Sea Eagle and the Kraken's Arm are melee
//   U   sh   shell left (Lobster Knight; its whole is RL_CARD.lobster.sh), 0 when spent
//       rp   Burning Lens ramp 0 (x1), 1 (x3), 2 (x8). The lens has no shot: while st is 'hit' it burns tg (a unit
//            or a tower's id) continuously; draw a beam to it, brighter with rp
//       hs   hastened (Fair Wind), ral rallied (by a Wrecker Chief), tar mired (by a Tar Barrel), mend being mended
//            (Lamp Oil, a Surgeon's pulse within the last second, a Siren's drain); each 0 or 1

const RLC = { DT: 0.05, W: 18, H: 32, R0: 15, R1: 17, LX: [3.5, 14.5], CW: 1, OIL0: 5, OILT: 2.8, MAXOIL: 10, LEN: 180, DBL: 60, OT: 60, SIGHT: 5.5, COUNT: 3, DEP: 0.8, POCKET: 4 };
const RL_TW = { lamp: { hp: 3050, dmg: 109, hit: 0.8, rng: 7.5, r: 1.2 }, great: { hp: 4800, dmg: 109, hit: 1.0, rng: 7, r: 1.6 } };
// what each shooter throws, and how fast it flies (tiles a second); the lobbed ones arc (src/rl3d.js draws the arc)
const RL_SHOT = { harpooner: 'harpoon', coastguard: 'shot', cormorant: 'stone', lamplighter: 'oil', mooncusser: 'lantern', lightkeeper: 'flare', battery: 'ball', swivel: 'shot',
  fishwives: 'herring', netthrower: 'net', grenadier: 'grenade', rocketcrew: 'rocket', siren: 'song', stormcaller: 'bolt2', mortar: 'mortar', petrel: 'gale', martello: 'ball' };
const RL_PSPD = { bolt: 15, harpoon: 11, shot: 20, stone: 10, oil: 7, lantern: 6.5, flare: 13, ball: 12, herring: 12, net: 8, grenade: 7, rocket: 9, song: 8, bolt2: 22, mortar: 7, gale: 14 };
// (the lobbed shots that don't home: they come down where the target stood when they left)
const RL_ARC = { grenade: 1, mortar: 1 };
const RL_PK = ['bolt', 'harpoon', 'shot', 'stone', 'oil', 'lantern', 'flare', 'ball', 'lob', 'keg', 'herring', 'net', 'grenade', 'rocket', 'song', 'bolt2', 'mortar', 'gale'];
const RL_FK = ['deploy', 'spell', 'die', 'tower', 'hit', 'boom', 'revive', 'bolt', 'ring', 'flash', 'go', 'dbl', 'ot', 'spawn', 'end', 'crown', 'splash',
  'heal', 'leap', 'chain', 'pull', 'blast', 'oil', 'shield', 'burst', 'summon', 'spin', 'champ', 'emote', 'out'];   // (emote: { c the emote's id, side }, src/rlemote.js; out: a keeper out of a match for three, src/rl3.js)
const RL_ZK = ['haar', 'wave', 'mend', 'haste', 'dot', 'whirl'];
const RL_ST = ['idle', 'walk', 'hit'];
const RL_BOTNM = { easy: 'Apprentice Pell', normal: 'Keeper Morrow', hard: 'Old Grisewood' };
var RL = { on: false, mode: 'bot', me: 0, ph: 'off', t: 0, left: RLC.LEN, ot: false, dbl: false, oil: [0, 0], hand: [[], []], next: ['', ''], queue: [[], []],
  names: ['', ''], skins: ['', ''], decks: [[], []], T: [], U: [], P: [], Z: [], FX: [], crowns: [0, 0], win: -1, bot: { lvl: 'normal' }, nid: 1, clk: 0, cnt: 0, acc: 0, speed: 1, net: null, n3: false, alive: [1, 1], outs: [], bots: [] };

// ---------- small things ----------
function rlRng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rlD = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rlR = e => e.r != null ? e.r : e.size;   // (a tower's radius, or a unit's body)
const rlIsGuest = () => RL.mode === 'net' && !!RL.net && !RL.net.host;
const rlIsSpec = () => RL.mode === 'net' && !!RL.net && !!RL.net.spec;   // (watching: a guest that never plays)
const rlLaneOf = x => x < RLC.W / 2 ? 0 : 1;
function rlFx(k, o) { const f = Object.assign({ id: RL.nid++, k, at: RL.clk }, o); RL.FX.push(f); return f; }
function rlMyName() { const v = (typeof NET !== 'undefined' && NET.nick) || ''; return String(v).replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16) || 'You'; }
function rlDeckOk(d) { return Array.isArray(d) && d.length === 8 && d.every(c => RL_CARD[c]) && new Set(d).size === 8 && d.filter(rlIsChamp).length <= 1 ? d.slice() : RL_DEFAULT_DECK.slice(); }

// ---------- the match begins ----------
// o = { mode: 'bot' | 'net', me, names, decks: [[8], [8]], skins: [a, b], lvl, seed, net: { host }, draft (the decks were drafted, src/rldraft.js) }
function rlStart(o) {
  o = o || {};
  const seed = (o.seed >>> 0) || ((Math.random() * 4294967295) >>> 0), n3 = !!o.n3, SS = n3 ? [0, 1, 2] : [0, 1];   // (n3: three keepers, src/rl3.js)
  Object.assign(RL, { on: true, mode: o.mode === 'net' ? 'net' : 'bot', me: n3 ? Math.max(0, Math.min(2, o.me | 0)) : o.me === 1 ? 1 : 0, net: o.net || null, ph: 'count', t: 0, left: RLC.LEN, ot: false, dbl: false,
    oil: SS.map(() => RLC.OIL0), names: SS.map(i => String((o.names && o.names[i]) || (i ? 'Rival' : 'You')).slice(0, 16)), skins: SS.map(i => (o.skins && o.skins[i]) || ''),
    decks: SS.map(i => rlDeckOk(o.decks && o.decks[i])), U: [], P: [], Z: [], FX: [], crowns: SS.map(() => 0), win: -1, bot: { lvl: o.lvl || 'normal' }, nid: 1, clk: 0, cnt: RLC.COUNT, acc: 0,
    seed, rng: rlRng(seed), draft: !!o.draft, pend: null, ch: SS.map(() => rlChNew()), recorded: false, lastSnap: 0, snapDur: 90, both: RL.both || false,
    n3, alive: SS.map(() => 1), outs: [], bots: n3 ? (Array.isArray(o.bots) ? o.bots.filter(s => s >= 0 && s < 3) : o.mode === 'net' ? [] : [1, 2]) : [] });
  RL.hand = SS.map(() => []); RL.next = SS.map(() => ''); RL.queue = SS.map(() => []);
  for (const s of SS) { const d = RL.decks[s].slice(); for (let i = d.length - 1; i > 0; i--) { const j = (RL.rng() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; } RL.hand[s] = d.slice(0, 4); RL.next[s] = d[4]; RL.queue[s] = d.slice(5); }
  RL.T = n3 ? rl3Towers() : [];
  if (!n3) for (const s of [0, 1]) { const Y = y => s ? RLC.H - y : y; RL.T.push(rlTower(s, 'great', -1, 9, Y(3.5)), rlTower(s, 'lamp', 0, RLC.LX[0], Y(7)), rlTower(s, 'lamp', 1, RLC.LX[1], Y(7))); }
  if (typeof rlBotReset === 'function') rlBotReset();
  rlEnter();
  rlFx('go', { x: 9, y: 16, side: 0 });
}
// each side's champion: c its card while it's on the field, u its unit's id, cd the seconds before its ability is ready
function rlChNew() { return { c: '', u: 0, cd: 0 }; }
function rlTower(side, k, lane, x, y) { const S = RL_TW[k]; return { id: RL.nid++, side, k, lane, x, y, r: S.r, hp: S.hp, max: S.hp, awake: k === 'lamp', cd: 0, tg: 0, down: 0 }; }
// against the bot: my deck and skin (Meta's), its deck, the level from the title card's select
function rlPlayBot(lvl) {
  lvl = lvl || ($('rlBotLvl') && $('rlBotLvl').value) || 'normal'; if (!RL_BOTNM[lvl]) lvl = 'normal';
  const mine = typeof rlDeckMine === 'function' ? rlDeckMine() : RL_DEFAULT_DECK, sk = typeof rlSkinMine === 'function' ? rlSkinMine() : '';
  rlStart({ mode: 'bot', me: 0, names: [rlMyName(), RL_BOTNM[lvl]], decks: [mine, typeof rlBotDeck === 'function' ? rlBotDeck(lvl) : RL_DEFAULT_DECK], skins: [sk || '', ''], lvl });
}

// ---------- playing a card ----------
// may this side set this card down here? (spells: anywhere on the arena; the rest on your own bank, or the pocket
// beyond the race opened when the enemy Lamp Tower of that lane falls; never on a standing tower)
function rlCanPlace(side, c, x, y) {
  if (RL.n3) return rl3CanPlace(side, c, x, y);
  const C = RL_CARD[c]; if (!C || !(x >= 0.4 && x <= RLC.W - 0.4 && y >= 0.4 && y <= RLC.H - 0.4)) return false;
  // (spells fall anywhere, but the Shipwreck's crew must land on your own rock, so it goes down only where a troop could)
  if (C.type === 'spell' && C.ab !== 'summon') return true;
  let ok = side === 0 ? y < RLC.R0 - 0.1 : y > RLC.R1 + 0.1;
  if (!ok) { const et = RL.T.find(t => t.side !== side && t.k === 'lamp' && t.lane === rlLaneOf(x)); if (et && et.hp <= 0) ok = side === 0 ? y > RLC.R1 + 0.1 && y < RLC.R1 + RLC.POCKET : y < RLC.R0 - 0.1 && y > RLC.R0 - RLC.POCKET; }
  if (!ok) return false;
  for (const t of RL.T) if (t.hp > 0 && Math.hypot(x - t.x, y - t.y) < t.r + 0.35) return false;
  return true;
}
// why not (for the HUD's word): '' when it can be played
function rlWhyNot(side, c, x, y) {
  const C = RL_CARD[c]; if (!C) return 'No card';
  if (RL.ph !== 'play') return RL.ph === 'count' ? 'Not yet' : 'Over';
  if (RL.n3 && !RL.alive[side]) return 'Your light is out';
  if (RL.oil[side] < C.cost - 1e-6) return 'Not enough oil';
  if (x != null && !rlCanPlace(side, c, x, y)) return C.type === 'spell' && C.ab !== 'summon' ? 'Off the arena' : 'Only on your own rock';
  return '';
}
// a card played (by this screen's player, the bot, or the guest through the host): checked, then done
function rlPlay(side, c, x, y) {
  if (!RL.on || RL.ph !== 'play' || !(side >= 0 && side < RL.oil.length) || (RL.n3 && !RL.alive[side])) return false;
  if (c === '!ab') return rlAbility(side);   // (the champion's ability: the guest's taps come this way too)
  const i = RL.hand[side].indexOf(c), C = RL_CARD[c]; if (i < 0 || !C) return false;
  x = +x; y = +y; if (!isFinite(x) || !isFinite(y) || RL.oil[side] < C.cost - 1e-6 || !rlCanPlace(side, c, x, y)) return false;
  RL.oil[side] -= C.cost;
  RL.hand[side][i] = RL.next[side]; RL.next[side] = RL.queue[side].shift();
  if (!C.champ) RL.queue[side].push(c);   // (a champion's card comes round again only once it has fallen)
  if (C.type === 'spell') rlCast(side, C, x, y);
  else {
    const n = C.cnt || 1;
    const us = rlCrowd(side, C, x, y, 0);
    if (C.champ) RL.ch[side] = { c, u: us[0].id, cd: C.champ.cd0 || 2 };
    rlFx('deploy', { c, x, y, side, r: n > 1 ? 1.2 : (C.size || 0.5) + 0.3 });
  }
  return true;
}
// the local player's tap or drop (the guest asks the host instead, and shows a ghost until the snapshot has it)
function rlTry(c, x, y) {
  if (rlIsSpec()) return false;
  const why = rlWhyNot(RL.me, c, x, y);
  if (why) { if (typeof rlHudSay === 'function') rlHudSay(why, 1.2, true); return false; }
  if (rlIsGuest()) { if (typeof rlnRequest === 'function') rlnRequest({ c, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }); RL.pend = { c, x, y, at: performance.now(), oil: RL.oil[RL.me] }; return true; }
  return rlPlay(RL.me, c, x, y);
}
// ---------- the champions (v206) ----------
// the side's champion on the field, if it's there and standing
function rlChampUnit(side) { const h = RL.ch && RL.ch[side]; if (!h || !h.u) return null; const u = RL.U.find(q => q.id === h.u); return u && u.hp > 0 ? u : null; }
// why its ability can't be used now ('' when it can)
function rlAbWhy(side) {
  const u = rlChampUnit(side), A = u && RL_CARD[u.c].champ; if (!A) return 'No champion on the field';
  if (RL.ph !== 'play') return 'Not yet';
  if (u.dep > 0) return 'Not yet';
  if (u.abT > 0) return A.n + ' is still on';
  if (RL.ch[side].cd > 0.05) return A.n + ' in ' + Math.ceil(RL.ch[side].cd) + ' s';
  if (RL.oil[side] < A.cost - 1e-6) return 'Not enough oil';
  if (u.c === 'plimsoll' && !rlPlimTarget(u, A)) return 'Nothing near enough to lunge at';
  return '';
}
// the strongest enemy Plimsoll can lunge at: within reach, on the same dry rock (towers too)
function rlPlimTarget(u, A) {
  let best = null, bh = -1;
  for (const e of RL.U.concat(RL.T)) { if (!rlCanHit('ground', u.side, e) || (e.k && e.hp <= 0)) continue; const d = rlD(u, e) - rlR(e); if (d > A.r || !rlDry(u.x, u.y, e.x, e.y)) continue; const h = e.hp; if (h > bh) { bh = h; best = e; } }
  return best;
}
function rlAbility(side) {
  if (!RL.on || !(side >= 0 && side < RL.oil.length) || rlAbWhy(side)) return false;
  const u = rlChampUnit(side), C = RL_CARD[u.c], A = C.champ;
  RL.oil[side] -= A.cost; RL.ch[side].cd = A.cd; u.abT = A.dur; u.abA = 0;
  if (u.c === 'plimsoll') {
    const T = rlPlimTarget(u, A), d = rlD(u, T) || 1e-3, back = rlR(T) + u.size * 0.6 + C.rng * 0.4, fx = u.x, fy = u.y;
    u.px = u.x; u.py = u.y; u.x = T.x - (T.x - u.x) / d * back; u.y = T.y - (T.y - u.y) / d * back; rlWater(u);
    rlFx('leap', { c: u.c, x: fx, y: fy, tx: u.x, ty: u.y, side });
    u.tg = T.id; u.lock = 0; u.rt = 0.5; u.st = 'hit'; u.face = Math.atan2(T.x - u.x, T.y - u.y); u.stun = 0;
    rlHurt(T, C.dmg * A.mul, side); u.cd = C.hit * 0.5;
    rlFx('hit', { c: u.c, x: T.x, y: T.y, side, r: 2 });
  } else if (u.c === 'verity') {
    for (const e of rlEnemiesIn(side, u.x, u.y, A.r, false, true)) if (!e.bld) { e.stun = Math.max(e.stun, A.st); e.lock = 0; }
    u.hp = Math.min(u.max, u.hp + (A.hl || 0)); u.mendT = 1; rlFx('heal', { c: u.c, x: u.x, y: u.y, side, r: 0 });   // (and he mends)
  }
  rlFx('champ', { c: u.c, x: u.x, y: u.y, side, r: A.r });
  return true;
}
// the local player's tap on the ability (the guest asks the host)
function rlTryAb() {
  if (rlIsSpec()) return false;
  const why = rlAbWhy(RL.me);
  if (why) { if (typeof rlHudSay === 'function') rlHudSay(why, 1.2, true); return false; }
  if (rlIsGuest()) { if (typeof rlnRequest === 'function') rlnRequest({ c: '!ab', x: 0, y: 0 }); return true; }
  return rlAbility(RL.me);
}
// every tick: the cooldowns, and what an ability does while it lasts (Maren's light slows and drowns all round her)
function rlChampTick(dt) {
  for (const h of RL.ch) if (h.cd > 0) h.cd = Math.max(0, h.cd - dt);
  for (const u of RL.U) {
    if (!(u.abT > 0) || u.hp <= 0) continue;
    u.abT -= dt;
    if (u.c === 'maren') {
      const A = RL_CARD.maren.champ;
      for (const e of rlEnemiesIn(u.side, u.x, u.y, A.r, false, true)) if (!e.bld) e.slow = Math.max(e.slow, 0.3);
      u.abA += dt; while (u.abA >= 0.5) { u.abA -= 0.5; rlBlast(u.side, u.x, u.y, A.r, A.dps * 0.5, A.tw, true); }
    }
    if (u.abT <= 0) u.abT = 0;
  }
}
// a card's troops set down round a point, in a little whorl (cnt of them); a walker never lands in the race (it's
// put on the bank: its own side's for a card played, the nearer one for a Shipwreck's crew)
function rlCrowd(side, C, x, y, late, near) {
  const n = C.cnt || 1, out = [];
  for (let k = 0; k < n; k++) {
    const r = n > 1 ? 0.5 * Math.sqrt(k + 0.5) : 0, a = k * 2.4 + (side ? Math.PI : 0);
    let px = x + Math.sin(a) * r, py = y + Math.cos(a) * r * 0.8;
    if (RL.n3) { [px, py] = rl3Fix(px, py, side, near, C.air); out.push(rlSpawn(side, C.id, px, py, late + k * 0.05)); continue; }
    px = Math.max(0.4, Math.min(RLC.W - 0.4, px)); py = Math.max(0.4, Math.min(RLC.H - 0.4, py));
    if (!C.air && py > RLC.R0 && py < RLC.R1) py = (near ? py > (RLC.R0 + RLC.R1) / 2 : side) ? RLC.R1 + 0.2 : RLC.R0 - 0.2;
    out.push(rlSpawn(side, C.id, px, py, late + k * 0.05));
  }
  return out;
}
// moved by a spell or a blast (pulled, whirled, knocked): never over the race, only along a causeway or to the bank's
// edge; whoever is moved looks for a target afresh
function rlDrag(u, nx, ny) {
  if (u.bld) return;
  if (RL.n3) { rl3Drag(u, nx, ny); return; }
  const bank = y => y <= RLC.R0 ? -1 : y >= RLC.R1 ? 1 : 0, b0 = bank(u.y);
  if (!u.air && b0 && bank(ny) !== b0) ny = b0 < 0 ? Math.min(ny, RLC.R0) : Math.max(ny, RLC.R1);
  u.px = u.x; u.py = u.y;
  u.x = Math.max(0.3, Math.min(RLC.W - 0.3, nx)); u.y = Math.max(0.3, Math.min(RLC.H - 0.3, ny));
  rlWater(u); u.lock = 0;
}
function rlSpawn(side, c, x, y, late) {
  const C = RL_CARD[c];
  const u = { id: RL.nid++, c, side, x, y, px: x, py: y, hp: C.hp, max: C.hp, air: !!C.air, size: C.size || 0.4, tg: 0, cd: 0, st: 'idle', face: rlFace0(side),
    cloak: C.ab === 'cloak' ? C.cl || 3 : 0, slow: 0, stun: 0, bld: C.type === 'building', life: C.life || 0, dep: RLC.DEP + (late || 0), run: 0, chg: 0, rv: 0, fog: 0, ev: C.ev || 0, ring: C.hit || 4, rt: 0, lock: 0,
    sh: C.ab === 'shield' ? C.sh || 0 : 0, rp: 0, rpT: 0, hs: 0, ral: 0, tar: 0, mendT: 0, lpcd: 0, hlT: 1, abT: 0, abA: 0 };
  RL.U.push(u); return u;
}

// ---------- spells ----------
function rlCast(side, C, x, y) {
  const dir = side ? -1 : 1;
  rlFx('spell', { c: C.id, x, y, side, r: C.r });
  if (C.ab === 'lob') {
    const g = RL.T.find(t => t.side === side && t.k === 'great'), sx = g ? g.x : 9, sy = g ? g.y : (side ? RLC.H - 3 : 3);
    RL.P.push({ id: RL.nid++, k: C.id === 'powderkeg' ? 'keg' : 'lob', side, sx, sy, x: sx, y: sy, tx: x, ty: y, t: 0, dur: C.fl || 1, tg: 0, dmg: C.dmg, sp: C.r, tw: C.tw, c: C.id, air: 1 });
  } else if (C.ab === 'wave' && RL.n3) {
    // (for three: it rolls out from the caster's Great Light through where it was cast)
    const g = RL.T.find(t => t.side === side && t.k === 'great'), ang = g ? Math.atan2(y - g.y, x - g.x) : Math.atan2(rl3Fwd(side)[1], rl3Fwd(side)[0]);
    RL.Z.push({ id: RL.nid++, k: 'wave', side, x, y, x0: x, y0: y, ang, t: 0, dur: (C.len || 9) / 6, r: C.r, w: C.w || 3, dir: 1, dmg: C.dmg, tw: C.tw, kb: C.kb || 1.5, hit: [] });
  } else if (C.ab === 'wave') {
    RL.Z.push({ id: RL.nid++, k: 'wave', side, x, y, y0: y, t: 0, dur: (C.len || 9) / 6, r: C.r, w: C.w || 3, dir, dmg: C.dmg, tw: C.tw, kb: C.kb || 1.5, hit: [] });
  } else if (C.ab === 'haar') {
    RL.Z.push({ id: RL.nid++, k: 'haar', side, x, y, t: 0, dur: C.dur || 5, r: C.r });
  } else if (C.ab === 'mend' || C.ab === 'haste' || C.ab === 'dot' || C.ab === 'whirl') {
    RL.Z.push({ id: RL.nid++, k: C.ab, side, x, y, t: 0, dur: C.dur || 4, r: C.r, dmg: C.dmg || 0, tw: C.tw || 0, hl: C.hl || 0, acc: 0.5 });
  } else if (C.ab === 'pull') {
    for (const e of rlEnemiesIn(side, x, y, C.r, false, false)) if (!e.bld) { rlDrag(e, x + (e.x - x) * 0.2, y + (e.y - y) * 0.2); e.stun = Math.max(e.stun, 0.25); e.lock = 0; e.rt = 0; }
    rlFx('pull', { c: C.id, x, y, r: C.r, side });
    rlBlast(side, x, y, C.r, C.dmg, C.tw, true);
  } else if (C.ab === 'summon') {
    rlBlast(side, x, y, C.r, C.dmg, C.tw, true);
    rlFx('flash', { c: C.id, x, y, side, r: C.r });
    const S = RL_CARD[C.sp] ? RL_CARD[C.sp] : RL_CARD.wreckers;
    rlCrowd(side, S, x, y, 0.15, C.r);
    rlFx('summon', { c: S.id, x, y, side, r: C.r });
  } else if (C.ab === 'bolts') {
    const cand = rlEnemiesIn(side, x, y, C.r, true).sort((a, b) => b.hp - a.hp).slice(0, C.k || 3);
    cand.forEach((e, i) => { rlHurt(e, e.k ? C.dmg * C.tw : C.dmg, side); rlFx('bolt', { c: C.id, x: e.x, y: e.y, side, r: i }); });
    if (!cand.length) rlFx('bolt', { c: C.id, x, y, side, r: 0 });
  } else {
    rlBlast(side, x, y, C.r, C.dmg, C.tw, true);
    if (C.ab === 'stun') for (const e of rlEnemiesIn(side, x, y, C.r, true)) if (!e.k && !e.bld) e.stun = Math.max(e.stun, C.st || 0.5);
    rlFx('flash', { c: C.id, x, y, side, r: C.r });
  }
}
// the enemies of a side within r of a point (their bodies counted): units that may be struck, and towers if asked
function rlEnemiesIn(side, x, y, r, towers, air) {
  const out = [];
  for (const u of RL.U) if (u.side !== side && u.hp > 0 && !(u.cloak > 0) && (air !== false || !u.air) && Math.hypot(u.x - x, u.y - y) <= r + u.size * 0.5) out.push(u);
  if (towers) for (const t of RL.T) if (t.side !== side && t.hp > 0 && Math.hypot(t.x - x, t.y - y) <= r + t.r * 0.6) out.push(t);
  return out;
}
// damage over an area: units in full, towers by tw of it (air too unless air === false)
function rlBlast(side, x, y, r, dmg, tw, air) { for (const e of rlEnemiesIn(side, x, y, r, true, air)) rlHurt(e, e.k ? dmg * (tw == null ? 1 : tw) : dmg, side); }
function rlHurt(e, dmg, by) {
  if (!(dmg > 0) || e.hp <= 0) return;
  if (e.abT > 0 && e.c === 'maren') return;   // (her Sea-Green Light: nothing can hurt her)
  // a shell soaks the first of it
  if (e.sh > 0) { const a = Math.min(e.sh, dmg); e.sh -= a; dmg -= a; if (e.sh <= 0) { e.sh = 0; rlFx('shield', { c: e.c, x: e.x, y: e.y, side: e.side }); } if (!(dmg > 0)) return; }
  e.hp -= dmg;
  if (e.k) { if (e.k === 'great') e.awake = true; e.hitAt = RL.clk; if (by != null) e.by = by; }
}

// ---------- the clock ----------
function rlTick() {
  const dt = RLC.DT; RL.clk += dt;
  if (RL.ph === 'count') { RL.cnt -= dt; if (RL.cnt <= 0) { RL.ph = 'play'; RL.cnt = 0; } rlFxTrim(); return; }
  if (RL.ph !== 'play') { rlFxTrim(); return; }
  RL.t += dt; RL.left -= dt;
  if (!RL.dbl && (RL.ot || RL.left <= RLC.DBL)) { RL.dbl = true; rlFx('dbl', { x: 9, y: 16, side: 0 }); }
  for (let s = 0; s < RL.oil.length; s++) if (!RL.n3 || RL.alive[s]) RL.oil[s] = Math.min(RLC.MAXOIL, RL.oil[s] + dt / RLC.OILT * (RL.dbl ? 2 : 1));
  if (RL.n3) { for (const s of RL.bots) rl3BotTick(dt, s); if (RL.both) rl3BotTick(dt, RL.me); }
  else if (typeof rlBotTick === 'function') { if (RL.mode === 'bot') rlBotTick(dt, 1); if (RL.both) rlBotTick(dt, 0); }
  for (const u of RL.U) { u.px = u.x; u.py = u.y; }
  RL.by = new Map(); for (const e of RL.T) RL.by.set(e.id, e); for (const u of RL.U) RL.by.set(u.id, u);
  rlZones(dt);
  rlChampTick(dt);
  for (const u of RL.U.slice()) rlUnit(u, dt);
  rlSeparate();
  rlTowersTick(dt);
  rlShots(dt);
  rlDeaths();
  for (const u of RL.U) u.mend = u.mendT > 0 ? 1 : 0;
  if (RL.ph === 'play' && RL.left <= 0 && RL.n3) rl3Time();
  else if (RL.ph === 'play' && RL.left <= 0) {
    if (!RL.ot) { if (RL.crowns[0] !== RL.crowns[1]) rlEnd(RL.crowns[0] > RL.crowns[1] ? 0 : 1); else { RL.ot = true; RL.left = RLC.OT; rlFx('ot', { x: 9, y: 16, side: 0 }); } }
    else rlEnd(RL.crowns[0] !== RL.crowns[1] ? (RL.crowns[0] > RL.crowns[1] ? 0 : 1) : rlTieBreak());
  }
  rlFxTrim();
}
// (the small, frequent ones, a blow or a mouthful mended, go sooner)
const rlFxShort = f => f.k === 'hit' || f.k === 'spin' || (f.k === 'heal' && !f.r);
function rlFxTrim() { const c = RL.clk; RL.FX = RL.FX.filter(f => c - f.at < (rlFxShort(f) ? 0.7 : 2)); }

// the lasting spells: the haar slows the enemies inside it; the wave rolls on, striking and knocking back each once;
// Lamp Oil mends the caster's troops inside, Fair Wind hastens them; Brine Rain stings every half second, and the
// Whirlpool drags walkers in to its middle while it stings. Then the auras of the units themselves: a Wrecker Chief
// rallies the friends about him, a Tar Barrel mires the enemy walkers about it.
function rlZones(dt) {
  for (const u of RL.U) { u.fog = 0; u.hs = 0; u.ral = 0; u.tar = 0; if (u.mendT > 0) u.mendT -= dt; }
  const inZ = (z, u) => Math.hypot(u.x - z.x, u.y - z.y) <= z.r + u.size * 0.5;
  for (const z of RL.Z) {
    z.t += dt;
    if (z.k === 'haar') { for (const u of RL.U) if (u.side !== z.side && inZ(z, u)) u.fog = 1; }
    else if (z.k === 'mend') { for (const u of RL.U) if (u.side === z.side && !u.bld && u.hp > 0 && inZ(z, u)) { u.hp = Math.min(u.max, u.hp + z.hl * dt); u.mendT = 0.3; } }
    else if (z.k === 'haste') { for (const u of RL.U) if (u.side === z.side && !u.bld && u.hp > 0 && inZ(z, u)) u.hs = 1; }
    else if (z.k === 'dot' || z.k === 'whirl') {
      if (z.k === 'whirl') for (const u of rlEnemiesIn(z.side, z.x, z.y, z.r, false, false)) {
        if (u.bld) continue;
        const dx = z.x - u.x, dy = z.y - u.y, d = Math.hypot(dx, dy); if (d < 0.3) continue;
        const st = Math.min(d - 0.25, 3 * dt); rlDrag(u, u.x + dx / d * st, u.y + dy / d * st);
      }
      z.acc += dt; while (z.acc >= 0.5 && z.t <= z.dur + 1e-6) { z.acc -= 0.5; rlBlast(z.side, z.x, z.y, z.r, z.k === 'dot' ? z.dmg * 0.5 : z.dmg, z.tw, true); }
    }
    else if (z.k === 'wave' && z.ang != null) {
      // (for three: rolling along its own way, ax ay; across it, w wide; along it, r deep)
      const ax = Math.cos(z.ang), ay = Math.sin(z.ang), f = 6 * Math.min(z.t, z.dur); z.x = z.x0 + ax * f; z.y = z.y0 + ay * f;
      const inW = (e, rr, k) => { const dx = e.x - z.x, dy = e.y - z.y; return Math.abs(dx * -ay + dy * ax) <= z.w / 2 + rr && Math.abs(dx * ax + dy * ay) <= z.r + rr * k; };
      for (const u of RL.U) {
        if (u.side === z.side || u.air || u.hp <= 0 || z.hit.includes(u.id) || !inW(u, u.size * 0.5, 1)) continue;
        z.hit.push(u.id); rlHurt(u, z.dmg, z.side);
        if (!u.bld) { u.px = u.x; u.py = u.y; u.x += ax * z.kb; u.y += ay * z.kb; rlWater(u); u.px = u.x; u.py = u.y; u.stun = Math.max(u.stun, 0.3); u.lock = 0; }
        rlFx('splash', { x: u.x, y: u.y, side: z.side });
      }
      for (const t of RL.T) if (t.side !== z.side && t.hp > 0 && !z.hit.includes(t.id) && inW(t, t.r, 0.5)) { z.hit.push(t.id); rlHurt(t, z.dmg * z.tw, z.side); rlFx('splash', { x: t.x, y: t.y, side: z.side }); }
    }
    else if (z.k === 'wave') {
      z.y = z.y0 + z.dir * 6 * Math.min(z.t, z.dur);
      for (const u of RL.U) {
        if (u.side === z.side || u.air || u.hp <= 0 || z.hit.includes(u.id) || Math.abs(u.x - z.x) > z.w / 2 + u.size * 0.5 || Math.abs(u.y - z.y) > z.r + u.size * 0.5) continue;
        z.hit.push(u.id); rlHurt(u, z.dmg, z.side);
        if (!u.bld) { u.y += z.dir * z.kb; u.py = u.y; rlWater(u); u.stun = Math.max(u.stun, 0.3); u.lock = 0; }
        rlFx('splash', { x: u.x, y: u.y, side: z.side });
      }
      for (const t of RL.T) if (t.side !== z.side && t.hp > 0 && !z.hit.includes(t.id) && Math.abs(t.x - z.x) < z.w / 2 + t.r && Math.abs(t.y - z.y) < z.r + t.r * 0.5) { z.hit.push(t.id); rlHurt(t, z.dmg * z.tw, z.side); rlFx('splash', { x: t.x, y: t.y, side: z.side }); }
    }
  }
  RL.Z = RL.Z.filter(z => z.t < z.dur + (z.k === 'wave' ? 0.4 : 0));
  for (const a of RL.U) {
    if (a.hp <= 0 || a.dep > 0) continue;
    const ab = RL_CARD[a.c].ab;
    if (ab === 'rally') { for (const u of RL.U) if (u !== a && u.side === a.side && !u.bld && rlD(u, a) <= 4) u.ral = 1; }
    else if (ab === 'tar') { const r = RL_CARD[a.c].rng; for (const u of RL.U) if (u.side !== a.side && !u.bld && !u.air && rlD(u, a) <= r + u.size * 0.5) u.tar = 1; }
  }
}

// ---------- the units ----------
function rlCanHit(tg, side, e) {
  if (!e || e.side === side || e.hp <= 0) return false;
  if (e.k) return true;
  if (e.cloak > 0) return false;
  if (tg === 'ground' && e.air) return false;
  if (tg === 'build' && !e.bld) return false;
  return true;
}
// the next enemy tower down this unit's lane: its Lamp Tower, or the Great Light once that's down
function rlLaneTower(u) {
  if (RL.n3) return rl3LaneTower(u);
  const lane = rlLaneOf(u.x), L = RL.T.find(t => t.side !== u.side && t.k === 'lamp' && t.lane === lane && t.hp > 0);
  return L || RL.T.find(t => t.side !== u.side && t.k === 'great' && t.hp > 0) || RL.T.find(t => t.side !== u.side && t.hp > 0);
}
function rlPick(u, C) {
  const sight = u.bld ? C.rng + 0.3 : Math.max(RLC.SIGHT, C.rng + 1);
  // a Bell Buoy draws every walker within its reach
  if (!u.air && !u.bld && C.tg !== 'build') { let bb = null, bd = 1e9; for (const b of RL.U) if (b.side !== u.side && b.hp > 0 && b.c === 'bellbuoy') { const d = rlD(u, b); if (d <= RL_CARD.bellbuoy.rng && d < bd) { bd = d; bb = b; } } if (bb) return bb; }
  let best = null, bd = 1e9;
  const mr = C.minr || 0;   // (a Mortar Pit can't drop a shell on anything nearer than this)
  for (const e of RL.U) { if (!rlCanHit(C.tg, u.side, e)) continue; const d = rlD(u, e) - e.size; if (d <= sight && d < bd && !(mr && d < mr)) { bd = d; best = e; } }
  for (const t of RL.T) { if (!rlCanHit(C.tg, u.side, t)) continue; const d = rlD(u, t) - t.r; if (d <= sight && d < bd && !(mr && d < mr)) { bd = d; best = t; } }
  if (best || u.bld) return best;
  return rlLaneTower(u);
}
// where a walker heads for, to reach (tx, ty): over a causeway if the race lies between
function rlWay(u, tx, ty) {
  if (RL.n3) return rl3Way(u, tx, ty);
  if (u.air) return [tx, ty];
  const R0 = RLC.R0, R1 = RLC.R1, side0 = u.y <= R0 ? -1 : u.y >= R1 ? 1 : 0, side1 = ty <= (R0 + R1) / 2 ? -1 : 1;
  if (side0 === 0) { const cx = Math.abs(u.x - RLC.LX[0]) < Math.abs(u.x - RLC.LX[1]) ? RLC.LX[0] : RLC.LX[1]; return [cx + Math.max(-0.5, Math.min(0.5, tx - cx)) * 0.4, side1 < 0 ? R0 - 0.5 : R1 + 0.5]; }
  if (side0 === side1) return [tx, ty];
  const cx = RLC.LX.reduce((b, c) => Math.abs(u.x - c) + Math.abs(tx - c) < Math.abs(u.x - b) + Math.abs(tx - b) ? c : b, RLC.LX[0]);
  const ey = side0 < 0 ? R0 - 0.35 : R1 + 0.35;
  if (Math.abs(u.x - cx) < 0.65 && Math.abs(u.y - ey) < 0.9) return [cx, side0 < 0 ? R1 + 0.5 : R0 - 0.5];
  return [cx, ey];
}
// is the straight way from a to b all on dry rock (the banks, or along a causeway)? (a leap never crosses the race)
function rlDry(ax, ay, bx, by) {
  if (RL.n3) return rl3Dry(ax, ay, bx, by);
  for (let i = 0; i <= 8; i++) { const x = ax + (bx - ax) * i / 8, y = ay + (by - ay) * i / 8; if (y > RLC.R0 && y < RLC.R1 && !RLC.LX.some(c => Math.abs(x - c) <= RLC.CW)) return false; }
  return true;
}
// keep a walker out of the race: on a causeway, or back on the bank it came from
function rlWater(u) {
  if (RL.n3) { rl3Water(u); return; }
  if (u.air || !(u.y > RLC.R0 && u.y < RLC.R1)) return;
  const cx = Math.abs(u.x - RLC.LX[0]) < Math.abs(u.x - RLC.LX[1]) ? RLC.LX[0] : RLC.LX[1], hw = RLC.CW - Math.min(0.45, u.size * 0.6);
  if (Math.abs(u.x - cx) <= hw) return;
  if (Math.abs(u.px - cx) <= hw + 0.05 && u.py > RLC.R0 - 0.05 && u.py < RLC.R1 + 0.05) { u.x = cx + Math.sign(u.x - cx) * hw; return; }
  const dx = Math.abs(u.x - cx) - hw, dy = Math.min(u.y - RLC.R0, RLC.R1 - u.y);
  if (dx < dy && dx < 0.6) u.x = cx + Math.sign(u.x - cx) * hw; else u.y = u.py <= (RLC.R0 + RLC.R1) / 2 ? RLC.R0 : RLC.R1;
}
function rlUnit(u, dt) {
  if (u.hp <= 0) return;
  const C = RL_CARD[u.c];
  if (u.dep > 0) { u.dep -= dt; u.st = 'idle'; return; }
  if (u.c === 'verity') { u.slow = 0; u.stun = 0; u.fog = 0; u.tar = 0; }   // (nothing slows or stuns him)
  if (u.cloak > 0) u.cloak -= dt;
  if (u.slow > 0) u.slow -= dt;
  if (u.lpcd > 0) u.lpcd -= dt;
  if (u.bld) {
    u.hp -= u.max / (u.life || 30) * dt;
    if (C.ab === 'spawn') { u.ev -= dt; if (u.ev <= 0) { u.ev = C.ev || 5; const s = RL_CARD[C.sp] ? C.sp : 'wreckers', dir = u.side ? -1 : 1, fw = RL.n3 ? rl3Fwd(u.side) : null; for (let i = 0, n = C.sn || 1; i < n; i++) { const off = (RL.rng() - 0.5) * 0.8 + (n > 1 ? (i - (n - 1) / 2) * 0.6 : 0); const w = fw ? rlSpawn(u.side, s, u.x + fw[0] * (u.size + 0.4) - fw[1] * off, u.y + fw[1] * (u.size + 0.4) + fw[0] * off, 0) : rlSpawn(u.side, s, u.x + off, u.y + dir * (u.size + 0.4), 0); if (fw) rlWater(w); w.dep = 0.4; rlFx('spawn', { c: s, x: w.x, y: w.y, side: u.side }); } } }
    if (C.ab === 'lure') { u.ring -= dt; if (u.ring <= 0) { u.ring = C.hit || 4; for (const e of RL.U) if (e.side !== u.side && !e.air && !e.bld && e.hp > 0 && rlD(u, e) <= C.rng) e.slow = Math.max(e.slow, 1); rlFx('ring', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.rng }); } }
    if (C.ab === 'oil') { u.ev -= dt; if (u.ev <= 0) { u.ev = C.ev || 8; RL.oil[u.side] = Math.min(RLC.MAXOIL, RL.oil[u.side] + 1); rlFx('oil', { c: u.c, x: u.x, y: u.y, side: u.side }); } }
    if (C.ab === 'blast') {
      // the Fog Horn: when its breath is back and a walker is near, it bellows: damage, and everyone on foot knocked away
      u.ring -= dt; u.st = 'idle';
      if (u.ring <= 0) {
        const hit = RL.U.filter(e => e.side !== u.side && e.hp > 0 && !e.air && !e.bld && e.dep <= 0 && !(e.cloak > 0) && rlD(u, e) <= C.rng + e.size * 0.5);
        if (hit.length) {
          u.ring = C.hit || 3; u.st = 'hit';
          for (const e of hit) { rlHurt(e, C.dmg, u.side); const d = rlD(u, e) || 1e-3; rlDrag(e, e.x + (e.x - u.x) / d * (C.kb || 1), e.y + (e.y - u.y) / d * (C.kb || 1)); e.stun = Math.max(e.stun, 0.2); }
          rlFx('blast', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.rng });
        }
      }
      return;
    }
    if (!C.dmg) { u.st = 'idle'; return; }
  }
  if (u.stun > 0) { u.stun -= dt; u.st = 'idle'; return; }
  // how fast it moves (k, and half again in tar) and strikes (k, and 30% faster rallied)
  const k = (u.slow > 0 ? 0.65 : 1) * (u.fog ? 0.55 : 1) * (u.hs ? 1.4 : 1);
  if (u.cd > 0) u.cd -= dt * k * (u.ral ? 1.3 : 1) * (u.abT > 0 && C.champ && C.champ.fast ? C.champ.fast : 1);
  if (C.ab === 'heal') { rlHealer(u, C, dt, k); return; }
  // the target: kept while it's being struck and still in reach; else looked for again now and then
  let T = u.tg ? RL.by.get(u.tg) : null;
  const inReach = e => e && rlD(u, e) - rlR(e) - u.size * 0.6 <= C.rng && !(C.minr && rlD(u, e) - rlR(e) < C.minr);
  if (T && !(T.k ? T.hp > 0 && T.side !== u.side : rlCanHit(C.tg, u.side, T))) T = null;
  if (T && C.minr && rlD(u, T) - rlR(T) < C.minr) T = null;
  u.rt -= dt;
  if (!T || (u.rt <= 0 && !(u.st === 'hit' && inReach(T)))) { const was = T; T = rlPick(u, C); u.rt = 0.35 + RL.rng() * 0.15; if (T !== was) { u.lock = 0; u.rpT = 0; } }
  u.tg = T ? T.id : 0;
  if (!T) { u.st = 'idle'; u.rpT = 0; u.rp = 0; return; }
  // the Ship's Cat pounces on anything near enough on its own bank, and bites as it lands
  if (C.ab === 'leap' && u.lpcd <= 0 && !inReach(T)) {
    const d = rlD(u, T), gap = d - rlR(T) - u.size * 0.6;
    if (gap <= (C.lp || 3) && d > 1e-3 && rlDry(u.x, u.y, T.x, T.y)) {
      const back = rlR(T) + u.size * 0.6 + C.rng * 0.4, fx = u.x, fy = u.y;
      u.px = u.x; u.py = u.y; u.x = T.x - (T.x - u.x) / d * back; u.y = T.y - (T.y - u.y) / d * back; rlWater(u);
      rlFx('leap', { c: u.c, x: fx, y: fy, tx: u.x, ty: u.y, side: u.side });
      u.lpcd = 3; u.cd = 0; u.st = 'hit'; u.face = Math.atan2(T.x - u.x, T.y - u.y); rlStrike(u, T, C); u.cd = C.hit; return;
    }
  }
  if (inReach(T)) {
    if (u.st !== 'hit') { u.cd = Math.max(u.cd, C.hit * 0.35); u.run = 0; }
    u.st = 'hit'; u.face = Math.atan2(T.x - u.x, T.y - u.y);
    if (C.ab === 'ramp') { u.rpT += dt; u.rp = u.rpT >= 4 ? 2 : u.rpT >= 2 ? 1 : 0; }
    if (u.cd <= 0) { rlStrike(u, T, C); u.cd = C.hit; }
    return;
  }
  u.rpT = 0; u.rp = 0;
  if (u.bld) { u.st = 'idle'; return; }
  rlMove(u, C, T.x, T.y, k, dt);
}
// walking (or flying) on towards (tx, ty), by the causeway if need be
function rlMove(u, C, tx, ty, k, dt) {
  const [wx, wy] = rlWay(u, tx, ty), dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy) || 1e-6;
  if (C.ab === 'charge' && !u.chg && u.run >= 2) { u.chg = 1; rlFx('flash', { c: u.c, x: u.x, y: u.y, side: u.side, r: 0 }); }
  const sp = C.spd * k * (u.chg ? 2 : 1) * (u.tar ? 0.5 : 1), step = Math.min(d, sp * dt);
  u.x += dx / d * step; u.y += dy / d * step; u.run += step; u.st = 'walk';
  const fa = Math.atan2(dx, dy); let da = fa - u.face; da = Math.atan2(Math.sin(da), Math.cos(da)); u.face += da * Math.min(1, dt * 10);
}
// the Ship's Surgeon never strikes: once a second it mends every friend within its reach, and it keeps close behind
// the friend nearest it (the one furthest forward if there's a choice), or failing any, walks its lane to stand
// a little short of the enemy tower
function rlHealer(u, C, dt, k) {
  u.hlT -= dt;
  if (u.hlT <= 0) {
    u.hlT = 1; let n = 0;
    for (const f of RL.U) if (f !== u && f.side === u.side && !f.bld && f.hp > 0 && f.dep <= 0 && rlD(u, f) <= C.rng + f.size * 0.5) { if (f.hp < f.max) n++; f.hp = Math.min(f.max, f.hp + (C.hl || 0)); f.mendT = 1.1; }
    if (n) rlFx('heal', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.rng });
  }
  const fwd = RL.n3 ? (e => -Math.hypot(e.x - RL3C.CX, e.y - RL3C.CY) * (rl3Bank(e.x, e.y) === u.side ? 1 : -1)) : (e => u.side ? -e.y : e.y);
  let F = null, bs = -1e9;
  for (const f of RL.U) { if (f === u || f.side !== u.side || f.bld || f.hp <= 0 || RL_CARD[f.c].ab === 'heal') continue; const d = rlD(u, f); if (d > 8) continue; const s = fwd(f) * 0.5 - d; if (s > bs) { bs = s; F = f; } }
  u.tg = F ? F.id : 0;
  if (F) { if (rlD(u, F) <= Math.max(1, C.rng * 0.5)) { u.st = 'idle'; return; } rlMove(u, C, F.x, F.y, k, dt); return; }
  const T = rlLaneTower(u); if (!T) { u.st = 'idle'; return; }
  if (rlD(u, T) <= RL_TW[T.k].rng + 1) { u.st = 'idle'; return; }
  rlMove(u, C, T.x, T.y, k, dt);
}
function rlStrike(u, T, C) {
  const big = u.abT > 0 && u.c === 'verity', dmg = C.dmg * (u.chg ? 2 : 1) * (big ? C.champ.mul : 1); u.chg = 0; u.run = 0;
  if (C.ab === 'bomb') { rlBlast(u.side, u.x, u.y, C.sp || 1.2, C.dmg, 1, false); u.hp = 0; u.boom = 1; rlFx('boom', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.sp || 1.2 }); return; }
  if (C.ab === 'burst') { const bx = T.k ? u.x : T.x, by = T.k ? u.y : T.y; rlBlast(u.side, bx, by, C.sp || 1.5, C.dmg, 1, true); u.hp = 0; u.boom = 1; rlFx('burst', { c: u.c, x: bx, y: by, side: u.side, r: C.sp || 1.5 }); return; }
  if (C.ab === 'ramp') { rlHurt(T, dmg * [1, 3, 8][u.rp || 0], u.side); return; }
  if (C.rng >= 1.2) {
    const k = RL_SHOT[u.c] || 'shot', h = u.air ? 2.2 : u.bld ? 1.2 : 0, d = rlD(u, T), arc = RL_ARC[k];
    RL.P.push({ id: RL.nid++, k, side: u.side, sx: u.x + Math.sin(u.face) * u.size * 0.6, sy: u.y + Math.cos(u.face) * u.size * 0.6, x: u.x, y: u.y, tx: T.x, ty: T.y, t: 0,
      dur: Math.max(0.12, d / (RL_PSPD[k] || 12)) + (arc ? 0.25 : 0), tg: arc ? 0 : T.id, dmg, sp: C.sp || 0, c: u.c, tw: 1, air: C.tg === 'any' ? 1 : 0, h, slow: C.ab === 'slowhit',
      from: C.ab === 'drain' ? u.id : 0, ch: C.ab === 'chain' ? C.ch || 2 : 0 });
    return;
  }
  if (C.ab === 'spin') {
    rlFx('spin', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.sp || 1.5 });
    const all = rlEnemiesIn(u.side, u.x, u.y, C.sp || 1.5, true, C.tg === 'any'); if (!all.includes(T)) all.push(T);
    for (const e of all) rlHurt(e, dmg, u.side);
  } else if (big) {
    // Verity, as he really is: each blow on everyone round him
    rlFx('spin', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.champ.sp });
    const all = rlEnemiesIn(u.side, u.x, u.y, C.champ.sp, true, false); if (!all.includes(T)) all.push(T);
    for (const e of all) rlHurt(e, dmg, u.side);
  } else {
    rlHurt(T, dmg, u.side);
    if (C.sp) rlBlast(u.side, T.x, T.y, C.sp, dmg * 0.6, 1, C.tg === 'any');
  }
  if (C.ab === 'drain' && u.hp > 0) { u.hp = Math.min(u.max, u.hp + dmg * 0.5); rlFx('heal', { c: u.c, x: u.x, y: u.y, side: u.side, r: 0 }); }
  if (C.ab === 'slowhit' && !T.k) T.slow = Math.max(T.slow, 2);
  rlFx('hit', { c: u.c, x: T.x, y: T.y, side: u.side, r: dmg >= 200 ? 2 : dmg >= 110 ? 1 : 0 });
}
// everyone keeps a little apart: walkers push each other (the heavier give less), towers and buildings stand firm
function rlSeparate() {
  const U = RL.U, n = U.length;
  for (let i = 0; i < n; i++) {
    const a = U[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = U[j]; if (b.hp <= 0 || a.air !== b.air) continue;
      const dx = b.x - a.x, dy = b.y - a.y, m = (a.size + b.size) * 0.82; if (Math.abs(dx) > m || Math.abs(dy) > m) continue;
      const d = Math.hypot(dx, dy); if (d >= m) continue;
      const ux = d > 1e-4 ? dx / d : Math.cos(i * 7.1 + j), uy = d > 1e-4 ? dy / d : Math.sin(i * 7.1 + j), o = (m - d) * 0.5;
      const wa = a.bld ? 0 : b.bld ? 1 : (b.size * b.size) / (a.size * a.size + b.size * b.size), wb = b.bld ? 0 : a.bld ? 1 : 1 - wa;
      if (a.bld && b.bld) continue;
      a.x -= ux * o * 2 * wa; a.y -= uy * o * 2 * wa; b.x += ux * o * 2 * wb; b.y += uy * o * 2 * wb;
    }
  }
  for (const u of U) {
    if (u.hp <= 0 || u.bld) continue;
    if (!u.air) for (const t of RL.T) { if (t.hp <= 0) continue; const dx = u.x - t.x, dy = u.y - t.y, m = t.r + u.size * 0.5, d = Math.hypot(dx, dy); if (d < m && d > 1e-4) { u.x = t.x + dx / d * m; u.y = t.y + dy / d * m; } }
    if (!RL.n3) { u.x = Math.max(0.3, Math.min(RLC.W - 0.3, u.x)); u.y = Math.max(0.3, Math.min(RLC.H - 0.3, u.y)); }
    rlWater(u);
  }
}

// ---------- the towers ----------
function rlTowersTick(dt) {
  for (const t of RL.T) {
    if (t.hp <= 0) continue;
    if (t.k === 'great' && !t.awake) { if (t.hp < t.max || RL.T.some(o => o.side === t.side && o.k === 'lamp' && o.hp <= 0)) t.awake = true; else continue; }
    const S = RL_TW[t.k]; if (t.cd > 0) t.cd -= dt;
    let T = t.tg ? RL.by.get(t.tg) : null;
    const ok = e => e && !e.k && e.side !== t.side && e.hp > 0 && !(e.cloak > 0) && e.dep <= 0.3 && rlD(t, e) - e.size * 0.5 <= S.rng;
    if (!ok(T)) { T = null; let bd = 1e9; for (const u of RL.U) if (ok(u)) { const d = rlD(t, u); if (d < bd) { bd = d; T = u; } } }
    t.tg = T ? T.id : 0;
    if (T && t.cd <= 0) {
      t.cd = S.hit; t.shotAt = RL.clk;
      RL.P.push({ id: RL.nid++, k: 'bolt', side: t.side, sx: t.x, sy: t.y, x: t.x, y: t.y, tx: T.x, ty: T.y, t: 0, dur: Math.max(0.1, rlD(t, T) / RL_PSPD.bolt), tg: T.id, dmg: S.dmg, sp: 0, c: '', tw: 1, air: 1, h: t.k === 'great' ? 4.6 : 3.2 });
    }
  }
}
// the projectiles fly (homing on their target while it lives) and strike
function rlShots(dt) {
  const keep = [];
  for (const p of RL.P) {
    p.t += dt; const T = p.tg ? RL.by.get(p.tg) : null;
    if (T && T.hp > 0) { p.tx = T.x; p.ty = T.y; }
    const f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f;
    if (f < 1) { keep.push(p); continue; }
    if (p.k === 'lob' || p.k === 'keg') { rlBlast(p.side, p.tx, p.ty, p.sp, p.dmg, p.tw, true); rlFx('boom', { c: p.c, x: p.tx, y: p.ty, side: p.side, r: p.sp }); continue; }
    if (p.sp) { rlBlast(p.side, p.tx, p.ty, p.sp, p.dmg, 1, !!p.air); rlFx('boom', { c: p.c, x: p.tx, y: p.ty, side: p.side, r: p.sp * 0.6 }); continue; }
    if (T && T.hp > 0) {
      rlHurt(T, p.dmg, p.side); if (p.slow && !T.k) T.slow = Math.max(T.slow, 2); rlFx('hit', { c: p.c || p.k, x: p.tx, y: p.ty, side: p.side, r: p.dmg >= 200 ? 2 : p.dmg >= 110 ? 1 : 0 });
      // a Siren's song mends her by half of what it dealt
      if (p.from) { const S = RL.by.get(p.from); if (S && S.hp > 0) { S.hp = Math.min(S.max, S.hp + p.dmg * 0.5); S.mendT = 0.4; rlFx('heal', { c: S.c, x: S.x, y: S.y, side: S.side, r: 0 }); } }
      // the Stormcaller's lightning leaps on to the nearest not yet struck, within 3 tiles of the last, at full damage
      if (p.ch) {
        const done = new Set([T.id]), pts = [[T.x, T.y]]; let last = T;
        for (let i = 0; i < p.ch; i++) {
          let nx = null, nd = 3;
          for (const e of RL.U.concat(RL.T)) { if (done.has(e.id) || !rlCanHit('any', p.side, e)) continue; const d = rlD(last, e) - rlR(e) * 0.5; if (d <= nd) { nd = d; nx = e; } }
          if (!nx) break;
          done.add(nx.id); pts.push([nx.x, nx.y]); rlHurt(nx, p.dmg, p.side); last = nx;
        }
        rlFx('chain', { c: p.c, pts, side: p.side, x: T.x, y: T.y });
      }
    }
  }
  RL.P = keep;
}
// what has fallen: the drowned rise once more; a fallen tower is a crown (the Great Light all three, and the end)
function rlDeaths() {
  const keep = [];
  for (const u of RL.U) {
    if (u.hp > 0) { keep.push(u); continue; }
    const C = RL_CARD[u.c];
    if (C.ab === 'revive' && !u.rv && !u.boom) { u.rv = 1; u.hp = u.max * 0.5; u.stun = 1.2; u.tg = 0; u.st = 'idle'; rlFx('revive', { c: u.c, x: u.x, y: u.y, side: u.side }); keep.push(u); continue; }
    if (!u.boom) rlFx('die', { c: u.c, x: u.x, y: u.y, side: u.side, r: u.air ? 1 : 0 });
    if (C.champ && RL.ch && RL.ch[u.side].u === u.id) { RL.queue[u.side].push(u.c); RL.ch[u.side] = rlChNew(); }
    // the Crab Mother's brood scatters from where she fell
    if (C.ab === 'deathspawn' && RL_CARD[C.sp] && !(RL.n3 && !RL.alive[u.side])) for (let i = 0, n = C.sn || 1; i < n; i++) {
      const a = i / n * Math.PI * 2, w = rlSpawn(u.side, C.sp, u.x + Math.sin(a) * 0.6, u.y + Math.cos(a) * 0.6, 0);
      w.px = u.x; w.py = u.y; rlWater(w); w.dep = 0.3; rlFx('spawn', { c: C.sp, x: w.x, y: w.y, side: u.side });
    }
  }
  RL.U = keep;
  for (const t of RL.T) {
    if (t.hp > 0 || t.down) continue;
    t.down = 1; t.hp = 0;
    if (RL.n3) { rl3Down(t); continue; }
    const o = 1 - t.side;
    rlFx('tower', { c: t.k, x: t.x, y: t.y, side: t.side, r: RL.T.indexOf(t) });
    if (t.k === 'great') RL.crowns[o] = 3; else { RL.crowns[o] = Math.min(3, RL.crowns[o] + 1); const g = RL.T.find(q => q.side === t.side && q.k === 'great'); if (g) g.awake = true; }
    rlFx('crown', { x: t.x, y: t.y, side: o, r: RL.crowns[o] });
  }
  if (RL.ph !== 'play') return;
  if (RL.n3) { rl3Check(); return; }
  if (RL.crowns[0] >= 3 || RL.crowns[1] >= 3) rlEnd(RL.crowns[0] >= 3 && RL.crowns[1] >= 3 ? 2 : RL.crowns[0] >= 3 ? 0 : 1);
  else if (RL.ot && RL.crowns[0] !== RL.crowns[1]) rlEnd(RL.crowns[0] > RL.crowns[1] ? 0 : 1);
}

// ---------- the end ----------
// win: 0 or 1 (the side that won), 2 a draw. o.norec: shown but not recorded (an online match whose host went)
// still level when overtime runs out: whoever's weakest standing tower has the least health left loses (a draw only
// if they're within a whisker of each other)
function rlTieBreak() { const low = sd => Math.min(...RL.T.filter(t => t.side === sd && t.hp > 0).map(t => t.hp / t.max), 1); const a = low(0), b = low(1); return Math.abs(a - b) < 0.005 ? 2 : a > b ? 0 : 1; }
function rlEnd(win, o) {
  if (!RL.on || RL.ph === 'over') return;
  RL.ph = 'over'; RL.win = win; RL.endAt = RL.clk;
  if (RL.n3) { rl3End(win); return; }
  if (!rlIsGuest()) rlFx('end', { x: 9, y: 16, side: win === 2 ? 0 : win, r: win });
  const me = RL.me, rec = { win: win === me, draw: win === 2, crowns: RL.crowns[me], lost: RL.crowns[1 - me], bot: RL.mode === 'bot', lvl: RL.bot.lvl };
  if (!RL.recorded && !(o && o.norec) && !(RL.net && RL.net.gone) && !rlIsSpec() && typeof rlRecord === 'function') { RL.recorded = true; try { rlRecord(rec); } catch (e) { console.error(e); } }
  rlSnd(win === 2 ? 'draw' : win === me || rlIsSpec() ? 'win' : 'lose');
  if (typeof rlHudEnd === 'function') setTimeout(() => { if (RL.on && RL.ph === 'over') rlHudEnd(); }, 1600);
}
function rlQuit() {
  if (!RL.on) return;
  if (RL.mode === 'net' && typeof rlnStop === 'function') { try { rlnStop(); } catch (e) {} }
  RL.on = false; RL.ph = 'off';
  rlExit();
}

// ---------- the snapshot (host to guest) ----------
const rlQ = v => Math.round(v * 10);
const RL_CI = {}, RL_CALL = RL_CARDS.concat(RL_CHAMPS); RL_CALL.forEach((c, i) => { RL_CI[c.id] = i; });
const rlCi = c => c in RL_CI ? RL_CI[c] : -1;
const rlCo = i => i >= 0 && RL_CALL[i] ? RL_CALL[i].id : '';
function rlSnap() {
  const fl = u => (u.air ? 1 : 0) | (u.bld ? 2 : 0) | (u.cloak > 0 ? 4 : 0) | (u.slow > 0 ? 8 : 0) | (u.stun > 0 ? 16 : 0) | (u.fog ? 32 : 0) | (u.chg ? 64 : 0) | (u.dep > 0 ? 128 : 0) | (u.rv ? 256 : 0) | (u.hs ? 512 : 0) | (u.ral ? 1024 : 0) | (u.tar ? 2048 : 0) | (u.mend ? 4096 : 0) | (u.abT > 0 ? 8192 : 0);
  // (a unit's shell left and a lens's ramp go on the end, only when there's something to say)
  const ux = u => u.sh > 0 || u.rp ? [Math.round(u.sh || 0), u.rp | 0] : [];
  // (the extra points of a leap or a chain, in tenths)
  const fx = f => f.k === 'leap' ? [[rlQ(f.tx), rlQ(f.ty)]] : f.k === 'chain' ? [f.pts.map(q => [rlQ(q[0]), rlQ(q[1])])] : [];
  return {
    ...(RL.n3 ? { n3: 1, al: RL.alive, ou: RL.outs } : {}),
    v: 1, ph: RL.ph, k: rlQ(RL.clk), t: rlQ(RL.t), l: rlQ(RL.left), f: (RL.ot ? 1 : 0) | (RL.dbl ? 2 : 0), cn: rlQ(RL.cnt), o: RL.oil.map(rlQ), h: RL.hand, n: RL.next,
    ch: RL.ch.map(h => [rlCi(h.c), h.u | 0, rlQ(h.cd)]), cr: RL.crowns, w: RL.win, nm: RL.names, sk: RL.skins, lv: RL.bot.lvl,
    T: RL.T.map(t => [Math.round(Math.max(0, t.hp)), (t.awake ? 1 : 0) | (t.down ? 2 : 0), t.tg | 0, t.shotAt != null ? rlQ(RL.clk - t.shotAt) : 99]),
    U: RL.U.map(u => [u.id, rlCi(u.c), u.side, rlQ(u.x), rlQ(u.y), Math.round(u.hp), fl(u), Math.round(u.face * 20), RL_ST.indexOf(u.st), u.tg | 0, Math.round(u.max), ...ux(u)]),
    P: RL.P.map(p => [p.id, RL_PK.indexOf(p.k), p.side, rlQ(p.sx), rlQ(p.sy), rlQ(p.tx), rlQ(p.ty), Math.round(p.t * 100), Math.round(p.dur * 100), rlCi(p.c), rlQ(p.h || 0), p.tg | 0]),
    Z: RL.Z.map(z => [z.id, Math.max(0, RL_ZK.indexOf(z.k)), z.side, rlQ(z.x), rlQ(z.y), Math.round(z.t * 100), Math.round(z.dur * 100), rlQ(z.r), rlQ(z.w || 0), z.dir || 0, ...(z.ang != null ? [Math.round(z.ang * 100)] : [])]),
    FX: RL.FX.filter(f => !rlFxShort(f) || RL.clk - f.at < 0.4).slice(-28).map(f => [f.id, RL_FK.indexOf(f.k), f.c in RL_CI ? RL_CI[f.c] : (f.c ? String(f.c) : -1), rlQ(f.x || 0), rlQ(f.y || 0), f.side | 0, rlQ(f.at), f.r == null ? 0 : Math.round(f.r * 10), ...fx(f)]),
  };
}
// on the guest: the snapshot becomes the state; every unit starts its glide from where it's drawn now
function rlApply(s) {
  if (!RL.on || !s || s.v !== 1) return;
  const now = performance.now(), a = rlAlpha();
  if (RL.lastSnap) RL.snapDur = Math.max(40, Math.min(300, RL.snapDur * 0.7 + (now - RL.lastSnap) * 0.3));
  RL.lastSnap = now;
  // (the match is for three, or isn't: the towers and the arrays as the host has them)
  if (!!s.n3 !== !!RL.n3) { RL.n3 = !!s.n3; const SS = RL.n3 ? [0, 1, 2] : [0, 1]; RL.T = RL.n3 ? rl3Towers() : RL.T; RL.alive = SS.map(() => 1); RL.outs = []; RL.ch = SS.map(() => rlChNew()); RL.me = Math.min(RL.me, SS.length - 1); if (typeof rl3dReset === 'function') rl3dReset(); if (typeof rlHudReset === 'function') rlHudReset(); }
  if (RL.n3) { if (Array.isArray(s.al)) RL.alive = s.al.slice(0, 3); if (Array.isArray(s.ou)) RL.outs = s.ou.slice(0, 3); }
  const wasPh = RL.ph, d = v => v / 10;
  RL.ph = s.ph; RL.clk = d(s.k); RL.t = d(s.t); RL.left = d(s.l); RL.ot = !!(s.f & 1); RL.dbl = !!(s.f & 2); RL.cnt = d(s.cn); RL.oil = s.o.map(d);
  if (Array.isArray(s.ch)) RL.ch = s.ch.map(e => ({ c: rlCo(e[0]), u: e[1], cd: d(e[2]) }));
  RL.hand = s.h; RL.next = s.n; if (s.q) RL.queue = s.q; RL.crowns = s.cr; RL.names = s.nm || RL.names; RL.skins = s.sk || RL.skins; if (s.lv) RL.bot.lvl = s.lv;
  s.T.forEach((e, i) => { const t = RL.T[i]; if (!t) return; if (e[0] < t.hp) t.hitAt = RL.clk; t.hp = e[0]; t.awake = !!(e[1] & 1); t.down = e[1] & 2 ? 1 : 0; t.tg = e[2]; t.shotAt = e[3] < 99 ? RL.clk - d(e[3]) : null; });
  const old = new Map(RL.U.map(u => [u.id, u]));
  RL.U = s.U.map(e => {
    const o = old.get(e[0]), u = o || { id: e[0] }, x = d(e[3]), y = d(e[4]);
    u.px = o ? o.px + (o.x - o.px) * a : x; u.py = o ? o.py + (o.y - o.py) * a : y;
    u.c = rlCo(e[1]); u.side = e[2]; u.x = x; u.y = y; u.hp = e[5]; const f = e[6];
    u.air = !!(f & 1); u.bld = !!(f & 2); u.cloak = f & 4 ? 1 : 0; u.slow = f & 8 ? 1 : 0; u.stun = f & 16 ? 1 : 0; u.fog = f & 32 ? 1 : 0; u.chg = f & 64 ? 1 : 0; u.dep = f & 128 ? 1 : 0; u.rv = f & 256 ? 1 : 0;
    u.hs = f & 512 ? 1 : 0; u.ral = f & 1024 ? 1 : 0; u.tar = f & 2048 ? 1 : 0; u.mend = f & 4096 ? 1 : 0; u.mendT = u.mend; u.abT = f & 8192 ? 1 : 0; u.sh = e[11] || 0; u.rp = e[12] || 0;
    u.face = e[7] / 20; u.st = RL_ST[e[8]] || 'idle'; u.tg = e[9]; u.max = e[10]; u.size = (RL_CARD[u.c] || {}).size || 0.4;
    return u;
  });
  RL.P = s.P.map(e => ({ id: e[0], k: RL_PK[e[1]] || 'shot', side: e[2], sx: d(e[3]), sy: d(e[4]), tx: d(e[5]), ty: d(e[6]), t: e[7] / 100, dur: e[8] / 100, c: rlCo(e[9]), h: d(e[10]), tg: e[11] }));
  RL.P.forEach(p => { const f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; });
  RL.Z = s.Z.map(e => ({ id: e[0], k: RL_ZK[e[1]] || 'haar', side: e[2], x: d(e[3]), y: d(e[4]), t: e[5] / 100, dur: e[6] / 100, r: d(e[7]), w: d(e[8]), dir: e[9], ang: e[10] != null ? e[10] / 100 : undefined }));
  RL.FX = s.FX.map(e => {
    const f = { id: e[0], k: RL_FK[e[1]], c: typeof e[2] === 'string' ? e[2] : rlCo(e[2]), x: d(e[3]), y: d(e[4]), side: e[5], at: d(e[6]), r: e[7] / 10 };
    if (e[8]) { if (f.k === 'leap') { f.tx = d(e[8][0]); f.ty = d(e[8][1]); } else if (f.k === 'chain') f.pts = e[8].map(q => [d(q[0]), d(q[1])]); }
    return f;
  });
  if (RL.pend && (now - RL.pend.at > 1500 || RL.oil[RL.me] < RL.pend.oil - 0.5)) RL.pend = null;
  if (wasPh !== 'over' && s.ph === 'over') { RL.ph = wasPh; rlEnd(s.w); }
  RL.win = s.w;
}
// how far between the last state and this one to draw: the host by the tick, the guest by the snapshot's age
function rlAlpha() {
  if (rlIsGuest()) return RL.lastSnap ? Math.min(1, (performance.now() - RL.lastSnap) / RL.snapDur) : 1;
  return Math.min(1, RL.acc / RLC.DT);
}
// where to draw a unit just now
function rlPos(u) { const a = rlAlpha(), px = u.px == null ? u.x : u.px, py = u.py == null ? u.y : u.py; return [px + (u.x - px) * a, py + (u.y - py) * a]; }

// ---------- every frame ----------
function rlFrame(dt) {
  if (!RL.on) { if (RL.ph === 'draft' && typeof rl3dDraw === 'function') { RL.clk += dt; rl3dDraw(dt); } return; }   // (the triple draft, over the empty arena: src/rldraft.js)
  const paused = !$('rlPause').hidden && RL.mode === 'bot';
  if (RL.mode === 'net' && typeof rlnTick === 'function') { try { rlnTick(dt); } catch (e) { console.error(e); } }
  if (!paused) {
    if (!rlIsGuest()) { RL.acc += dt * (RL.speed || 1); let n = 0; while (RL.acc >= RLC.DT && n++ < 40) { RL.acc -= RLC.DT; rlTick(); } if (n >= 40) RL.acc = 0; }
    else {
      // the guest: what moves on its own between snapshots (the shots, the oil, the clock), so nothing stutters
      for (const p of RL.P) { p.t += dt; const f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; }
      for (const z of RL.Z) z.t += dt;
      if (RL.ch) for (const h of RL.ch) if (h.cd > 0) h.cd = Math.max(0, h.cd - dt);
      if (RL.ph === 'play') { RL.left = Math.max(0, RL.left - dt); for (let s = 0; s < RL.oil.length; s++) if (!RL.n3 || RL.alive[s]) RL.oil[s] = Math.min(RLC.MAXOIL, RL.oil[s] + dt / RLC.OILT * (RL.dbl ? 2 : 1)); }
      RL.clk += dt;
    }
  }
  rlFxSound();
  if (typeof rl3dDraw === 'function') rl3dDraw(dt);
  if (typeof rlHud === 'function') rlHud(dt);
}

// ---------- the screen ----------
function rlEnter() {
  try { audioInit(); } catch (e) {}
  if (typeof rl3dInit === 'function' && !rl3dInit()) { if (typeof toast === 'function') toast('Skerry Clash needs WebGL, which this browser has turned off.', 'No 3D'); }
  state = 'rival'; paused = false;
  for (const id of ['titleCard', 'hud', 'logbox', 'biomeBanner']) { const e = $(id); if (e) e.hidden = true; }
  $('rlUI').hidden = false; $('rlPause').hidden = true; $('rlEnd').hidden = true;
  document.body.classList.add('rlon');
  RL.sndSeen = RL.nid; RL.sndP = 0;
  try { if (typeof loadVerityVoice === 'function') loadVerityVoice(); } catch (e) {}   // (Verity's voice, ready for when he's set down)
  if (typeof rl3dReset === 'function') rl3dReset();
  if (typeof rlHudReset === 'function') rlHudReset();
  rlSnd('start');
}
function rlExit() {
  RL.on = false; if (RL.ph !== 'off') RL.ph = 'off';
  $('rlUI').hidden = true; document.body.classList.remove('rlon');
  if (typeof rl3dReset === 'function') rl3dReset(true);
  state = 'title'; toTitle();
  if (typeof rlnBackToLobby === 'function') { try { rlnBackToLobby(); } catch (e) {} }
  setTimeout(() => { const c = $('rlTitle'); if (c) c.scrollIntoView({ block: 'start' }); if (typeof rlCardRender === 'function') rlCardRender(); }, 60);
}
// a watcher turns the board round, to watch from the other keeper's end (blue is always the near side)
function rlSpecFlip() {
  if (!RL.on || !rlIsSpec()) return;
  RL.me = (RL.me + 1) % RL.oil.length;
  if (typeof rl3dReset === 'function') rl3dReset();
  if (typeof rlHudReset === 'function') rlHudReset();
}
function rlPauseOpen(on) {
  if (!RL.on) return;
  $('rlPause').hidden = !on;
  if (on) { const s = $('rlPauseSub'); if (s) s.textContent = RL.mode === 'bot' ? 'The match waits while this is open.' : rlIsSpec() ? 'You’re watching: the duel goes on without you.' : 'Online, the match goes on while this is open.'; const lv = $('rlLeave'); if (lv) lv.textContent = rlIsSpec() ? 'Stop watching' : 'Leave the match'; setTimeout(() => $('rlResume').focus({ preventScroll: true }), 30); }
}

// ---------- the sound (from what's in src/audio.js and the recordings in src/sfxbank.js) ----------
function rlSnd(k, o) {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  o = o || {}; const v = o.vol == null ? 1 : o.vol, P = (n, opt) => typeof sfxPlay === 'function' && sfxPlay(n, opt);
  try {
    if (k === 'start') { if (!P('roundstart', { vol: 0.5 })) sfxChime(); }
    else if (k === 'go') { sfxBellFar(0, 0.7); }
    else if (k === 'tick') sfxTick();
    else if (k === 'deploy') { if (!P('swish', { vol: 0.35 * v, gap: 0.05 })) noise('bandpass', 900, 1, 0.01, 0.12 * v, 0.2); tone(340, 'triangle', 0.005, 0.06 * v, 0.12, { to: 520 }); }
    else if (k === 'build') { if (!P('slam', { vol: 0.4 * v })) noise('lowpass', 400, 1, 0.005, 0.25, 0.3); }
    else if (k === 'spell') { if (!P('swish', { vol: 0.5 })) sfxWhoosh(); }
    else if (k === 'flare') sfxFlare();
    else if (k === 'launch') { if (!P('cannon', { vol: 0.45 })) sfxCannon(); }
    else if (k === 'boom') { if (!P('explode', { vol: 0.55 * v, gap: 0.06 })) noise('lowpass', 500, 0.8, 0.005, 0.4 * v, 0.6); }
    else if (k === 'wave') { sfxSplash(0, 1); noise('lowpass', 700, 0.6, 0.3, 0.25, 1.4, { to: 200 }); }
    else if (k === 'haar') { sfxHorn(0, 0.6); }
    else if (k === 'bolt') { if (!P('stormbolt', { vol: 0.6, gap: 0.1 })) if (!P('thunder', { vol: 0.5 })) noise('highpass', 1800, 0.7, 0.002, 0.3, 0.4); }
    else if (k === 'hit') { if (!P('hit', { vol: 0.22 * v, gap: 0.07 })) noise('bandpass', 1600, 2, 0.001, 0.07 * v, 0.06); }
    else if (k === 'die') { if (!P('splat', { vol: 0.25, gap: 0.08 })) noise('lowpass', 900, 1, 0.003, 0.12, 0.15); }
    else if (k === 'splash') sfxSplash(0, 0.4 * v);
    else if (k === 'tower') { P('debris', { vol: 0.8 }) || noise('lowpass', 300, 0.7, 0.01, 0.5, 1.4); P('explode', { vol: 0.6, delay: 0.1 }); }
    else if (k === 'crown') { [0, 0.1, 0.2].forEach((d, i) => tone(660 + i * 220, 'triangle', 0.005, 0.12, 0.5, { delay: 0.4 + d })); }
    else if (k === 'crownlost') { [0, 0.14].forEach((d, i) => tone(330 - i * 80, 'triangle', 0.01, 0.12, 0.6, { delay: 0.4 + d })); }
    else if (k === 'dbl' || k === 'ot') { sfxHorn(0, 0.8); }
    else if (k === 'ring') sfxBellFar(0, 0.45 * v);
    else if (k === 'horn') sfxHorn(0, 0.5);
    else if (k === 'verity') { try { loadVerityVoice(); } catch (e) {} if (typeof sfxVerity === 'function') sfxVerity(1, 0.9); }   // (set down, he says he wants to help)
    else if (k === 'champ') {   // a champion's ability: Maren's moan and a swell, Plimsoll's splash, Verity's own voice dropping low
      if (o.c === 'maren') { if (!P('moan', { vol: 0.45 })) tone(160, 'sawtooth', 0.1, 0.06, 0.8, { to: 110 }); tone(392, 'sine', 0.2, 0.05, 1.2, { to: 523 }); }
      else if (o.c === 'plimsoll') { sfxSplash(0, 0.8); noise('lowpass', 600, 0.8, 0.005, 0.25, 0.3); }
      else if (o.c === 'verity') { if (typeof sfxVerity === 'function') sfxVerity(0.62, 0.9); else tone(110, 'sawtooth', 0.05, 0.08, 1.0, { to: 70 }); }
    }
    else if (k === 'heal') tone(520, 'sine', 0.02, 0.05, 0.35, { to: 780 });
    else if (k === 'oil') tone(880, 'triangle', 0.005, 0.06, 0.18, { to: 1100 });
    else if (k === 'revive') { if (!P('moan', { vol: 0.35, gap: 0.4 })) tone(180, 'sawtooth', 0.1, 0.05, 0.6, { to: 120 }); }
    else if (k === 'win') { if (!P('raidwin', { vol: 0.6 })) { if (!P('frwin', { vol: 0.6 })) sfxReveal(3); } }
    else if (k === 'lose') { if (!P('gameover', { vol: 0.55 })) tone(220, 'sine', 0.02, 0.2, 1.4, { to: 110 }); }
    else if (k === 'draw') { sfxChime(); }
    else if (k === 'shot') {
      const c = o.c, pk = o.p;
      if (pk === 'bolt') { if (!P('beam', { vol: 0.12, gap: 0.12 })) tone(1200, 'sine', 0.002, 0.04, 0.12, { to: 2200 }); }
      else if (c === 'harpooner') P('harpoon', { vol: 0.3, gap: 0.15 }) || noise('bandpass', 1200, 2, 0.002, 0.08, 0.1);
      else if (c === 'coastguard') P('longarm', { vol: 0.25, gap: 0.12 }) || noise('highpass', 1500, 1, 0.001, 0.12, 0.08);
      else if (c === 'lightkeeper') P('flaregun', { vol: 0.3, gap: 0.2 }) || noise('bandpass', 900, 1, 0.002, 0.1, 0.2);
      else if (c === 'battery') P('cannon', { vol: 0.25, gap: 0.2 }) || sfxCannon();
      else if (c === 'swivel') P('pepperbox', { vol: 0.2, gap: 0.15 }) || noise('highpass', 1800, 1, 0.001, 0.1, 0.06);
      else if (c === 'mortar' || c === 'martello') P('cannon', { vol: 0.25, gap: 0.2 }) || sfxCannon();
      else if (c === 'rocketcrew') P('flaregun', { vol: 0.3, gap: 0.2 }) || noise('bandpass', 700, 1, 0.002, 0.12, 0.3);
      else if (c === 'stormcaller') P('stormbolt', { vol: 0.3, gap: 0.3 }) || noise('highpass', 1800, 0.7, 0.002, 0.2, 0.3);
      else P('swish', { vol: 0.18, gap: 0.12 });
    }
    else if (k === 'card') { const s = { gulls: 'gull', diver: 'diver', mooncusser: 'mooncusser', keelback: 'keelback', crabking: 'bosscrab', kelp: 'moan', fogwraith: 'moan' }[o.c]; if (s) P(s, { vol: s === 'bosscrab' ? 0.15 : 0.3, gap: 0.5 }); }
  } catch (e) {}
}
// the events that make a sound, new since last time (the same on the host and the guest)
function rlFxSound() {
  if (RL.sndSeen == null) RL.sndSeen = 0;
  let hi = RL.sndSeen;
  const mine = s => s === RL.me;
  for (const f of RL.FX) {
    if (f.id <= RL.sndSeen) continue; hi = Math.max(hi, f.id);
    const C = RL_CARD[f.c];
    if (f.k === 'deploy') { rlSnd(C && C.type === 'building' ? 'build' : 'deploy', { vol: mine(f.side) ? 1 : 0.6 }); rlSnd('card', { c: f.c }); if (f.c === 'verity') rlSnd('verity'); }
    else if (f.k === 'spell') rlSnd(!C ? 'spell' : C.ab === 'lob' || C.ab === 'summon' ? 'launch' : C.ab === 'wave' || C.ab === 'pull' || C.ab === 'whirl' ? 'wave' : C.ab === 'haar' || C.ab === 'dot' ? 'haar' : C.ab === 'bolts' || C.ab === 'mend' || C.ab === 'haste' ? 'spell' : 'flare');
    else if (f.k === 'champ') rlSnd('champ', { c: f.c });
    else if (f.k === 'burst' || f.k === 'summon') rlSnd('boom', { vol: 0.6 });
    else if (f.k === 'chain') rlSnd('bolt');
    else if (f.k === 'blast') rlSnd('horn');
    else if (f.k === 'heal' && f.r) rlSnd('heal');
    else if (f.k === 'oil' && mine(f.side)) rlSnd('oil');
    else if (f.k === 'shield') rlSnd('hit', { vol: 1.4 });
    else if (f.k === 'leap' || f.k === 'spin') rlSnd('spell');
    else if (f.k === 'boom') rlSnd('boom', { vol: f.r > 1.5 ? 1 : 0.6 });
    else if (f.k === 'bolt') rlSnd('bolt');
    else if (f.k === 'hit') rlSnd('hit', { vol: 0.6 + f.r * 0.25 });
    else if (f.k === 'die') rlSnd('die');
    else if (f.k === 'splash') rlSnd('splash', { vol: 0.5 });
    else if (f.k === 'tower') rlSnd('tower');
    else if (f.k === 'crown') { if (!RL.n3 || f.side === RL.me || f.r - 1 === RL.me) rlSnd(f.side === RL.me ? 'crown' : 'crownlost'); }
    else if (f.k === 'dbl' || f.k === 'ot') rlSnd(f.k);
    else if (f.k === 'ring') rlSnd('ring', { vol: 0.6 });
    else if (f.k === 'revive') rlSnd('revive');
    else if (f.k === 'go') rlSnd('go');
  }
  RL.sndSeen = hi;
  // the shots, as each leaves
  let ph = RL.sndP || 0;
  for (const p of RL.P) if (p.id > (RL.sndP || 0)) { ph = Math.max(ph, p.id); if (p.k !== 'lob' && p.k !== 'keg') rlSnd('shot', { c: p.c, p: p.k }); }
  RL.sndP = ph;
}

// ---------- tests ----------
function rlDebugSpeed(x) { RL.speed = Math.max(0.1, Math.min(40, +x || 1)); return RL.speed; }
function rlDebugBots(on) { RL.both = !!on; return RL.both; }
