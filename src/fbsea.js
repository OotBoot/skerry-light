// Freebooters' Sea: an open sea to sail together, a game of its own (its own card on the title screen, its own lobby),
// alone or up to four on one ship. 1889: beyond the Near Skerries lies the Wide Water, a sea the charts gave up on.
// The crew sails the keeper's cutter round a wide sea of islands from the outpost of Saltcote, goes ashore wherever
// they like, carries home what's lying there and sells it to the factor. No stages to clear and no end: you leave when
// you like. The design: /home/claude/fbsea-design.md.
//
// How it's built. Like Fog Run (src/frrun.js), it's a raid (src/raid.js): its own map, ZM_MAPS.fbsea, its own entry in
// RAIDS (kept off the raid card's picker: RAIDS.fbsea.own), the callings (src/rclass.js), going down and getting up,
// and playing together through the Lighthouse's lobby (src/zmnet.js, its own mode 'fb', kept apart from nights, raids
// and fog runs by ZM_MAPS.fbsea.fb). What's its own:
//  - The world is fixed, the same on every screen and every session (no seed is drawn or sent): the sea, its rocks and
//    its islands (FB_ISLES, src/fbsail.js), each island's layout (src/fbisle.js, from the island's own seed). Only the
//    live state goes over the wire.
//  - The session's state, FB (below): the stage plan, the ship as she lies (FB.ship: where she is, her heading, holes,
//    flood), the hold (FB.hold: loot kinds), the purse (FB.gold: sovereigns banked this session, the crew's), what's
//    still lying on each island (FB.left), and my own wait to be back on my feet (FB.backT).
//  - A stage order grown as it's played, open-ended. RAID_ORDER starts as one stage, the open sea ('fbsail'). Drop
//    anchor off an island and the next is that island ('fb_isle', or 'fb_port' for Saltcote); go back aboard and the
//    next is the sea again, where she lay. FB.plan runs alongside RAID_ORDER, one entry a stage: { key, i } (i: which
//    of FB_ISLES). fbGo(key, i) (hosting or alone) adds one and goes to it. The host sends the plan's last few entries
//    in its word (fbw); a joined player's RAID_ORDER is rebuilt from it before the stage number is followed.
//  - Lives: down and got up as the raids. Bleed out (or, alone, go down at all) and you're back on your feet FBC.BACK
//    seconds later at the stage's start (the deck, or the landing), never the end. She sinks (a full flood): everyone
//    washes up at Saltcote with a fresh cutter lying off it, and the hold is lost.
//  - Loot (FB_LOOT, below): chests of three grades, a drowned captain's bell, a cargo crate, a strongbox and trinkets,
//    each worth so many sovereigns. You carry one at a time in your arms (no gun while you carry it; you walk as ever),
//    Use again to put it down, and Use at the landing boat stows it in the hold. At Saltcote, the factor's table (Use)
//    buys the whole hold, the sovereigns to the crew's purse.
//
// The hook API, for the threads to come (a: swivel guns and the Mooncusser sloops; b: voyages, digging, the bounty,
// salvage; c: sovereigns kept, standings, crates, the scoreboard, the save, rejoin):
//  - fbHook(where, h): more for a stage to do, where is 'sail' (the open sea, src/fbsail.js), 'isle' (any island) or
//    'port' (Saltcote). h has any of a stage's hooks (src/raid.js): enter(), tick(dt) (hosting or alone), me(dt), q(sid,
//    k, a) (return true if it was yours), pack(o), apply(o), consider(c), prompt(o) / use(o) (return something for
//    yours), hud(phone, mono, fell), b3(grp) / f3(dt), exit(), block(x, y, pad, feet), kill(d, how, by), hurt(d, dmg,
//    code, by) (return the damage), shot(...), players(P). They run after the stage's own, in the order hooked. Keep
//    your state in RAID.st (fresh each stage) or your own global; your word's keys in pack/apply must be your own
//    (prefix them: 'fa' for a, 'fv' for b, 'fk' for c).
//  - On the sea (src/fbsail.js): FB_ISLES (the islands, fixed: { n, x, y, r, look, seed, port }), fbSea() (its rocks,
//    shores), fbNearest(x, y) ({ i, d }: the nearest island and how far off its shore), fbInReach(B) (the island she can
//    anchor off now, or -1), fbAnchor(sid) (hosting or alone: drop anchor and go ashore). The ship's pose is
//    RAID.st.B (host) / RAID.st.V (shown), as in src/gwsail.js; her holes S.holes and flood S.flood. gwsStove(off,
//    side) holes her (a cannonball's hit). The sea's group (GW3.SG) is where 3D out on the water goes (sea frame:
//    gsv(x, y, z)).
//  - On land (src/fbisle.js): fbIsleNow() (the FB_ISLES entry of this stage, or null), fbIsleSpot(r) (a clear spot
//    on this island, from its layout's tools while it's laid out: call it from a hooked set(H)), fbIsleSpawn(o)
//    (hosting or alone: one of the drowned up out of the shore, away from everyone; o as raidSpawnAt), FBI.land()
//    (where the landing is). fbHook('isle', { set(H, K, Z) }) lays out things of your own with the island.
//  - Loot: fbLootAdd(kind, x, y) (hosting or alone: an item of that kind lying at x, y on this stage, world
//    coordinates; returns it), fbLootKind(k, def) (a new kind of loot: { n (its name, with an article), N (short, for
//    lists), v (sovereigns), shape ('chest', 'bell', 'crate', 'box', 'small'), col }), fbHoldValue(), fbCarrying()
//    (what I'm carrying, or null), fbStowKind(kind) (hosting or alone: straight into the hold), fbSell(sid) (hosting or
//    alone: the hold sold; at the factor's table).
//  - What happens, for anyone to hear (hosting or alone, and on every joined screen as the host's word comes in):
//    fbOn(ev, cb) with ev 'sold' (cb(sum, kinds, sid): sovereigns banked), 'stow' (cb(kind, sid)), 'lost' (cb(kinds):
//    the hold went down with her), 'ashore' (cb(i)), 'aboard' (cb(i)); fbOnSold(cb) is fbOn('sold', cb). And
//    fbEvent(k, text, a) (hosting or alone: a line for everyone, and an event the others hear as fbOn(k)).
//  - Session ends (c): fbReport() is called where a raid reports to the scoreboard (leaving); FB.gold is what was
//    banked this session. FB.sid is this session's id (the host's, the same for the crew: for paying crates once).
//  - fbDebug(stageKey, i): straight into a session alone and on to that stage ('fbsail', 'fb_isle' with island i,
//    or 'fb_port'), the calling picked for you, for tests. In one already: straight there.
// Hooks in shared files are marked [fbsea]: src/raid.js (raidBegin fbBegin, raidAfterStart fbAfterStart, raidStop
// fbStop, raidMe fbMe, raidNextStage (never won), raidReport fbReport, raidHostSend fbPack, raidApply fbApply,
// raidHud fbHudTitle and fbHud, raidMapFor's map.seed), src/zombies.js (zmCheckOver, zmDown fbDownAlone, zmBleedOut
// fbBledOut, the bled-out line), src/fps.js and src/fpsgun.js (fbNoGun: no gun while you carry), src/gwsail.js
// (GWS_LEG's sea, enter, sunk, prog, spawnOk, row, markLab, amb), src/zmnet.js (the lobby's fourth card), src/share.js
// (?mode=fbsea&lobby=...), src/menudesk.js (the seventh game), index.html (its card and banner), src/style.css.

// FBC: BACK, seconds from bleeding out to back on your feet; AWAY, seconds from "back aboard" to aboard; KEEP, how many
// of the plan's last entries go in the host's word
const FBC = { BACK: 10, AWAY: 4, KEEP: 4 };
// the music each part plays (src/raidmusic.js; the sea, an island, Saltcote: for now, the Gannet's and Fog Run's own)
var FB_MUSIC = { sail: 'gwsail', isle: 'frisle', port: 'frsail' };
var FB = { on: false, debug: null, plan: [], ship: null, hold: [], gold: 0, left: {}, backT: 0, kit: null, ev: [], eseq: 0, evSeen: -1, sid: '', hooks: { sail: [], isle: [], port: [] }, on_: {} };

// ---------- the loot ----------
// what can be carried home: its name (with its article, and short for lists), its worth in sovereigns, its shape
var FB_LOOT = {
  chest: { n: 'a battered sea chest', N: 'sea chest', v: 120, shape: 'chest', col: '#5a3e26' },
  chest2: { n: 'an ironbound chest', N: 'ironbound chest', v: 300, shape: 'chest', col: '#3e3a36' },
  chest3: { n: 'a gilded chest', N: 'gilded chest', v: 650, shape: 'chest', col: '#6a4a1e', gilt: true },
  bell: { n: 'a drowned captain’s bell', N: 'captain’s bell', v: 450, shape: 'bell', col: '#a8823a' },
  crate: { n: 'a cargo crate', N: 'cargo crate', v: 160, shape: 'crate', col: '#7a6040' },
  strongbox: { n: 'a strongbox', N: 'strongbox', v: 500, shape: 'box', col: '#2e3034' },
  locket: { n: 'a tarnished locket', N: 'locket', v: 30, shape: 'small', col: '#c8a050', trinket: true },
  compass: { n: 'a brass compass', N: 'compass', v: 45, shape: 'small', col: '#b08a3a', trinket: true },
  tankard: { n: 'a pewter tankard', N: 'tankard', v: 25, shape: 'small', col: '#8a8c90', trinket: true },
  scrimshaw: { n: 'a scrimshaw tooth', N: 'scrimshaw', v: 60, shape: 'small', col: '#e0d8c0', trinket: true },
};
function fbLootKind(k, def) { FB_LOOT[k] = Object.assign({ n: k, N: k, v: 0, shape: 'crate', col: '#7a6040' }, def); return FB_LOOT[k]; }
const fbLootOf = k => FB_LOOT[k] || FB_LOOT.crate;
const fbHoldValue = () => FB.hold.reduce((a, k) => a + fbLootOf(k).v, 0);
const fbSov = n => `${Math.round(n).toLocaleString('en')} ${Math.round(n) === 1 ? 'sovereign' : 'sovereigns'}`;
// the hold in a few words: "2 sea chests and a locket"
function fbHoldWords(list) {
  list = list || FB.hold; if (!list.length) return 'nothing';
  const n = {}; for (const k of list) n[k] = (n[k] || 0) + 1;
  const bits = Object.keys(n).map(k => n[k] === 1 ? fbLootOf(k).n : `${n[k]} ${fbLootOf(k).N}${/x$|s$/.test(fbLootOf(k).N) ? 'es' : 's'}`);
  return bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0];
}

// ---------- the map, as src/zombies.js and src/raid.js see it ----------
ZM_MAPS.fbsea = Object.assign({}, ZM_MAPS.raid, { n: 'Freebooters’ Sea', N: 'Freebooters’ Sea', seed: 0xfb5ea, fb: true,
  blurb: 'An open sea of islands, alone or up to four: sail anywhere, go ashore, bring the salvage home.',
  land: n => `The keeper’s cutter, lying off Saltcote${n ? ', ' + n + ' of you aboard' : ''}. Out there, the Wide Water.` });
RAIDS.fbsea = { n: 'Freebooters’ Sea', own: true, order: ['fbsail'], at: {}, mvp: '-',
  lost: n => `Ashore from the Wide Water, at ${n}`, won: 'Home from the Wide Water', again: 'Set sail again' };

// ---------- hooks for the parts to come ----------
function fbHook(where, h) { (FB.hooks[where] || (FB.hooks[where] = [])).push(h); return h; }
// (a stage) every hook of where's for k, in turn: the first that returns something, for prompt and use and q
function fbHooks(where, k, ...a) { let r; for (const h of FB.hooks[where] || []) if (typeof h[k] === 'function') { const v = h[k](...a); if (v != null && v !== false && r == null) r = v; } return r; }
// (hurt and players pass their value along the hooks: each gets the last one's say)
function fbHookHurt(where, d, dmg, code, by) { for (const h of FB.hooks[where] || []) if (typeof h.hurt === 'function') { const r = h.hurt(d, dmg, code, by); if (r != null) dmg = r; } return dmg; }
function fbHookPlayers(where, P) { for (const h of FB.hooks[where] || []) if (typeof h.players === 'function') { const r = h.players(P); if (r) P = r; } return P; }
function fbOn(ev, cb) { (FB.on_[ev] || (FB.on_[ev] = [])).push(cb); }
function fbOnSold(cb) { fbOn('sold', cb); }
function fbFire(ev, ...a) { for (const cb of FB.on_[ev] || []) { try { cb(...a); } catch (e) { console.warn('fbOn ' + ev, e); } } }

// ---------- the stage plan ----------
const fbPlanNow = () => FB.plan[RAID.stage] || null;
function fbOrderFromPlan() { RAID_ORDER.length = 0; for (const p of FB.plan) RAID_ORDER.push(p.key); }
// (hosting or alone) on to a stage now: 'fbsail' (the sea, where she lies), 'fb_isle' (island i) or 'fb_port'
function fbGo(key, i) {
  if (!FB.on || ZM.net === 'client' || ZM.over || !RAID_STAGES[key]) return false;
  if (key === 'fb_port') i = 0;
  FB.plan.length = RAID.stage + 1; FB.plan.push({ key, i: i | 0 }); fbOrderFromPlan();
  raidNextStage();
  return true;
}

// ---------- the ship, between stages ----------
// a fresh cutter, lying off Saltcote's quay with her head out to sea
function fbFreshShip() { const P = FB_ISLES[0]; return { x: P.x + P.r + 34, y: P.y + 10, h: 0.55, sail: 0, holes: [], flood: 0, patched: 0 }; }
// (hosting or alone, as she anchors) her pose and her state, kept for when you're back aboard
function fbKeepShip(S) { const B = S.B; if (!B) return; FB.ship = { x: B.x, y: B.y, h: B.h, sail: B.sail, holes: S.holes.slice(), flood: S.flood, patched: S.patched | 0 }; }

// ---------- starting, and stopping ----------
// (raidBegin, with RAID.map set) is this Freebooters' Sea? Its state, fresh, and the sea
function fbBegin() {
  FB.on = RAID.map === 'fbsea';
  if (!FB.on) return;
  Object.assign(FB, { plan: [{ key: 'fbsail', i: 0 }], ship: fbFreshShip(), hold: [], gold: 0, left: {}, backT: 0, kit: null, ev: [], eseq: 0, evSeen: -1, sid: '' });
  fbOrderFromPlan();
}
// (raidAfterStart) once it's laid out and we know who's in it: the session's id, and a test's jump
function fbAfterStart() {
  FB.sid = (typeof ZN !== 'undefined' && ZM.net && ZN.g) || 'solo-' + Math.random().toString(36).slice(2, 9);
  fpsFeed('Take the wheel (Use) and sail her anywhere. Close in to an island and drop anchor to go ashore.');
  if (FB.debug) { const d = FB.debug; FB.debug = null; if (typeof RCL !== 'undefined' && RCL.picking) rclChoose(RCL.last || 'merc'); if (d.key !== 'fbsail') fbGo(d.key, d.i); }
}
function fbStop() { FB.on = false; FB.backT = 0; FB.kit = null; }

// ---------- lives ----------
// (zmDown, alone) down with nobody to get you up: bled out at once, and back on your feet in a while
function fbDownAlone() {
  if (!(typeof FB !== 'undefined' && FB.on) || ZM.net) return false;
  const m = FPS.me;
  m.hp = 0; ZM.downT = 0; ZM.ghost = true; ZM.downKit = null; m.dead = FPSC.RESPAWN; m.reload = 0; FPS.scoped = false; FPS.helm = false;
  fbBledOut(null);
  zmSound('over');
  return true;
}
// (zmBleedOut, together; fbDownAlone) back on your feet FBC.BACK seconds from now, with what you carried
function fbBledOut(kit) {
  FB.kit = kit || null; FB.backT = FBC.BACK;
  ZM.banner = { text: 'You bled out', t: 3, sub: `Back on your feet in ${FBC.BACK} seconds`, col: '#ffe2a8' };
  fpsFeed(`You bled out. You’re back on your feet in ${FBC.BACK} seconds.`);
}
// back on your feet, at the stage's start
function fbBack() {
  FB.backT = 0; if (!ZM.ghost) return;
  const m = FPS.me;
  ZM.ghost = false; ZM.downT = 0; m.dead = 0; m.hp = ZMC.HP; m.protect = 3; m.iframe = ZMC.IFRAME_UP;
  if (FB.kit) { ZM.downKit = FB.kit; FB.kit = null; zmDownDisarm(); } else raidLoadout();
  const slot = Math.max(0, ZM.hum.findIndex(h => h[0] === m.id));
  m.x = FPSC.CX + ZMD.START[0] + [0, 1.5, -1.5, 0][slot % 4]; m.y = FPSC.CY + ZMD.START[1] + [0, -1.6, -1.6, 1.8][slot % 4]; m.jz = m.fl = ZMD.TOP; m.vz = 0;
  ZM.banner = { text: 'Back on your feet', t: 2.5, small: true, col: '#ffe2a8' };
  fpsFeed('You’re back on your feet.');
  try { zmSound('wind'); } catch (e) {}
}
// (raidMe) each frame, everyone: the wait to be back on your feet
function fbMe(dt) {
  if (FB.backT > 0 && !ZM.over) { FB.backT -= dt; if (FB.backT <= 0) fbBack(); }
  if (!ZM.ghost && FB.backT > 0 && !zmIsDown()) FB.backT = 0;   // (got up, or a new stage stood you up)
}

// ---------- what happens, for everyone ----------
// (hosting or alone) a line for everyone and an event of kind k (with a, its say: heard as fbOn(k, ...a))
function fbEvent(k, text, a) {
  if (ZM.net === 'client') return;
  FB.ev.push([++FB.eseq, k, text || '', a == null ? null : a]); if (FB.ev.length > 10) FB.ev.shift();
  fbEventHere(k, text || '', a);
}
function fbEventHere(k, text, a) {
  if (text) { fpsFeed(text); if (k === 'sold' || k === 'lost') ZM.banner = { text: k === 'sold' ? 'Sold' : 'The hold is lost', t: 3, sub: text, col: '#ffd88a', small: true }; }
  if (k === 'sold') fbFire('sold', ...(Array.isArray(a) ? a : [0, [], '']));
  else if (k === 'stow') fbFire('stow', ...(Array.isArray(a) ? a : ['', '']));
  else if (k === 'lost') fbFire('lost', Array.isArray(a) ? a : []);
  else if (k === 'ashore' || k === 'aboard') fbFire(k, a | 0);
  else if (/^voy/.test(k)) fbFire(k, ...(Array.isArray(a) ? a : []));   // [fbsea voyages] 'voyage', 'voydone', 'voytake', 'voyquit': their say spread (src/fbvoy.js)
  else if (k) fbFire(k, a);
}
// (hosting or alone) the hold: one more thing in it
function fbStowKind(kind, sid) { if (ZM.net === 'client') return; FB.hold.push(kind); fbEvent('stow', `${sid && sid !== FPS.me.id ? fbNick(sid) + ' stowed' : 'Stowed'} ${fbLootOf(kind).n} in the hold.`, [kind, sid || '']); }
// (hosting or alone) the whole hold sold at the factor's table, with whatever sid has in their arms
function fbSell(sid) {
  if (ZM.net === 'client') return 0;
  const S = RAID.st, extra = (S.loot || []).filter(o => o.by === sid);
  for (const o of extra) { FB.hold.push(o.k); S.loot.splice(S.loot.indexOf(o), 1); }
  const kinds = FB.hold.slice(), sum = fbHoldValue(); if (!kinds.length) return 0;
  FB.gold += sum; FB.hold = [];
  fbEvent('sold', `The factor buys ${fbHoldWords(kinds)} for ${fbSov(sum)}. The crew’s purse: ${fbSov(FB.gold)}.`, [sum, kinds, sid || '']);
  return sum;
}
const fbNick = sid => !ZM.net ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || (sid === FPS.me.id ? 'The host' : 'Someone');

// ---------- the ship lost ----------
// (GWS_LEG.sunk, hosting or alone) she's gone down: the hold with her, and everyone washes up at Saltcote, a fresh
// cutter lying off it
function fbSunk() {
  const lost = FB.hold.slice(); FB.hold = []; FB.ship = fbFreshShip();
  fbEvent('lost', lost.length ? `She went down with ${fbHoldWords(lost)} in her hold. You wash up at Saltcote; a fresh cutter lies off the quay.` : 'She went down. You wash up at Saltcote; a fresh cutter lies off the quay.', lost);
  fbGo('fb_port', 0);
}

// ---------- playing together (src/zmnet.js) ----------
// the host's word for the session: fbw = [base (the plan's first entry sent), the plan from there ([key, i]), the ship
// ([x, y, h, sail, holes, flood, patched]), the hold, the purse, events]
function fbPack(z) {
  const base = Math.max(0, FB.plan.length - FBC.KEEP), Sh = FB.ship || fbFreshShip(), r = v => Math.round(v * 100) / 100;
  z.fbw = [base, FB.plan.slice(base).map(p => [p.key, p.i | 0]), [r(Sh.x), r(Sh.y), Math.round(Sh.h * 1e4) / 1e4, r(Sh.sail || 0), (Sh.holes || []).slice(), Math.round((Sh.flood || 0) * 1000), Sh.patched | 0],
    FB.hold.slice(), FB.gold, FB.ev, FB.sid];
  fbHooks('sail', 'packAll', z); fbHooks('isle', 'packAll', z); fbHooks('port', 'packAll', z);   // (a part's own session-wide word, whatever the stage)
}
// (raidApply, first of all) joined: the plan, so the stage number that follows lays out what the host has
function fbApply(hz) {
  const a = hz.fbw; if (!Array.isArray(a)) return;
  const base = Math.max(0, a[0] | 0);
  if (Array.isArray(a[1]) && a[1].length) {
    const tail = a[1].filter(e => Array.isArray(e) && RAID_STAGES[e[0]]).map(e => ({ key: String(e[0]), i: clamp(e[1] | 0, 0, FB_ISLES.length - 1) }));
    if (tail.length) {
      const plan = FB.plan.slice(0, base); while (plan.length < base) plan.push({ key: 'fbsail', i: 0 });
      // (what's before the base is never gone back to: kept as it was here, or the sea)
      FB.plan = plan.concat(tail);
      if (FB.plan.map(p => p.key).join() !== RAID_ORDER.join()) fbOrderFromPlan();
    }
  }
  if (Array.isArray(a[2])) { const s = a[2]; FB.ship = { x: +s[0] || 0, y: +s[1] || 0, h: +s[2] || 0, sail: +s[3] || 0, holes: Array.isArray(s[4]) ? s[4].map(v => v | 0) : [], flood: (s[5] | 0) / 1000, patched: s[6] | 0 }; }
  if (Array.isArray(a[3])) FB.hold = a[3].map(String).filter(k => FB_LOOT[k]);
  FB.gold = Math.max(0, +a[4] || 0);
  if (Array.isArray(a[5])) {
    // (the first word heard: what's already happened isn't heard again)
    if (FB.evSeen < 0) { FB.evSeen = 0; for (const e of a[5]) if (Array.isArray(e)) FB.evSeen = Math.max(FB.evSeen, e[0] | 0); }
    for (const e of a[5]) { if (!Array.isArray(e) || !((e[0] | 0) > FB.evSeen)) continue; FB.evSeen = e[0] | 0; fbEventHere(String(e[1] || ''), znClean(e[2], 200), e[3]); }
  }
  if (typeof a[6] === 'string' && a[6]) FB.sid = a[6].slice(0, 24);
  fbHooks('sail', 'applyAll', hz); fbHooks('isle', 'applyAll', hz); fbHooks('port', 'applyAll', hz);
}
// (raidReport, leaving) the session's say to the scoreboard, and what it kept: src/fbkeep.js
function fbReport() { RAID.told = true; if (typeof fbKeepReport === 'function') fbKeepReport(); }   // [fbsea keep]

// ---------- painted on top ----------
function fbHudTitle(S) { return `Freebooters’ Sea · ${S && S.n || 'the Wide Water'}`; }
// (raidHud, every stage) the crew's purse and the hold, top right; what you're carrying, low in the middle
function fbHud(phone, mono, fell) {
  const R = W - Math.max(14, FPS.safeRight || 0), y = (phone ? Math.max(10, FPS.safeTop || 0) + 70 : 118);
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  const v = fbHoldValue(), hold = FB.hold.length ? `HOLD ${FB.hold.length} · ${v.toLocaleString('en')} SOV` : 'HOLD EMPTY';
  const line1 = `PURSE ${Math.round(FB.gold).toLocaleString('en')} SOVEREIGNS`;
  ctx.font = mono(phone ? 10 : 12); const w = Math.max(ctx.measureText(line1).width, ctx.measureText(hold).width) + 16;
  ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fillRect(R - w + 6, y - 5, w, phone ? 32 : 40);
  ctx.fillStyle = '#ffd88a'; ctx.fillText(line1, R, y);
  ctx.fillStyle = FB.hold.length ? 'rgba(236,228,207,0.9)' : 'rgba(236,228,207,0.55)'; ctx.fillText(hold, R, y + (phone ? 14 : 18));
  if (!phone && FB.hold.length) { ctx.font = mono(10); ctx.fillStyle = 'rgba(236,228,207,0.55)'; ctx.fillText(fbHoldWords(), R, y + 38, W * 0.4); }
  const c = fbCarrying();
  if (c && !ZM.over) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = mono(phone ? 10 : 12); ctx.fillStyle = '#ffd88a';
    ctx.fillText(`CARRYING ${fbLootOf(c.k).n.toUpperCase()} · ${fbLootOf(c.k).v} SOV · USE TO PUT IT DOWN · THE LANDING BOAT TO STOW IT`, cx, H - (phone ? 150 : 110), W - 40);
  }
  ctx.textBaseline = 'alphabetic';
}

// ---------- what you carry ----------
// (any stage with loot: RAID.st.loot, src/fbisle.js) the item in my arms, or null
function fbCarrying() { if (!(typeof FB !== 'undefined' && FB.on) || !RAID.on) return null; const L = RAID.st && RAID.st.loot; return L ? L.find(o => o.by === FPS.me.id) || null : null; }
// (fpsShoot, vmDraw) arms full: no gun
function fbNoGun() { return !!fbCarrying() || (typeof fagManning === 'function' && fagManning()); }   // [fbsea] (or at a swivel gun: src/fbguns.js)

// ---------- for tests ----------
// fbDebug(stageKey, i): a session alone (the calling picked for you), then on to that stage: 'fbsail', 'fb_isle'
// (island i of FB_ISLES, 1 to 12) or 'fb_port' (Saltcote). In one already (alone or hosting): straight there.
function fbDebug(key, i) {
  key = key || 'fbsail'; if (key === 'fb_isle' && !(i >= 1)) i = 1;
  if (!(FPS.on && FB.on && RAID.on)) {
    if (FPS.on) return false;
    FB.debug = { key, i: i | 0 };
    zmStart({ map: 'fbsea' });
    return true;
  }
  if (ZM.net === 'client') return false;
  if (key === 'fbsail' && RAID_ORDER[RAID.stage] !== 'fbsail') return fbGo('fbsail', 0);
  return fbGo(key, i);
}

// ---------- its card on the title screen ----------
(() => {
  if (!$('fbTitle')) return;
  $('fbPlay').addEventListener('click', () => { if (typeof znSoloOk === 'function' && !znSoloOk('fb')) return; zmStart({ map: 'fbsea' }); });
  $('fbSettings').addEventListener('click', () => $('titleSettings').click());
  $('fbWcrate').addEventListener('click', () => $('wcrateBtn').click());
  $('fbOcrate').addEventListener('click', () => $('ocrateBtn').click());
  if ($('fbBanner')) $('fbBanner').addEventListener('click', () => { $('fbTitle').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('fbPlay').focus({ preventScroll: true }), 400); });
})();
