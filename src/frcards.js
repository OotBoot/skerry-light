// Fog Run: the salvage. After every island (frAfterIsland, src/frrun.js) each player is dealt three cards, their own,
// and keeps one: a gun, a relic (kept to the end of the run, shown as a little roundel beside your stamina), or a crew
// card that helps everyone aboard. 20 seconds to choose, then the left-hand card is taken for you.
//  - The cards (FRC_CARDS), in three rarities as the crates: Deckhand, Bosun and Captain. About forty of them in all:
//    a gun from the wreck (one of each wall gun, one of each wreck-chest gun), a chest gun already reforged once, the
//    Lampwright's Spark (reforge the gun in your hand one tier, src/zmpap.js), the Rum Tot, a relic for each of
//    FR_RELICS, and the crew cards. A hand never holds the same card twice, and never more than one crew card. An
//    elite island's hand always has a Captain's card in it, and the further out you are, the likelier the rare ones.
//  - Chart fragments (src/frkeep.js frFragTier: a mark at 10, 25, 50 and 100 in all) bring more cards into the pool for
//    good, each card's u: the mark it needs (none: there from the first). 10: the Brass Spyglass and the Powder Monkey;
//    25: the Bell Clapper and the Wrecker's Lamp; 50: the Slow Match and Salvaged and Forged; 100: Light the Way.
//  - The relics (FR_RELICS), each with its own hooks, called from wherever it matters:
//      see(): how much further you see through the fog ashore (src/frisle.js frIsleFog)
//      jump(m, cls): a jump in mid-air (src/rclass.js rclJump)   hurt(d, dmg, code): what one of your hits does
//      kill(d, code, by): one of the drowned sent back by you (hosting: src/zombies.js zmKill)
//      tick(dt): each frame, your own side   nip: crabs never nip you (src/zmswarm.js zwCanNip)
//      spy: the rocks at sea show 2 s longer, for everyone aboard (src/gwsail.js)
//    The four tonic relics keep their tonic (ZM.perks) for the whole run, whatever happens to you.
//  - The crew cards (FRC_CREW), the host's to keep (FR.crew), each for the voyage ahead: a spare plank (the next rock
//    only scrapes her: src/gwsail.js gwsStove), the flare locker reloading in half the time (gwsFlare), the Light
//    sweeping the next island (frcWay), Call Them Home (the next time anyone's lost in the fog, they're brought
//    straight back), a fair wind (the next leg half as long: src/frsail.js frsLeg; her speed is never touched, only
//    how far there is to go), and the haar lifting (the next island's fog as the reach before's).
// The second salvage (24 more, each working its own way):
//  - At sea: the Shipwright's Mallet (patch a hole in half the time), St Elmo's Medal (no knock lands on you at the
//    helm), and the crew's Caulking Iron (the holes let the sea in half as fast), Toll for the Drowned (every ring of the
//    bell mends everyone aboard two knocks) and Blue Lights (every flare from the locker sets the drowned aboard alight).
//    None of them touches her speed: the hold-to-use cards speed up your own Use clock (frcHoldK), the Caulking Iron
//    takes back half of what came in at the holes, on the host, after gwsTick's own sum.
//  - The Light: the Keeper's Mirror (each pass of the beam over you, at sea, at Lantern Rock or in Light the Way's
//    sweep, brings your grenade 6 s nearer), the Lamplighter's Taper (beacons and braziers lit in half the time) and,
//    at the 100 mark, The Light Keeps Watch (drop to your last knock and the beam sweeps once: frcSweep, the host's).
//  - Kills and heads: Gannet's Eye (a kill through the head puts a round back in your gun), Bladderwrack (kills through
//    the head burst in brine, slowing all near), the Tallow Wick (kills keep your ultimate going).
//  - Down and up: the Cork Lifebelt (once a stage the knock that would put you down leaves you on your last), and
//    together the Mourning Brooch (going down, fire bursts round you) and Smelling Salts (get someone up: your grenade).
//  - The callings: the Twin Fuse (your grenade splits in two, 25 marks), the Keeper's Log (each stage starts with your
//    ultimate a tenth fuller per island lit).
//  - Cursed (cur): Fog in the Eyes (half the sight ashore; kills fill the ultimate three times as fast), the Drowned
//    Man's Bargain (twice the hits, twice the knocks), the Mooncusser's Pact (a Captain's card in every hand, the grenade
//    half as quick; 50 marks).
//  - The salvage and the chart: the Beachcomber's Sack (four cards a hand), a Message in a Bottle (kept until the next
//    hand, which is all Captain's cards, then gone), the crew's Pilot's Chart (the next chart's whole column open,
//    10 marks) and the Tally of Lights (the drowned rise a twentieth weaker for each island lit; the host's).
//  More hooks for these, each marked [fogrun cards]: src/fps.js fpsHurt (frcHurtMe: the knocks on you), src/zombies.js
//  zmDown (frcCork), src/rclass.js rclGrenade (frcGren), src/frchart.js frChartOpts (frcPilot). The rest are read
//  from the stages' own state each frame (frcMe). For tests: frcDebugHand(['mirror', 'k_toll', ...]) is the next
//  hand you're dealt.
// Together (src/zmnet.js): the host deals every hand (from the run's seed, the stop and each player's place; with
// what each already holds, from their presence, frr) and sends the salvage in its word (frs: [its number, seconds
// left, the hands, who's picked]) and the crew's cards (frk). A joined player picks on their own side (a gun, a relic
// or the Rum Tot is theirs to apply) and tells the host (raidAsk 'frcpick'); a crew card is then the host's to play.
// Relics go into your rejoin record, so a dropped player gets them back.
// Hooks in shared files are marked [fogrun cards]: src/frrun.js (frAfterIsland, frBegin, frEnterStage, frMe, frPack,
// frApplyRun, frPresence, frHeard, frRjSnap, frRjAfter), src/frisle.js (the fog), src/frsail.js (the fair wind),
// src/raid.js (raidRequest, raidStaminaHud), src/rclass.js (rclJump), src/zombies.js (zmHurt, zmKill),
// src/zmswarm.js (zwCanNip), src/gwsail.js (gwsStove, gwsFlare, the rocks' fade).

const FRCC = { T: 20, GRACE: 2, RARE: ['Deckhand', 'Bosun', 'Captain'], RCOL: ['#c8b890', '#7ab8e8', '#ffc070'], WAY_T: 40, WAY_EVERY: 5, WAY_HALF: 9 * Math.PI / 180, RING: 0.25, LAMP_EVERY: 5, CLAP_R: 5,
  MIRROR: 6, WRACK_R: 4.5, BROOCH_R: 3.2, TOLL: 2, TALLY: 0.05, TALLY_MAX: 0.35, LOG: 0.1, SALTS: 1 / 3 };

// ---------- the relics ----------
// n: its name, c: its colour, r: its rarity, what: what it does, and its hooks (above). co: together only
const FR_RELICS = {
  oilcan: { n: 'Keeper’s Oilcan', c: '#e8c050', r: 0, what: 'Your lamp burns brighter: ashore, you see twice as far through the fog.', see: () => 2 },
  feather: { n: 'Gull Feather', c: '#e8eef4', r: 1, what: 'Jump again in mid-air (on top of the Mercenary’s own).', jump: m => { if (FRCS.air >= 1) return false; FRCS.air++; m.vz = FPSC.JUMP * 0.9; fpsPuff(m.x, m.y, FPSC.GROUND + (m.jz || 0), '236,240,244', 8); return true; } },
  ring: { n: 'Drowned Man’s Ring', c: '#9ac0a0', r: 0, what: 'Every kill mends you a little (a quarter of a knock).' },
  salt: { n: 'Salt in the Wound', c: '#f0e8d8', r: 1, what: 'Your hits on the burning drowned do half as much again.', hurt: (d, dmg) => frcBurning(d) ? dmg * 1.5 : dmg },
  clapper: { n: 'Bell Clapper', c: '#d8a860', r: 1, u: 2, what: 'Your blade kills ring a small bell that throws back everything near.', kill: (d, code, by) => frcClap(d, code, by) },
  tooth: { n: 'Plimsoll’s Tooth', c: '#c0d8e8', r: 0, what: 'Crabs shy off you: they never nip.', nip: true },
  wlamp: { n: 'Wrecker’s Lamp', c: '#ff9a50', r: 1, u: 2, what: 'Every fifth kill leaves a burning flare where it fell.', kill: (d, code, by) => frcFlareDrop(d, by) },
  spyglass: { n: 'Brass Spyglass', c: '#c8a050', r: 1, what: 'At sea, the rocks stay in sight 2 s longer, for everyone aboard.', spy: true, u: 1 },
  monkey: { n: 'Powder Monkey', c: '#c07050', r: 1, u: 1, what: 'Your grenade comes back in half the time.', tick: dt => { if (typeof RCL !== 'undefined' && RCL.gT > 0) RCL.gT = Math.max(0, RCL.gT - dt); } },
  match: { n: 'Slow Match', c: '#e07060', r: 2, what: 'Your ultimate fills half as fast again.', u: 3 },
  t_fleet: { n: 'Fleet Foot’s Cork', c: ZM_PERKS.fleet.c, r: 1, perk: 'fleet', what: 'Fleet Foot for the whole run: quicker on your feet.' },
  t_stout: { n: 'Stout Heart’s Cork', c: ZM_PERKS.stout.c, r: 1, perk: 'stout', what: 'Stout Heart for the whole run: take twice the knocks.' },
  t_quick: { n: 'Quick Hands’ Cork', c: ZM_PERKS.quick.c, r: 1, perk: 'quick', what: 'Quick Hands for the whole run: reload in half the time.' },
  t_grog: { n: 'Grog Ration’s Cork', c: ZM_PERKS.grog.c, r: 1, perk: 'grog', what: 'Grog Ration for the whole run: patched up, and get others up, in half the time.' },
  // (the second salvage) tick(dt, m) as above; meK(n): what a knock on you comes to; cur: cursed
  mallet: { n: 'Shipwright’s Mallet', c: '#b08858', r: 0, what: 'You patch a hole in her deck in half the time.', tick: dt => frcHoldK(dt, ['gwhole']) },
  elmo: { n: 'St Elmo’s Medal', c: '#a8d0ff', r: 0, what: 'While you hold the helm, no knock can land on you.', meK: n => FPS.helm ? 0 : n },
  geye: { n: 'Gannet’s Eye', c: '#e8e0c0', r: 0, what: 'Every kill through the head puts a round back in your gun.', tick: () => frcEye() },
  taper: { n: 'Lamplighter’s Taper', c: '#ffd890', r: 0, what: 'You light beacons and braziers in half the time.', tick: dt => frcHoldK(dt, ['frbeacon', 'frplight', 'fkbr']) },
  salts: { n: 'Smelling Salts', c: '#d0e8c8', r: 0, co: true, what: 'Get someone up and your grenade is back, with a third of your ultimate.', tick: () => frcSalts() },
  cork: { n: 'Cork Lifebelt', c: '#e0a070', r: 1, what: 'Once each stage, the knock that would put you down leaves you on your last.' },
  mirror: { n: 'Keeper’s Mirror', c: '#fff0c8', r: 1, what: 'Each time the Light’s beam passes over you, your grenade comes 6 s sooner.', tick: () => frcMirror() },
  wrack: { n: 'Bladderwrack', c: '#7a9a50', r: 1, what: 'Your kills through the head burst in brine, slowing everything near.', kill: (d, code, by, head) => frcWrack(d, head) },
  brooch: { n: 'Mourning Brooch', c: '#9a7aa8', r: 1, co: true, what: 'When you go down, a ring of fire bursts up round you.' },
  wick: { n: 'Tallow Wick', c: '#f0d8a0', r: 1, what: 'Kills keep your ultimate going: a second more each (Dead Reckoning: a round per two).', tick: () => frcWick() },
  log: { n: 'Keeper’s Log', c: '#c8b088', r: 1, u: 1, what: 'Every stage begins with your ultimate a tenth fuller for each island lit.' },
  fuse: { n: 'Twin Fuse', c: '#ff8a60', r: 2, u: 2, what: 'Your grenade splits in two as it leaves your hand.' },
  haze: { n: 'Fog in the Eyes', c: '#a0a8b0', r: 1, cur: true, what: 'Ashore you see half as far, but kills fill your ultimate three times as fast.', see: () => 0.5, tick: () => frcHaze() },
  bargain: { n: 'Drowned Man’s Bargain', c: '#5a8a7a', r: 2, cur: true, what: 'Your hits do twice as much, and every knock on you lands twice as hard.', hurt: (d, dmg) => dmg * 2, meK: n => n * 2 },
  pact: { n: 'Mooncusser’s Pact', c: '#c05050', r: 2, u: 3, cur: true, what: 'A Captain’s card in every hand you’re dealt, but your grenade comes back half as fast.', tick: dt => { if (typeof RCL !== 'undefined' && RCL.gT > 0) RCL.gT += dt * 0.5; } },
  sack: { n: 'Beachcomber’s Sack', c: '#b89868', r: 2, what: 'From now on you’re dealt four cards to choose from, not three.' },
  watch: { n: 'The Light Keeps Watch', c: '#fff4d0', r: 2, u: 4, what: 'Fall to your last knock and the Light’s beam sweeps round, burning the drowned (once a stage).', tick: () => frcWatch() },
  bottle: { n: 'Message in a Bottle', c: '#90c8b8', r: 1, what: 'Kept until the next salvage: every card in that hand is a Captain’s.' },
};
// the crew's cards: n, r, what; co: together only; ok(): can it be dealt now (the host's say)
const FRC_CREW = {
  planks: { n: 'Fresh Planks', r: 0, what: 'A spare plank stowed aboard: the next rock that would stove her in only scrapes. For everyone.' },
  lamp2: { n: 'A Second Lamp', r: 1, what: 'The flare locker reloads in half the time, for the rest of the run. For everyone.', ok: () => !(FR.crew && FR.crew.lamp2) },
  way: { n: 'Light the Way', r: 2, u: 4, what: 'On the next island the Light reaches through the fog: its beam sweeps the island every 5 s for 40 s, burning the drowned it crosses.' },
  call: { n: 'Call Them Home', r: 1, co: true, what: 'The next time anyone is lost in the fog, they’re brought straight back.' },
  fair: { n: 'Fair Wind', r: 0, what: 'The next sail is half as long. (Shorter, never slower.) For everyone.' },
  haar: { n: 'The Haar Lifts', r: 1, what: 'The fog pulls back a reach for the next island. For everyone.', ok: () => FR.reach > 1 || FR.stop + 1 > (FR_REACH[1].stops | 0) },
  // (the second salvage)
  caulk: { n: 'Caulking Iron', r: 0, what: 'For the rest of the run, the sea comes in at her holes half as fast. For everyone.', ok: () => !(FR.crew && FR.crew.caulk) },
  toll: { n: 'Toll for the Drowned', r: 1, what: 'For the rest of the run, every ring of the ship’s bell mends everyone aboard two knocks.', ok: () => !(FR.crew && FR.crew.toll) },
  blue: { n: 'Blue Lights', r: 1, u: 2, what: 'For the rest of the run, every flare from the locker sets the drowned aboard alight.', ok: () => !(FR.crew && FR.crew.blue) },
  pilot: { n: 'Pilot’s Chart', r: 1, u: 1, what: 'On the next chart every island of the next stop is open to you, not only the ways on.', ok: () => frcPilotOk() },
  tally: { n: 'Tally of Lights', r: 2, what: 'From now on the drowned rise weaker: a twentieth less for every island lit. For everyone.', ok: () => !(FR.crew && FR.crew.tally) },
};
// the guns from the wreck: the wall guns (Deckhand) and the chest's own (Bosun)
const FRC_WALL = ['pepperbox', 'blunderbuss', 'longarm', 'harpoon', 'avtomat', 'cutlass'];
const frcChestGuns = () => ZM_BOXW.map(e => e[0]).filter(id => FPSW[id] && !FRC_WALL.includes(id));

// every card: key -> { n, r (rarity), t ('gun', 'relic', 'crew', 'boon'), what, ok(c), get(): yours, applied on your side }
// (c, what the host knows of the player it deals to: { rel: their relics, co: together, life: their extra lives })
const FRC_CARDS = {};
for (const id of FRC_WALL) FRC_CARDS['w_' + id] = { n: FPSW[id].n, r: 0, t: 'gun', id, what: `A ${FPSW[id].n} from the wreck, in place of one you carry.`, get: () => frcGive(id, 0) };
for (const id of frcChestGuns()) FRC_CARDS['c_' + id] = { n: FPSW[id].n, r: 1, t: 'gun', id, what: `The wreck chest’s ${FPSW[id].n}, in place of one you carry.`, get: () => frcGive(id, 0) };
FRC_CARDS.forged = { n: 'Salvaged and Forged', r: 2, t: 'gun', u: 3, what: 'A gun from the wreck chest, already through the Lampwright’s fire once.', get: a => frcGive(a, 1), arg: R => { const L = frcChestGuns().filter(id => typeof ZM_PAP_W !== 'undefined' && ZM_PAP_W[id]); return L[(R() * L.length) | 0] || 'duckfoot'; } };
FRC_CARDS.spark = { n: 'Lampwright’s Spark', r: 2, t: 'gun', what: 'The gun in your hand goes through the Lampwright’s fire: reforged one tier.', get: () => frcSpark() };
FRC_CARDS.rum = { n: 'A Rum Tot', r: 0, t: 'boon', what: 'Your ultimate is ready now, and your grenade with it.', get: () => { if (typeof RCL !== 'undefined') { RCL.uK = 1; RCL.gT = 0; } } };
FRC_CARDS.ribbon = { n: 'Maren’s Ribbon', r: 1, t: 'boon', co: true, what: 'Your extra life comes back.', ok: c => c.life < FRC.LIVES, get: () => { FR.life = FRC.LIVES; fpsFeed('Maren’s Ribbon: your extra life is back.'); } };
for (const k in FR_RELICS) { const R = FR_RELICS[k]; FRC_CARDS[k] = { n: R.n, r: R.r, t: 'relic', rel: k, co: R.co, u: R.u, cur: R.cur, what: R.what, ok: c => !c.rel.includes(k), get: () => frcAddRelic(k) }; }
for (const k in FRC_CREW) { const C = FRC_CREW[k]; FRC_CARDS['k_' + k] = { n: C.n, r: C.r, t: 'crew', crew: k, co: C.co, u: C.u, what: C.what, ok: () => !C.ok || C.ok() }; }
const frcCard = s => { const [k, a] = String(s || '').split(':'); const C = FRC_CARDS[k]; return C ? { k, a: a || '', C } : null; };

// my own side of the salvage, and the relics' own counters
const FRCS = { id: 0, open: false, hand: null, picked: -1, t: 0, at: 0, pad: 0, padWas: null, air: 0, kills: 0, uK: 0, kc: {}, wayN: 0, wayT: -1, wayA: 0, say: [0, ''], heard: -1,
  // (the second salvage) heads, dk/dh: the kills and heads since the last frame; st: what this stage has seen (its
  // bell, its flares, the cork and the watch used); wasDn, beamWas, rv: the edges the relics watch for; swN: the host's
  // count of one-pass sweeps (swSeen: joined, the last heard); force: a hand for tests; bottleAt: the salvage the bottle came in
  heads: 0, dk: 0, dh: 0, st: { i: -1 }, wasDn: false, beamWas: false, rv: -1, wayOn: false, swN: 0, swSeen: -1, wickN: 0, force: null, bottleAt: 0 };

// ---------- the run's start, and each stage ----------
// (frBegin) nothing held yet
function frcBegin() { FR.rel = []; FR.crew = frcCrew0(); FR.sal = null; FR.salN = 0; frcClose(); Object.assign(FRCS, { id: 0, air: 0, kills: ZM.kills || 0, heads: ZM.heads || 0, kc: {}, wayN: 0, wayT: -1, say: [0, ''], heard: -1, st: { i: -1 }, wasDn: false, beamWas: false, rv: -1, swN: 0, swSeen: -1, wickN: 0, bottleAt: 0 }); }
const frcCrew0 = () => ({ planks: 0, lamp2: false, way: 0, call: 0, fair: 0, haar: 0, caulk: false, toll: false, blue: false, pilot: 0, tally: false });
// (frEnterStage) entering a stage: the Light the Way sweeps, if this is its island
function frcEnter(p) {
  if (p && p.key === 'frsail' && FR.crew && FR.crew.fair === p.n) fpsFeed('A fair wind: she sets out with the island half as far off.');
  if (p && p.key !== 'frsail' && FR.crew && FR.crew.way && FR.crew.way === p.n) { FRCS.wayT = 0; FRCS.wayN = 0; fpsFeed('The Light reaches through the fog to light your way.'); } else FRCS.wayT = -1;
  // the Keeper's Log: the ultimate a tenth fuller for each island lit
  if (frcHas('log') && (FR.lit | 0) > 0 && typeof RCL !== 'undefined' && !(RCL.ultT > 0)) { RCL.uK = Math.min(1, (RCL.uK || 0) + FRCC.LOG * (FR.lit | 0)); FRCS.uK = RCL.uK; } }

// ---------- dealing ----------
function frcDeal(sid, slot, c) {
  const p = frPlanNow() || {}, R = frRng(7000 + (FR.stop | 0) * 16 + slot), hand = [], elite = p.kind === 'elite' || (FR.rareAt != null && FR.rareAt === (FR.stop | 0)),   // [fogrun isles] (a rare card earned on the island: src/frisle.js friRare)
    far = (FR.reach - 1) * 0.06 + (FR.stop | 0) * 0.01;
  const tier = typeof frFragTier === 'function' ? frFragTier() : 4;
  const okFor = (k, C) => (C.u | 0) <= tier && (!C.co || c.co) && (!C.ok || C.ok(c)) && !hand.some(h => h.split(':')[0] === k) && !(C.t === 'crew' && hand.some(h => FRC_CARDS[h.split(':')[0]].t === 'crew'));
  // (tests: a hand laid out by hand, for me)
  if (FRCS.force && sid === FPS.me.id) { const f = FRCS.force.filter(k => frcCard(k)); FRCS.force = null; if (f.length) return f.slice(0, 4); }
  // (the Beachcomber's Sack: four cards; the Mooncusser's Pact: a Captain's card first; a Message in a Bottle: all Captain's)
  const rel = c.rel || [], n = rel.includes('sack') ? 4 : 3, cap = elite || rel.includes('pact'), all = rel.includes('bottle');
  for (let i = 0; i < n; i++) {
    const u = R(); let r = all || (cap && i === 0) ? 2 : u < 0.07 + far ? 2 : u < 0.4 + far ? 1 : 0;
    let L = [];
    for (; r >= 0 && !L.length; r--) L = Object.keys(FRC_CARDS).filter(k => FRC_CARDS[k].r === r && okFor(k, FRC_CARDS[k]));
    if (!L.length) L = Object.keys(FRC_CARDS).filter(k => okFor(k, FRC_CARDS[k]));
    // (the guns are many: they count as one kind of card between them, so the relics and the crew turn up as often)
    const g = L.filter(k => FRC_CARDS[k].t === 'gun' && FRC_CARDS[k].id), o = L.filter(k => !g.includes(k));
    const pick = g.length && (R() < 1 / (o.length + 1) || !o.length) ? g[(R() * g.length) | 0] : o[(R() * o.length) | 0];
    const C = FRC_CARDS[pick]; hand.push(C.arg ? pick + ':' + C.arg(R) : pick);
  }
  return hand;
}
// what the host knows of each of us: our relics and extra lives
function frcWho(sid) {
  if (sid === FPS.me.id) return { rel: FR.rel || [], co: !!ZM.net, life: FR.life | 0 };
  const r = FPS.remote.get(sid) || {}; return { rel: r.frRel || [], co: true, life: r.frLife == null ? FRC.LIVES : r.frLife | 0 };
}
const frcHere = () => ZM.hum.map(h => h[0]).filter(s => s === FPS.me.id || !(FPS.remote.get(s) || {}).left);

// ---------- the salvage, hosting or alone ----------
// (frAfterIsland) deal, open, and call done() once everyone's picked (or the time's up)
function frcSalvage(done) {
  if (!FR.on || ZM.over) { done(); return; }
  const hands = {}; frcHere().forEach((s, i) => { hands[s] = frcDeal(s, i, frcWho(s)); });
  FR.salN = (FR.salN | 0) + 1;
  FR.sal = { id: FR.salN, t: FRCC.T, hands, got: {}, done, at: performance.now() };
  frcOpen(FR.sal.id, hands[FPS.me.id], FRCC.T);
}
// (hosting or alone) a pick: sid kept card i; a crew card is played here
function frcGot(sid, i) {
  const S = FR.sal; if (!S || S.got[sid] != null || !S.hands[sid]) return;
  i = clamp(i | 0, 0, S.hands[sid].length - 1); S.got[sid] = i;
  const c = frcCard(S.hands[sid][i]); if (c && c.C.t === 'crew') frcCrew(c.C.crew, sid);
}
function frcHostTick() {
  const S = FR.sal; if (!S || ZM.net === 'client') return;
  S.t = FRCC.T - (performance.now() - S.at) / 1000;
  const who = Object.keys(S.hands).filter(s => s === FPS.me.id || !(FPS.remote.get(s) || {}).left);
  if (who.every(s => S.got[s] != null) || S.t <= -FRCC.GRACE || ZM.over || !FR.on) {
    for (const s of who) if (S.got[s] == null) frcGot(s, 0);
    const d = S.done; FR.sal = null; frcClose(true);
    d();
  }
}
// (hosting or alone) a crew card played
function frcCrew(k, sid) {
  const K = FR.crew, nx = (FR.stop | 0) + 1, nick = sid === FPS.me.id ? 'You' : ((ZM.hum.find(h => h[0] === sid) || [])[1] || 'A crewmate');
  if (k === 'planks') K.planks++;
  else if (k === 'lamp2') K.lamp2 = true;
  else if (k === 'way') K.way = nx;
  else if (k === 'call') K.call++;
  else if (k === 'fair') K.fair = nx;
  else if (k === 'haar') K.haar = nx;
  else if (k === 'caulk' || k === 'toll' || k === 'blue' || k === 'tally') K[k] = true;
  else if (k === 'pilot') K.pilot = nx;
  const C = FRC_CREW[k]; if (C) frcSay(`${nick} played ${C.n}.`);
}
function frcSay(t) { fpsFeed(t); if (ZM.net !== 'client') FRCS.say = [(FRCS.say[0] | 0) + 1, t]; }

// ---------- my side: the cards in front of me ----------
function frcOpen(id, hand, t) {
  if (!Array.isArray(hand) || !hand.length) return;
  Object.assign(FRCS, { id, hand: hand.slice(), picked: -1, t, at: performance.now(), open: true });
  // (a Message in a Bottle is spent on the first hand dealt after the one it came in)
  if (FR.rel && FR.rel.includes('bottle') && id > (FRCS.bottleAt | 0)) { FR.rel = FR.rel.filter(k => k !== 'bottle'); fpsFeed('The message in the bottle: a Captain’s salvage.'); }
  const o = frcBuild(), row = o.querySelector('.rcrow'); row.textContent = ''; row.classList.toggle('frc4', hand.length > 3);
  hand.forEach((s, i) => {
    const c = frcCard(s); if (!c) return;
    const C = c.C, col = C.t === 'relic' ? FR_RELICS[C.rel].c : C.t === 'crew' ? '#c8d4e0' : FRCC.RCOL[C.r], rgb = frcRgb(col), b = document.createElement('button');
    b.type = 'button'; b.className = 'rcclass frcc r' + C.r; b.style.setProperty('--rc', col); b.style.setProperty('--rcr', rgb); b.dataset.i = i;
    const n = c.a && FPSW[c.a] ? `${C.n}: ${FPSW[c.a].n}` : C.n, kind = C.t === 'crew' ? 'Crew card' : C.t === 'relic' ? (C.cur ? 'Cursed relic' : 'Relic') : C.t === 'gun' ? 'Gun' : 'Boon';
    b.innerHTML = `<span class="frcr">${FRCC.RARE[C.r]} · ${kind}</span><svg viewBox="0 0 24 24" aria-hidden="true">${frcIcon(c)}</svg><span class="nm">${n}</span><span class="tg">${C.what}</span><span class="frck">${i + 1}</span>`;
    b.addEventListener('click', () => { frcPick(i); try { if (!FPS.touch) cv.requestPointerLock(); } catch (e) {} });
    row.append(b);
  });
  frcTimeText();
  o.hidden = false; FPS.menu = true;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) {}
  FRCS.pad = 0; FRCS.padWas = null;
  setTimeout(() => { const b = o.querySelector('.frcc'); if (b) b.focus(); }, 30);
  try { zmSound('drop'); } catch (e) {}
  const loop = () => { if (!FRCS.open && !FR.sal) return; frcLoop(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function frcBuild() {
  if ($('frcPick')) return $('frcPick');
  const o = document.createElement('div');
  o.className = 'overlay pausecard rcpick frcpick'; o.id = 'frcPick'; o.hidden = true;
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'frcHead');
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = '<p class="eyebrow" id="frcEye">Fog Run · the salvage</p><h1 id="frcHead">Choose your salvage</h1><p class="muted" id="frcSub"></p><div class="rcrow"></div><p class="muted frct" id="frcTime"></p>';
  o.append(card); document.body.append(o);
  return o;
}
function frcTimeText() {
  const left = Math.max(0, Math.ceil(FRCS.t - (performance.now() - FRCS.at) / 1000)), T = $('frcTime'), S = $('frcSub');
  if (S) S.textContent = `Island ${FR.stop | 0} lit. Keep one card${ZM.net ? '. Crew cards help everyone aboard' : ''}.`;
  if (T) T.textContent = FRCS.picked >= 0 ? 'Kept. Waiting for the rest of the crew…' : `${left} s, then the left-hand card is taken for you · keys 1 to ${(FRCS.hand || []).length || 3}`;
}
function frcLoop() {
  if (!FPS.on || !FR.on) { frcClose(); FR.sal = null; return; }
  frcHostTick();
  if (!FRCS.open) return;
  if (!FPS.menu) FPS.menu = true;
  if (FPS.me) FPS.me.protect = Math.max(FPS.me.protect || 0, 0.5);
  if (FRCS.picked < 0 && performance.now() - FRCS.at > FRCS.t * 1000) frcPick(0);
  frcTimeText();
  // a controller: left and right, A to keep
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
  if (!pad || FRCS.picked >= 0) return;
  const now = pad.buttons.map(x => !!(x && x.pressed)), was = FRCS.padWas, ax = pad.axes[0] || 0;
  FRCS.padWas = now; now.dir = ax > 0.6 ? 1 : ax < -0.6 ? -1 : 0;
  if (!was) return;
  const bs = [...document.querySelectorAll('#frcPick .frcc')];
  const d = (now[15] && !was[15]) || (now.dir === 1 && was.dir !== 1) ? 1 : (now[14] && !was[14]) || (now.dir === -1 && was.dir !== -1) ? -1 : 0;
  if (d && bs.length) { FRCS.pad = (FRCS.pad + d + bs.length) % bs.length; bs[FRCS.pad].focus(); }
  if (now[0] && !was[0]) frcPick(FRCS.pad);
}
// I keep card i: mine to apply (a gun, a relic, a boon); a crew card is the host's
function frcPick(i, quiet) {
  if (FRCS.picked >= 0 || !FRCS.hand) return;
  i = clamp(i | 0, 0, FRCS.hand.length - 1); FRCS.picked = i;
  const c = frcCard(FRCS.hand[i]);
  if (c && c.C.get) { try { c.C.get(c.a); } catch (e) { console.warn(e); } }
  if (c) { ZM.banner = { text: c.a && FPSW[c.a] ? FPSW[c.a].n : c.C.n, t: 2.5, small: true, col: '#ffe2a8' }; if (c.C.t !== 'crew') fpsFeed(`You kept ${c.C.n}${c.a && FPSW[c.a] ? ': ' + FPSW[c.a].n : ''}.`); }
  if (!quiet) { if (ZM.net === 'client') zmnRequest('raid', ['frcpick', [FRCS.id, i]]); else frcGot(FPS.me.id, i); }
  document.querySelectorAll('#frcPick .frcc').forEach((b, j) => { b.disabled = true; b.classList.toggle('kept', j === i); });
  frcTimeText();
  if (!ZM.net) setTimeout(() => frcClose(), 350);
}
function frcClose(fromHost) {
  if (FRCS.open && FRCS.picked < 0 && fromHost) frcPick(0, true);
  const was = FRCS.open; FRCS.open = false;
  const o = $('frcPick'); if (o) o.hidden = true;
  if (was) { FPS.menu = false; if (FPS.me) FPS.me.protect = Math.max(FPS.me.protect || 0, 1.5); }
}
// (src/fps.js's keys, while the salvage is open) 1 to 3 keep that card; Escape doesn't open the pause menu behind it
function frcKey(e) {
  if (!FRCS.open) return false;
  const n = +e.key; if (n >= 1 && n <= (FRCS.hand || []).length && FRCS.picked < 0) { e.preventDefault(); frcPick(n - 1); return true; }
  if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); return true; }
  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) return true;   // (the buttons' own)
  return true;
}
// (hosting) what a joined player asked
function frcQ(sid, k, a) {
  if (k === 'frcpick' && Array.isArray(a) && FR.sal && (a[0] | 0) === FR.sal.id) frcGot(sid, a[1]);
  // (The Light Keeps Watch: theirs, once for this stage)
  else if (k === 'frcwatch' && (a | 0) === RAID.stage && frcHas('watch', sid)) { const W = FRCS.watched = FRCS.watched || {}; if (W[sid] !== RAID.stage) { W[sid] = RAID.stage; frcSweep(); } }
}

// ---------- what the cards do ----------
function frcGive(id, tier) {
  if (!FPSW[id]) return;
  zmGive(id);
  if (tier > 0 && typeof zmpDone === 'function' && typeof ZM_PAP_W !== 'undefined' && ZM_PAP_W[id]) { ZM.forge = { st: 'idle', id, t: 0, cost: 0 }; zmpDone(); }
}
function frcSpark() {
  const id = FPS.weapon, w = FPSW[id];
  if (!w || typeof ZM_PAP_W === 'undefined' || !ZM_PAP_W[id] || typeof zmpDone !== 'function') { fpsFeed('The spark finds nothing it can reforge in your hand.'); return; }
  ZM.forge = { st: 'idle', id, t: 0, cost: 0 }; zmpDone();
}
function frcAddRelic(k) {
  const R = FR_RELICS[k]; if (!R || FR.rel.includes(k)) return;
  FR.rel.push(k);
  if (k === 'bottle') FRCS.bottleAt = FRCS.id | 0;
  if (R.perk) ZM.perks[R.perk] = true;
  if (R.perk === 'stout' && FPS.me && !(FPS.me.dead > 0)) FPS.me.hp = ZMC.HP_STOUT;
}
const frcHas = (k, sid) => !FR.on ? false : !sid || sid === FPS.me.id ? !!(FR.rel && FR.rel.includes(k)) : !!((FPS.remote.get(sid) || {}).frRel || []).includes(k);
const frcAnyone = k => frcHas(k) || [...FPS.remote.values()].some(r => !r.left && (r.frRel || []).includes(k));
function frcBurning(d) { return !!(d && ((d.scorch || 0) > 0.05 || (typeof ZX !== 'undefined' && ZX.burn && ZX.burn.some(b => b.o === d)))); }
// (hosting) a blade kill with the Bell Clapper: everything near is thrown back
function frcClap(d, code, by) {
  const w = typeof fpsWOf === 'function' ? fpsWOf(code) : null; if (!(code === 'k' || (w && w.melee))) return;
  for (const o of ZM.z) { if (o.dead || o === d || o.boss) continue; const dx = o.x - d.x, dy = o.y - d.y, r = Math.hypot(dx, dy); if (r > FRCC.CLAP_R || r < 0.01) continue; if (typeof zmpStatus === 'function') zmpStatus(o, 'kb', dx / r * 5, dy / r * 5, 0.6); o.hitT = 0.2; }
  try { if (!soundOff()) { tone(1320, 'sine', 0.002, 0.5, 0.08); tone(1980, 'sine', 0.002, 0.3, 0.04); } } catch (e) {}
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; FPS.parts.push({ x: d.x + Math.sin(a) * 0.5, y: d.y + Math.cos(a) * 0.5, z: FPSC.GROUND + 1, vx: Math.sin(a) * 4, vy: Math.cos(a) * 4, vz: 0, t: 0.4, c: '255,226,160', up: true }); }
}
// (hosting) every fifth kill with the Wrecker's Lamp: a burning flare where it fell
function frcFlareDrop(d, by) {
  const s = by || FPS.me.id, n = FRCS.kc[s] = (FRCS.kc[s] | 0) + 1;
  if (n % FRCC.LAMP_EVERY || typeof zxPool !== 'function') return;
  zxPool(d.x, d.y, d.jz || 0, 2.2, 6, true, s);
}
// (src/zombies.js zmKill, hosting or alone) one of the drowned sent back
function frcKill(d, head, code, how, by) {
  if (!FR.on || !FR.rel) return;
  for (const k in FR_RELICS) { const R = FR_RELICS[k]; if (R.kill && frcHas(k, by)) R.kill(d, code, by, head); }
}
// (src/zombies.js zmHurt, the shooter's side) one of my hits
function frcHurt(d, dmg, code, by) {
  if (!FR.on || !FR.rel || (by && by !== FPS.me.id)) return dmg;
  for (const k of FR.rel) { const R = FR_RELICS[k]; if (R && R.hurt) dmg = R.hurt(d, dmg, code); }
  return dmg;
}
// (src/rclass.js rclJump, in mid-air) a relic's jump
function frcJump(m, cls) {
  if (!FR.on || !FR.rel) return false;
  if (cls === 'merc' && RCL.air < 1) return false;   // (the Mercenary's own first)
  for (const k of FR.rel) { const R = FR_RELICS[k]; if (R && R.jump && R.jump(m, cls)) { try { rclTone('jump2'); } catch (e) {} return true; } }
  return false;
}
const frcSee = () => { let up = 1, dn = 1; if (FR.on && FR.rel) for (const r of FR.rel) if (FR_RELICS[r] && FR_RELICS[r].see) { const v = FR_RELICS[r].see(); if (v > 1) up = Math.max(up, v); else dn = Math.min(dn, v); } return up * dn; };   // (the best lamp, and the worst curse)
const frcNoNip = m => FR.on && m === FPS.me && frcHas('tooth');
const frcSpy = () => FR.on && frcAnyone('spyglass') ? 2 : 0;
// (hosting: src/gwsail.js gwsStove) a spare plank, if there is one: the rock only scrapes her
function frcSpare() { if (!FR.on || !FR.crew || !(FR.crew.planks > 0)) return false; FR.crew.planks--; frcSay('The spare plank takes the blow: she only scrapes.'); return true; }
const frcFlareK = () => FR.on && FR.crew && FR.crew.lamp2 ? 0.5 : 1;
// (src/frsail.js frsLeg) a fair wind: the leg sets out halfway to its island
function frcLeg(L, p) {
  if (!FR.on || !FR.crew || !p || FR.crew.fair !== p.n) return;
  L.start = [(L.start[0] + L.mark[0]) / 2, (L.start[1] + L.mark[1]) / 2];
  L.fair = true;
}
// (src/frisle.js) the reach whose fog an island has: the reach before's, if the haar's lifted for it
const frcFogReach = p => p && FR.on && FR.crew && FR.crew.haar === p.n ? Math.max(1, (p.reach | 0) - 1) : p ? p.reach : FR.reach;

// ---------- each frame (frMe) ----------
function frcMe(dt) {
  if (!FR.on || !FR.rel) return;
  const m = FPS.me;
  // back on the ground: the feather's jump comes back
  if (!((m.jz || 0) > (m.fl || 0) + 0.02 || (m.vz || 0) > 0)) FRCS.air = 0;
  // the Drowned Man's Ring: each kill of mine mends a little
  const kills = ZM.kills || 0, heads = ZM.heads || 0;
  FRCS.dk = Math.max(0, kills - FRCS.kills); FRCS.dh = Math.max(0, heads - FRCS.heads); FRCS.heads = heads;
  if (FRCS.st.i !== RAID.stage) FRCS.st = { i: RAID.stage, bell: null, fl: null, cork: false, watch: false };   // (a new stage: nothing of it seen yet)
  if (kills > FRCS.kills && frcHas('ring') && !(m.dead > 0) && !zmIsDown() && !ZM.ghost) { const max = ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP; m.hp = Math.min(max, m.hp + FRCC.RING * (kills - FRCS.kills)); }
  FRCS.kills = kills;
  // the Slow Match: the ultimate fills half as fast again
  if (typeof RCL !== 'undefined') { if (frcHas('match') && RCL.ultT <= 0 && RCL.uK > FRCS.uK) RCL.uK = Math.min(1, RCL.uK + (RCL.uK - FRCS.uK) * 0.5); FRCS.uK = RCL.uK; }
  for (const k of FR.rel) { const R = FR_RELICS[k]; if (!R) continue; if (R.tick) R.tick(dt); if (R.perk && !ZM.perks[R.perk] && !(m.dead > 0) && !zmIsDown()) ZM.perks[R.perk] = true; }
  // Call Them Home (hosting or alone): anyone lost is brought straight back
  if (ZM.net !== 'client' && FR.crew && FR.crew.call > 0) {
    const lost = (ZM.ghost && FR.lost) || [...FPS.remote.values()].some(r => !r.left && r.frLost);
    if (lost) { FR.crew.call--; frBringBack(); frcSay('Call Them Home: everyone lost in the fog is brought back.'); }
  }
  // the Mourning Brooch: fire round you as you go down
  const dn = zmIsDown(); if (dn && !FRCS.wasDn && frcHas('brooch')) frcBrooch(); FRCS.wasDn = dn;
  frcCrewMe(dt);
  frcWay(dt);
}
// ---------- the second salvage: each frame ----------
const frcAlive = () => { const m = FPS.me; return !!m && !(m.dead > 0) && !zmIsDown() && !ZM.ghost && !ZM.over; };
const frcMax = () => ZM.perks && ZM.perks.stout ? ZMC.HP_STOUT : ZMC.HP;
const frcOnSail = () => RAID.on && RAID_ORDER[RAID.stage] === 'frsail' && RAID.st && RAID.st.B;
// (the Mallet, the Taper) holding Use at one of these: my own clock on it runs twice as fast (the stage's own sum
// still says when it's done, and the host still says what it does)
function frcHoldK(dt, ks) {
  const o = ZM.near; if (!o || !ks.includes(o.k)) return;
  const S = o.k === 'fkbr' ? (typeof FKW !== 'undefined' ? FKW : null) : RAID.st;
  if (S && S.useT > 0) S.useT += dt;
}
// Gannet's Eye: a round back in the gun for each kill through the head
function frcEye() {
  const m = FPS.me; if (!FRCS.dh || !frcAlive()) return;
  const w = typeof fpsW === 'function' ? fpsW() : null; if (!w || w.melee || !(w.mag > 0)) return;
  if (m.ammo < w.mag) { m.ammo = Math.min(w.mag, m.ammo + FRCS.dh); fpsPuff(m.x, m.y, FPSC.GROUND + (m.jz || 0) + 1.2, '232,224,192', 4); }
}
// Smelling Salts: I got someone up (the raids' own count of it, src/raidmvp.js), not myself
function frcSalts() {
  const n = typeof RMV !== 'undefined' && RMV.s ? RMV.s.rv | 0 : 0;
  if (FRCS.rv >= 0 && n > FRCS.rv && !FRCS.wasDn && typeof RCL !== 'undefined') { RCL.gT = 0; if (!(RCL.ultT > 0)) RCL.uK = Math.min(1, RCL.uK + FRCC.SALTS); FRCS.uK = RCL.uK; fpsFeed('Smelling Salts: your grenade is back.'); }
  FRCS.rv = n;
}
// the Keeper's Mirror: is the Light's beam on me now? (at sea from the Light itself, at Lantern Rock his own test of
// it, ashore Light the Way's sweep or the watch's); each pass brings the grenade nearer
function frcInBeam() {
  const m = FPS.me;
  if (frcOnSail()) { const V = RAID.st.V || RAID.st.B, b = bearingOf(V.x, V.y), d = Math.hypot(V.x, V.y); return Math.abs(b) < SK.SHADE && Math.abs(angDiff(b, gwBeam())) < SK.HALF_BEAM + 0.03 && d < SK.BEAM_RANGE; }
  if (typeof FKW !== 'undefined' && FKW.on && typeof fkBeamOn === 'function' && fkBeamOn()) return true;
  return FRCS.wayOn && Math.abs(angDiff(bearingOf(m.x - FPSC.CX, m.y - FPSC.CY), FRCS.wayA)) < FRCC.WAY_HALF * 1.5;
}
function frcMirror() {
  const on = frcInBeam();
  if (on && !FRCS.beamWas && typeof RCL !== 'undefined' && RCL.gT > 0 && frcAlive()) { RCL.gT = Math.max(0, RCL.gT - FRCC.MIRROR); const m = FPS.me; fpsPuff(m.x, m.y, FPSC.GROUND + (m.jz || 0) + 1.4, '255,240,200', 8); try { if (!soundOff()) tone(1560, 'sine', 0.002, 0.25, 0.05); } catch (e) {} }
  FRCS.beamWas = on;
}
// the Tallow Wick: each kill while the ultimate's up, a second more of it (a Wellspring of mine, a second more too)
function frcWick() {
  if (!FRCS.dk || typeof RCL === 'undefined') return;
  if (RCL.ultT > 0) { RCL.ultT += FRCS.dk; if (RCL.cls === 'merc') { FRCS.wickN += FRCS.dk; while (FRCS.wickN >= 2) { FRCS.wickN -= 2; RCL.shots++; } } }
  for (const w of RCL.wells || []) if (w.mine && w.t > 0) w.t = Math.min(w.T + 10, w.t + FRCS.dk);
}
// Fog in the Eyes: kills fill the ultimate three times as fast (twice more on top of rclTick's own)
function frcHaze() { if (FRCS.dk && typeof RCL !== 'undefined' && !(RCL.ultT > 0)) RCL.uK = Math.min(1, RCL.uK + FRCS.dk * RCLC.UKILL * 2); }
// The Light Keeps Watch: down to my last knock (once a stage), the beam sweeps once: the host's to run
function frcWatch() {
  const m = FPS.me; if (FRCS.st.watch || !frcAlive() || !(m.hp > 0 && m.hp <= 1)) return;
  FRCS.st.watch = true; fpsFeed('The Light keeps watch: its beam comes round for you.');
  if (ZM.net === 'client') zmnRequest('raid', ['frcwatch', RAID.stage]); else frcSweep();
}
// (hosting or alone) one pass of the beam (unless Light the Way's already sweeping), and the word for everyone
function frcSweep() { FRCS.swN++; if (FRCS.wayT < 0) FRCS.wayT = FRCC.WAY_T - FRCC.WAY_EVERY; }
// the Mourning Brooch: a ring of fire (mine, so it hurts them) and everything near thrown back
function frcBrooch() {
  const m = FPS.me, fz = m.fl || 0;
  if (typeof zxPool === 'function') zxPool(m.x, m.y, fz, FRCC.BROOCH_R, 6, true, m.id);
  for (const o of ZM.z) { if (o.dead || o.boss) continue; const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy); if (d > FRCC.BROOCH_R + 1 || d < 0.01) continue; if (typeof zmpStatus === 'function') zmpStatus(o, 'kb', dx / d * 4, dy / d * 4, 0.8); }
  fpsPuff(m.x, m.y, FPSC.GROUND + fz + 0.3, '255,150,60', 18);
  fpsFeed('The Mourning Brooch: fire bursts up round you.');
}
// (hosting) Bladderwrack: a kill through the head bursts in brine, and everything near is slowed
function frcWrack(d, head) {
  if (!head) return;
  for (const o of ZM.z) { if (o.dead || o === d) continue; if (Math.hypot(o.x - d.x, o.y - d.y) > FRCC.WRACK_R) continue; if (typeof zmpStatus === 'function') zmpStatus(o, 'slow', 3); o.hitT = 0.15; }
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; FPS.parts.push({ x: d.x, y: d.y, z: FPSC.GROUND + (d.jz || 0) + 1.5, vx: Math.sin(a) * 3.5, vy: Math.cos(a) * 3.5, vz: 1.5, t: 0.6, c: '140,190,120' }); }
}
// the crew's cards that work each frame
function frcCrewMe(dt) {
  const K = FR.crew; if (!K) return;
  const host = ZM.net !== 'client', m = FPS.me;
  if (frcOnSail()) {
    const S = RAID.st;
    // Caulking Iron (hosting): half what came in at the holes this frame taken back out (never her speed)
    if (host && K.caulk && S.ph === 'sail' && S.holes.length && S.flood < 1) S.flood = Math.max(0, S.flood - S.holes.length * GWS.FLOOD * dt * 0.5);
    // Toll for the Drowned (everyone, for themselves): the bell's swing only ever dies away, except when it's rung
    const sw = S.bellSwing || 0;
    if (FRCS.st.bell != null && sw > FRCS.st.bell + 0.01 && K.toll && frcAlive()) { m.hp = Math.min(frcMax(), m.hp + FRCC.TOLL); fpsFeed('Toll for the Drowned: the bell mends you.'); }
    FRCS.st.bell = sw;
    // Blue Lights (hosting): every flare fired, the drowned aboard set alight
    const fl = S.flN | 0;
    if (host && FRCS.st.fl != null && fl > FRCS.st.fl && K.blue) frcBlue();
    FRCS.st.fl = fl;
  }
  // the Tally of Lights (hosting): each of the drowned, as it first appears, weaker by the islands lit
  if (host && K.tally) { const k = 1 - Math.min(FRCC.TALLY_MAX, FRCC.TALLY * (FR.lit | 0)); for (const z of ZM.z) { if (z.frT || z.dead) continue; z.frT = 1; if (z.boss || k >= 1) continue; z.hp *= k; z.max = (z.max || z.hp / k) * k; } }
  // (joined) the host's one-pass sweeps, seen here as well
  if (!host) { if (FRCS.swSeen >= 0 && FRCS.swN > FRCS.swSeen && FRCS.wayT < 0) FRCS.wayT = FRCC.WAY_T - FRCC.WAY_EVERY; FRCS.swSeen = FRCS.swN; }
}
function frcBlue() {
  let n = 0;
  for (const o of ZM.z) { if (o.dead || o.st !== 'in') continue; o.scorch = 1; if (typeof ZX !== 'undefined' && ZX.burn) { const d = Math.max(typeof zxHp === 'function' ? zxHp() : 1, o.boss ? 0 : o.max || 0) * 0.16; ZX.burn.push({ o, t: 3, k: 0.25, d }); } n++; }
  if (n) frcSay(`Blue Lights: the flare sets ${n === 1 ? 'one of the drowned' : n + ' of the drowned'} aboard alight.`);
}
// (src/fps.js fpsHurt) a knock on me, as my relics have it (St Elmo's Medal, the Drowned Man's Bargain)
function frcHurtMe(n) { if (!FR.on || !FR.rel) return n; for (const k of FR.rel) { const R = FR_RELICS[k]; if (R && R.meK) n = R.meK(n); } return n; }
// (src/zombies.js zmDown) the Cork Lifebelt: once a stage, not down but on my last knock
function frcCork() {
  if (!FR.on || !frcHas('cork') || FRCS.st.cork || ZM.ghost) return false;
  const m = FPS.me; FRCS.st.cork = true;
  m.hp = 1; m.protect = 1.5; m.iframe = ZMC.IFRAME_UP || 1; FPS.hurtT = 0.8;
  ZM.banner = { text: 'The Cork Lifebelt holds you up', t: 2.5, small: true, col: FR_RELICS.cork.c };
  fpsFeed('The Cork Lifebelt holds you up: one knock left.');
  return true;
}
// (src/rclass.js rclGrenade) the Twin Fuse: a second grenade, a little to the side of the first
function frcGren(m, v, z) {
  if (!FR.on || !frcHas('fuse') || typeof rclLaunch !== 'function') return;
  const a = 0.22, c = Math.cos(a), s = Math.sin(a), vx = v[0] * c + v[1] * s, vy = -v[0] * s + v[1] * c;
  rclLaunch(RCL.cls, m.x, m.y, z, vx, vy, v[2], true, m.id);
  rclEvent('g', m.x - FPSC.CX, m.y - FPSC.CY, z, vx, vy, v[2]);
}
// (src/frchart.js frChartOpts) the Pilot's Chart: true when the whole column of stop n is open
const frcPilot = n => FR.on && !!FR.crew && FR.crew.pilot > 0 && FR.crew.pilot === n;
function frcPilotOk() {
  if (FR.crew && FR.crew.pilot > (FR.stop | 0)) return false;
  try { const n = (FR.stop | 0) + 1, C = frChart(), col = C.cols[n - 1], at = C.all[FR.at]; return !!col && !!at && at.c === n - 1 && at.to.length < col.length; } catch (e) { return false; }
}
// (tests) the next hand I'm dealt: these cards, in this order
function frcDebugHand(keys) { FRCS.force = Array.isArray(keys) ? keys.map(String) : null; return FRCS.force; }
// Light the Way: the Light's beam sweeping the island (hosting: the burning; everyone: the beam)
function frcWay(dt) {
  const B = frcBeam3d();
  FRCS.wayOn = false;
  if (FRCS.wayT < 0 || ZM.over) { if (B) B.visible = false; return; }
  FRCS.wayT += dt;
  if (FRCS.wayT > FRCC.WAY_T) { FRCS.wayT = -1; if (B) B.visible = false; return; }
  const ph = (FRCS.wayT % FRCC.WAY_EVERY) / 1.4;   // (each pass takes 1.4 s, then the beam's gone round out of sight)
  const on = ph < 1, a = ph * Math.PI * 2;
  if (B) { B.visible = on; if (on) { B.rotation.set(0, -a, 0); B.children[0].material.opacity = 0.16 * Math.sin(Math.min(1, ph) * Math.PI) + 0.04; } }
  FRCS.wayA = a; FRCS.wayOn = on;
  if (!on || ZM.net === 'client') return;
  const cx = FPSC.CX, cy = FPSC.CY;
  for (const z of ZM.z) {
    if (z.dead || z.gone) continue;
    if (Math.abs(angDiff(bearingOf(z.x - cx, z.y - cy), a)) > FRCC.WAY_HALF) continue;
    if (z.boss) { if (!(z.frWay > FRCS.wayT - 1.5)) { z.frWay = FRCS.wayT; zmHurt(z, (z.max || 1) * 0.05, false, 'L', FPS.me.id, 'lamp'); } continue; }
    zmKill(z, false, 'L', 'lamp', FPS.me.id);
    if (typeof zmlFlash === 'function') zmlFlash(z, 6);
  }
}
// the beam: a long pale blade of light from the island's middle, in the raid's own 3D group
function frcBeam3d() {
  if (typeof R3 === 'undefined' || !R3.grp || typeof THREE === 'undefined') return null;
  if (FRCS.beam && FRCS.beamIn === R3.grp) return FRCS.beam;
  const G = new THREE.Group(), L = 70;
  // (a long open cone, narrow at the island's middle and widening out over the shore, laid along -z)
  const geo = new THREE.CylinderGeometry(0.3, 2.6, L, 16, 1, true); geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  mesh.position.set(0, 0, -L / 2); G.add(mesh);
  G.position.copy(z3v(FPSC.CX, FPSC.CY, FPSC.GROUND + 3.6)); G.visible = false;
  R3.grp.add(G); FRCS.beam = G; FRCS.beamIn = R3.grp;
  return G;
}

// ---------- playing together ----------
// (frPack, hosting) the salvage and the crew's cards
function frcPack(z) {
  const S = FR.sal;
  z.frs = S ? [S.id, Math.round(S.t * 10) / 10, Object.entries(S.hands), Object.keys(S.got)] : 0;
  const K = FR.crew || {}; z.frk = [K.planks | 0, K.lamp2 ? 1 : 0, K.way | 0, K.call | 0, K.fair | 0, K.haar | 0, FRCS.say[0], FRCS.say[1],
    K.caulk ? 1 : 0, K.toll ? 1 : 0, K.blue ? 1 : 0, K.pilot | 0, K.tally ? 1 : 0, FRCS.swN | 0];
}
// (frApplyRun, joined)
function frcApply(hz) {
  if (Array.isArray(hz.frk)) { const a = hz.frk; FR.crew = { planks: a[0] | 0, lamp2: !!a[1], way: a[2] | 0, call: a[3] | 0, fair: a[4] | 0, haar: a[5] | 0,
      caulk: !!a[8], toll: !!a[9], blue: !!a[10], pilot: a[11] | 0, tally: !!a[12] }; FRCS.swN = a[13] | 0;
    // (a line the host said for everyone; not what was said before we heard it first)
    const n = a[6] | 0; if (FRCS.heard >= 0 && n > FRCS.heard && a[7]) fpsFeed(String(a[7]).slice(0, 160)); FRCS.heard = n; }
  const s = hz.frs;
  if (Array.isArray(s)) {
    const id = s[0] | 0, mine = Array.isArray(s[2]) ? (s[2].find(e => Array.isArray(e) && e[0] === FPS.me.id) || [])[1] : null;
    if (id && id !== FRCS.id && Array.isArray(mine)) frcOpen(id, mine.map(String).filter(x => frcCard(x)).slice(0, 4), clamp(+s[1] || FRCC.T, 1, FRCC.T));
  } else if (FRCS.open) frcClose(true);
}
// (frPresence / frHeard) my relics, and theirs
function frcPresence(z) { if (FR.on && FR.rel) z.frr = FR.rel.slice(0, 24); }
function frcHeard(r, z) { if (Array.isArray(z.frr)) r.frRel = z.frr.map(String).filter(k => FR_RELICS[k]); }
// (frRjSnap / frRjAfter) the rejoin record: my relics
function frcRjSnap(o) { if (o && FR.rel) o.rel = FR.rel.slice(); return o; }
function frcRjAfter(fr) { if (fr && Array.isArray(fr.rel)) for (const k of fr.rel) if (FR_RELICS[k]) frcAddRelic(String(k)); }

// ---------- painted on top (raidStaminaHud) ----------
// my relics, and the crew's cards still to come, as little roundels in a row
function frcHud(x, y, h, phone, mono) {
  if (!FR.on || !FR.rel) return;
  const K = FR.crew || {}, list = FR.rel.filter(k => FR_RELICS[k]).map(k => ({ c: FR_RELICS[k].c, l: FR_RELICS[k].n.replace(/^(The|St) /, '')[0] }));
  if (K.planks > 0) list.push({ c: '#c8d4e0', l: 'P', n: K.planks, crew: 1 });
  if (K.lamp2) list.push({ c: '#c8d4e0', l: 'F', crew: 1 });
  if (K.call > 0) list.push({ c: '#c8d4e0', l: 'C', n: K.call, crew: 1 });
  for (const [k, l] of [['caulk', 'I'], ['toll', 'B'], ['blue', 'L'], ['tally', 'T']]) if (K[k]) list.push({ c: '#c8d4e0', l, crew: 1 });
  if (!list.length) return;
  const s = h + 8, gap = 4;
  ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(236,228,207,0.65)';
  ctx.fillText('RELICS', x, y - 3);
  list.forEach((R, i) => {
    const X = x + i * (s + gap) + s / 2, Y = y + h / 2;
    ctx.fillStyle = 'rgba(8,10,14,0.6)'; ctx.beginPath(); ctx.arc(X, Y, s / 2 + 2, 0, 6.283); ctx.fill();
    ctx.strokeStyle = R.c; ctx.lineWidth = 1.5; ctx.beginPath(); R.crew ? ctx.rect(X - s / 2, Y - s / 2, s, s) : ctx.arc(X, Y, s / 2, 0, 6.283); ctx.stroke();
    ctx.fillStyle = R.c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = mono(phone ? 9 : 11); ctx.fillText(R.l, X, Y + 1);
    if (R.n > 1) { ctx.font = mono(8); ctx.fillText(String(R.n), X + s / 2, Y - s / 2); }
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// ---------- the cards' faces ----------
function frcRgb(hex) { const n = parseInt(String(hex).replace('#', ''), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
const FRC_ICON = {
  gun: '<path d="M3 10h13l2-2h3v4h-3l-1 1H9l-1 5H5l1-5H3z"/>',
  spark: '<path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="12" cy="12" r="1.5"/>',
  rum: '<path d="M8 3h8l-1 4c2 1 3 3 3 5v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7c0-2 1-4 3-5z"/><path d="M7 13h10"/>',
  ribbon: '<path d="M12 4c-3 0-5 2-5 4s2 4 5 7c3-3 5-5 5-7s-2-4-5-4z"/><path d="M9 14l-3 7 3-1 1 2 2-6M15 14l3 7-3-1-1 2-2-6"/>',
  oilcan: '<path d="M5 10h9v9H5zM14 12l6-4M8 10V7h3v3"/>',
  feather: '<path d="M19 4C11 5 6 10 5 20"/><path d="M19 4c0 6-4 11-11 12M15 6l-4 4M17 9l-5 3"/>',
  ring: '<circle cx="12" cy="14" r="6"/><path d="M10 6l2-3 2 3z"/>',
  salt: '<path d="M8 8h8l1 12H7zM9 8V5h6v3"/><circle cx="11" cy="4" r=".6"/><circle cx="13" cy="3" r=".6"/>',
  clapper: '<path d="M6 17c0-6 2-11 6-11s6 5 6 11zM4 17h16"/><circle cx="12" cy="20" r="1.5"/>',
  tooth: '<path d="M7 4c-2 0-3 2-3 4 0 4 2 5 3 12 1 0 2-5 5-5s4 5 5 5c1-7 3-8 3-12 0-2-1-4-3-4-2 0-3 1-5 1S9 4 7 4z"/>',
  wlamp: '<path d="M9 6h6l1 3v8H8V9zM12 3v3M7 20h10"/><path d="M12 11c1 1 1 3 0 4-1-1-1-3 0-4z"/>',
  spyglass: '<path d="M3 15l14-7 2 4-14 7zM17 8l3-1 1 3-2 1"/>',
  monkey: '<circle cx="12" cy="14" r="6"/><path d="M15 9l3-4M18 5l2 1"/>',
  match: '<path d="M4 20c4-4 8-12 16-16"/><circle cx="19" cy="5" r="1.6"/>',
  tonic: '<path d="M10 3h4v4l3 4v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8l3-4z"/><path d="M7 14h10"/>',
  planks: '<path d="M3 7h18v4H3zM3 13h18v4H3z"/><path d="M7 7v10M17 7v10"/>',
  lamp2: '<path d="M8 4h8v5l-2 3v8h-4v-8L8 9z"/><path d="M5 5l-2-1M19 5l2-1M12 1v2"/>',
  way: '<path d="M12 21V9M9 9h6l-1-4h-4z"/><path d="M15 7l7-3M15 8l7 1"/>',
  call: '<path d="M6 17c0-6 2-11 6-11s6 5 6 11zM4 17h16"/><path d="M2 9l2 1M22 9l-2 1"/>',
  fair: '<path d="M3 9c3-2 6 2 9 0s6-2 9 0M3 15c3-2 6 2 9 0s6-2 9 0"/>',
  haar: '<path d="M3 9h12M6 13h15M3 17h12"/><circle cx="17" cy="7" r="3"/>',
  // (the second salvage)
  mallet: '<path d="M4 5h9v5H4zM8 10v11"/><path d="M13 7h3"/>',
  elmo: '<circle cx="12" cy="13" r="6"/><path d="M12 3v4M9 4l3 3 3-3M12 10l1 2h2l-2 1.5.8 2.2-1.8-1.3-1.8 1.3.8-2.2L9 12h2z"/>',
  geye: '<path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7z"/><circle cx="12" cy="12" r="3"/>',
  taper: '<path d="M10 9h4v12h-4zM12 3c2 2 2 4 0 6-2-2-2-4 0-6z"/>',
  salts: '<path d="M9 8h6v12H9zM10 8V5h4v3"/><path d="M7 4l-2-2M17 4l2-2M12 2V1"/>',
  cork: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>',
  mirror: '<circle cx="12" cy="10" r="6"/><path d="M12 16v5M9 21h6M9 7l5 5"/>',
  wrack: '<path d="M12 21V8M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 16c3 0 5-2 5-5-3 0-5 2-5 5z"/><circle cx="12" cy="5" r="1.5"/>',
  brooch: '<path d="M12 3l7 5-3 9H8L5 8z"/><path d="M12 8v4"/>',
  wick: '<path d="M8 10h8v11H8zM12 10V6"/><path d="M12 2c1.5 1.5 1.5 3 0 4-1.5-1-1.5-2.5 0-4z"/>',
  log: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  fuse: '<circle cx="8" cy="15" r="5"/><circle cx="16" cy="15" r="5"/><path d="M8 10c0-4 3-6 4-7M16 10c0-4-3-6-4-7"/>',
  haze: '<path d="M3 8h14M6 12h15M3 16h14"/><path d="M8 20l8-16"/>',
  bargain: '<path d="M4 13l4-4 3 2 3-3 6 5-5 5-2-2-2 2z"/><path d="M8 9l-4-2M16 8l4-2"/>',
  pact: '<path d="M7 3h10v18l-5-4-5 4z"/><path d="M10 9l4 4M14 9l-4 4"/>',
  sack: '<path d="M8 6h8l-1 2c4 2 5 6 5 9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3c0-3 1-7 5-9z"/><path d="M8 6l-1-3M16 6l1-3"/>',
  watch: '<path d="M10 21V10h4v11M8 10h8l-1-3H9z"/><path d="M12 7V4M15 8l6-4M15 9h7"/>',
  bottle: '<path d="M10 2h4v5l3 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l3-4z"/><path d="M9 14h6M9 17h4"/>',
  caulk: '<path d="M4 20l8-8M12 12l3-8 5 5-8 3z"/><path d="M3 21h4"/>',
  toll: '<path d="M6 16c0-6 2-10 6-10s6 4 6 10zM4 16h16"/><path d="M12 6V3M9 20c1 1 5 1 6 0"/>',
  blue: '<path d="M12 21V12M8 12h8l-1-5H9z"/><circle cx="12" cy="4" r="2"/><path d="M5 5l2 2M19 5l-2 2"/>',
  pilot: '<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>',
  tally: '<path d="M5 4v16M9 4v16M13 4v16M17 4v16M3 15l18-6"/>',
};
function frcIcon(c) { const C = c.C; return FRC_ICON[C.t === 'gun' ? (c.k === 'spark' ? 'spark' : 'gun') : C.crew ? C.crew : C.rel ? (FR_RELICS[C.rel].perk ? 'tonic' : C.rel) : c.k] || FRC_ICON.gun; }
