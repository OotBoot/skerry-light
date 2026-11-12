// Freebooters' Sea: what you keep (the design, "What you keep"). Like Fog Run's (src/frkeep.js), nothing in here
// touches the ship or the session itself: it watches from outside (every half second, fbKeepTick, and as the factor
// pays, fbOn('sold')) and settles up as it goes and once more when you leave.
//  - Sovereigns. The crew's purse (FB.gold, what the factor has paid this session, src/fbsea.js fbSell) is the whole
//    crew's: each of you keeps all of it. What's new in it since last counted goes on your total in all; the most in
//    one session is your best. Counted on every screen, host or joined, from the session's own record (FBK.r, kept by
//    the session's id, FB.sid), so a joined player who drops out and comes back carries on from where they were and
//    nothing is counted twice.
//  - Company standings. Each voyage done (fbOn('voydone', {company}), or fbOn('voyage', {company}) with nothing in it
//    to say it's only begun: from the voyages part, src/fbvoy*.js; if neither ever fires, nothing here breaks) pays
//    its company's standing: Gilt & Gull Company (hoard charts), the Bellmen (bounties), the Tidewrights (salvage).
//    A standing's level, 1 to 10, is from the voyages done for it in all (FBKC.LV: 1, 3, 6, 10... for levels 2 to 10).
//    The company may come as its key ('gilt', 'bell', 'tide'), its name, or the voyage's kind ('hoard', 'bounty',
//    'salvage'); a voyage with an id is counted once however many times it's heard.
//  - Crates, paid as they're earned: a crate for every FBKC.PER sovereigns in the session's purse, weapon and outfit in
//    turn (a weapon crate first: src/wcrates.js wcGrant, src/ocrates.js ocGrant), and a pirate token (src/zmegg.js
//    ptGrant) for each company level gained. What a session has paid is in its record, so leaving and rejoining never
//    pays twice; levels are counted from your standings, so they're never paid twice either (and a save merged in from
//    another device, whose levels were paid there, pays nothing here).
//  - The scoreboard, game 'fbsea' (src/scores.js BOARD.games, server/scores.js GAMES). Each session is an entry:
//      s: sovereigns banked in it    b: voyages done in it    c: sovereigns in all (yours, as it stood)
//    and your bests: the best session, the most voyages in one, and all you've banked. Logged as it goes and once more
//    as you leave (src/fbsea.js fbReport, from raidReport). There's no end to a session but leaving it, so leaving is
//    playing it to its end: no asterisk. Rejoining the same session carries on its entry (FBK.r.rid), not a new one.
//  - Kept in this browser (localStorage 'skerry-fbkeep') and in the one save (src/crates.js saveData `fb`, the save
//    code's `v`), merged by taking the larger of each number.
//  - Shown on the card (#fbKeep: in all, best, standings, last time) and in the pause menu (#fbMenuKeep: this
//    session's purse and the next crate, in all, the three standings with their levels).
// Playing together, a little more (as the design's "co-op robustness"):
//  - Rejoin (src/rejoin.js, through src/zmnet.js znRjSnap/znRjAfter, marked [fbsea]): your own part of it comes back
//    with you: the session's id, what was in your arms (asked for again if the host's word has it lying loose), and,
//    if you'd bled out, the wait to be back on your feet (without it you'd stay a ghost). The host keeps the ship, the
//    hold and the purse, and they come in its word as ever.
//  - (hosting) whatever's in the arms of someone who's left (gone from the crew's word 15 s, src/zmnet.js r.left) is
//    put down at the landing, so it isn't lost with them; if they rejoin, it's theirs to pick up again.
// Hooks in shared files, marked [fbsea]: src/fbsea.js (fbReport), src/scores.js (BOARD.games.fbsea, the board's
// third number formatted), server/scores.js (GAMES.fbsea), src/crates.js (saveData, mergeSave, the save code),
// src/zmnet.js (the rejoin snap), index.html (the pause menu's #fbMenuKeep).

// FBKC: a crate for every PER sovereigns in a session; LV, voyages in all for each level (level 1 at none, 10 at 45)
const FBKC = { PER: 1000, LV: [0, 1, 3, 6, 10, 15, 21, 28, 36, 45], KEY: 'skerry-fbkeep' };
var FB_COMPANIES = [
  { k: 'gilt', n: 'Gilt & Gull Company', s: 'Gilt & Gull', for: 'hoard charts', re: /gilt|gull|hoard|chart|dig/i },
  { k: 'bell', n: 'the Bellmen', s: 'Bellmen', for: 'bounties', re: /bell|bount|captain/i },
  { k: 'tide', n: 'the Tidewrights', s: 'Tidewrights', for: 'salvage', re: /tide|salv|wreck|dive/i },
];
// tot: sovereigns in all; best: the most in one session; voy: voyages in all; co: voyages for each company;
// r: this session's record { sid, g: gold counted, c: crates paid, v: voyages, t: tokens paid, ids: voyage ids, rid:
// its board entry }; last: what the last session left you with (the card); live: the session counted is under way
var FBK = { tot: 0, best: 0, voy: 0, co: { gilt: 0, bell: 0, tide: 0 }, r: null, last: null, live: '', want: null, lastV: [0, ''] };
const fbkNum = (v, max) => Math.max(0, Math.min(max || 1e9, Math.floor(+v || 0)));
function fbKeepLoad() {
  let o = {}; try { o = JSON.parse(localStorage.getItem(FBKC.KEY) || '{}') || {}; } catch (e) {}
  FBK.tot = fbkNum(o.tot); FBK.best = fbkNum(o.best); FBK.voy = fbkNum(o.voy, 1e6);
  for (const C of FB_COMPANIES) FBK.co[C.k] = fbkNum(o.co && o.co[C.k], 1e6);
  const r = o.r; if (r && typeof r === 'object' && typeof r.sid === 'string') FBK.r = { sid: r.sid.slice(0, 24), g: fbkNum(r.g), c: fbkNum(r.c, 1e6), v: fbkNum(r.v, 1e4), t: fbkNum(r.t, 100), ids: Array.isArray(r.ids) ? r.ids.map(String).slice(-40) : [], rid: typeof r.rid === 'string' ? r.rid.slice(0, 24) : '' };
  if (o.last && typeof o.last === 'object') FBK.last = { g: fbkNum(o.last.g), v: fbkNum(o.last.v, 1e4), c: fbkNum(o.last.c, 1e6), t: fbkNum(o.last.t, 100) };
}
function fbKeepSave() {
  try { localStorage.setItem(FBKC.KEY, JSON.stringify({ tot: FBK.tot, best: FBK.best, voy: FBK.voy, co: FBK.co, r: FBK.r, last: FBK.last })); } catch (e) {}
  if (typeof cloudSaveSoon === 'function') try { cloudSaveSoon(); } catch (e) {}
  if (typeof renderBackupDot === 'function') try { renderBackupDot(); } catch (e) {}
}
// for the one save (src/crates.js): what's here, and another save folded in (the larger of each)
function fbData() { return FBK.tot + FBK.voy > 0 ? { t: FBK.tot, b: FBK.best, v: FBK.voy, co: FB_COMPANIES.map(C => FBK.co[C.k]) } : undefined; }
function fbMerge(d) {
  if (!d || typeof d !== 'object') return false;
  let ch = false; const up = (k, v) => { if (v > FBK[k]) { FBK[k] = v; ch = true; } };
  up('tot', fbkNum(d.t)); up('best', fbkNum(d.b)); up('voy', fbkNum(d.v, 1e6));
  // (levels gained there were paid there: raising the count here pays nothing)
  if (Array.isArray(d.co)) FB_COMPANIES.forEach((C, i) => { const v = fbkNum(d.co[i], 1e6); if (v > FBK.co[C.k]) { FBK.co[C.k] = v; ch = true; } });
  if (ch) { fbKeepSave(); fbKeepRender(); }
  return ch;
}

// ---------- standings ----------
function fbLevel(n) { let l = 0; for (const a of FBKC.LV) if (n >= a) l++; return Math.max(1, l); }
const fbLevelNext = n => FBKC.LV.find(a => a > n) || 0;
const fbCompany = k => FB_COMPANIES.find(C => C.k === k) || null;
// which company a voyage's word means: its key, its name, or its kind
function fbCompanyOf(v) {
  if (v == null) return null;
  if (typeof v === 'number') return FB_COMPANIES[v] || null;
  const s = String(v); return fbCompany(s) || FB_COMPANIES.find(C => C.re.test(s)) || null;
}
function fbStandings() { return FB_COMPANIES.map(C => { const n = FBK.co[C.k], l = fbLevel(n), nx = fbLevelNext(n); return { k: C.k, n: C.n, s: C.s, done: n, lv: l, next: nx ? nx - n : 0 }; }); }

// ---------- this session's record ----------
const fbkSid = () => typeof FB !== 'undefined' && FB.on ? String(FB.sid || '') : '';
// (counting can start: in a session, and if joined, once the host's word has been heard)
const fbkReady = () => typeof FB !== 'undefined' && FB.on && typeof RAID !== 'undefined' && RAID.on && RAID.map === 'fbsea' && !!fbkSid() && (ZM.net !== 'client' || FB.evSeen >= 0);
function fbkRec() {
  const sid = fbkSid();
  if (!FBK.r || FBK.r.sid !== sid) FBK.r = { sid, g: 0, c: 0, v: 0, t: 0, ids: [], rid: '' };
  return FBK.r;
}
// a session begun here (or come back to): its board entry, carried on if it's the same session's
function fbkStart() {
  const r = fbkRec(); FBK.live = r.sid;
  if (typeof BOARD === 'undefined' || !BOARD.runs || !BOARD.runs.fbsea) return;
  const L = BOARD.runs.fbsea, cur = BOARD.cur.fbsea, old = r.rid && L.find(x => x.r === r.rid);
  if (old && cur !== r.rid) {
    // (the entry just begun for it is empty: let it go, and carry on the old one)
    const i = L.findIndex(x => x.r === cur && !(x.s + x.b + (x.c | 0)));
    if (i >= 0) L.splice(i, 1);
    BOARD.cur.fbsea = r.rid; if (typeof runsSave === 'function') runsSave();
  } else if (!old) r.rid = cur || '';
  fbKeepSave();
}

// ---------- counting, as it goes ----------
function fbKeepTick() {
  if (!fbkReady()) { if (FBK.live && !(typeof FB !== 'undefined' && FB.on)) FBK.live = ''; fbMenuKeepRender(); return; }
  if (FBK.live !== fbkSid()) fbkStart();
  const r = fbkRec(), gold = fbkNum(FB.gold);
  if (gold > r.g) {
    const add = gold - r.g; r.g = gold;
    FBK.tot = Math.min(1e9, FBK.tot + add); FBK.best = Math.max(FBK.best, gold);
    fbkPay(); fbkBoard(); fbKeepSave(); fbKeepRender();
  }
  if (FBK.want) fbkWant();
  fbMenuKeepRender();
}
// the crates the session's purse has earned and not yet been paid
function fbkPay() {
  const r = fbkRec(), due = Math.floor(r.g / FBKC.PER), n = Math.max(0, Math.min(50, due - r.c)); if (!n) return;
  let w = 0, o = 0; for (let k = r.c; k < r.c + n; k++) { if (k % 2 === 0) w++; else o++; }
  r.c = due; fbKeepSave();
  const why = `${fbSov(r.g)} banked on the Wide Water`;
  if (w && typeof wcGrant === 'function') wcGrant(w, why);
  if (o && typeof ocGrant === 'function') ocGrant(o, why);
}
// the board, as the session stands
function fbkBoard(done) {
  const r = fbkRec();
  if (typeof scoreReport === 'function') scoreReport('fbsea', r.g, r.v, FBK.tot, done);
  if (typeof scoreRun === 'function') scoreRun('fbsea', r.g, r.v, FBK.tot, done);
}
// a voyage done (maybe: it was the 'voyage' event, which may be one only begun)
function fbkVoyage(p, maybe) {
  if (!fbkReady()) return;
  if (FBK.live !== fbkSid()) fbkStart();
  const o = p && typeof p === 'object' ? p : { company: p };
  if (maybe) {
    const st = [o.state, o.status, o.phase, o.ev, o.what, o.step].find(v => v != null);
    if (o.done === false || o.ok === false || (st != null && !/done|paid|complete|finish|end|won|clear|deliver/i.test(String(st)))) return;
  }
  const r = fbkRec(), C = fbCompanyOf([o.company, o.co, o.c, o.who, o.kind, o.k, o.type].find(v => v != null)), id = o.id != null ? String(o.id).slice(0, 40) : '', now = performance.now();
  // (heard once: by its id, or without one, the same company's twice within a moment is the one voyage)
  if (id ? r.ids.includes(id) : FBK.lastV[1] === (C ? C.k : '-') && now - FBK.lastV[0] < 1500) return;
  if (id) { r.ids.push(id); if (r.ids.length > 40) r.ids.shift(); }
  FBK.lastV = [now, C ? C.k : '-'];
  r.v = Math.min(1e4, r.v + 1); if (typeof o.n === 'number' && o.n > r.v && o.n < 1e4) r.v = Math.floor(o.n);
  FBK.voy = Math.min(1e6, FBK.voy + 1);
  if (C) {
    const was = fbLevel(FBK.co[C.k]); FBK.co[C.k] = Math.min(1e6, FBK.co[C.k] + 1); const now2 = fbLevel(FBK.co[C.k]);
    if (now2 > was) {
      for (let k = was; k < now2; k++) if (typeof ptGrant === 'function') ptGrant();
      r.t = Math.min(100, r.t + now2 - was);
      const line = `${C.n[0].toUpperCase() + C.n.slice(1)}: your standing is now ${now2}. +1 pirate token`;
      if (typeof fpsFeed === 'function') fpsFeed(line + ' (spend it on the Keeper’s Last Light card).');
      if (typeof ZM !== 'undefined') ZM.banner = { text: `${C.s} · standing ${now2}`, t: 3.5, sub: '+1 pirate token', col: '#ffd88a', small: true };
    } else if (typeof fpsFeed === 'function') { const nx = fbLevelNext(FBK.co[C.k]); fpsFeed(`${C.n[0].toUpperCase() + C.n.slice(1)}: ${FBK.co[C.k]} ${FBK.co[C.k] === 1 ? 'voyage' : 'voyages'} done${nx ? `, ${nx - FBK.co[C.k]} more to standing ${now2 + 1}` : ''}.`); }
  }
  fbkBoard(); fbKeepSave(); fbKeepRender(); fbMenuKeepRender();
}
fbOn('voydone', (kind, co, rw, t) => fbkVoyage({ company: co, kind }, false));   // (src/fbvoy.js: its say spread, kind, company, reward, tier)
fbOn('sold', () => setTimeout(fbKeepTick, 0));   // (FB.gold is up by the time it's heard: the purse's paid at once)

// (src/fbsea.js fbReport: leaving the session, or the page closing on it) counted once more, the board, the card
function fbKeepReport() {
  if (!fbkReady()) { FBK.live = ''; return; }
  if (FBK.live !== fbkSid()) fbkStart();
  fbKeepTick();
  const r = fbkRec();
  fbkBoard(true);
  if (typeof scoreRunEnd === 'function') scoreRunEnd('fbsea');
  FBK.last = { g: r.g, v: r.v, c: r.c, t: r.t }; FBK.live = '';
  fbKeepSave(); fbKeepRender();
}

// ---------- rejoining (src/zmnet.js znRjSnap, znRjAfter) ----------
// my own part of the session, kept with the rejoin note: its id, what's in my arms, my wait to be back on my feet
function fbRjSnap() {
  if (typeof FB === 'undefined' || !FB.on) return null;
  const c = typeof fbCarrying === 'function' ? fbCarrying() : null, cp = o => o && typeof o === 'object' ? JSON.parse(JSON.stringify(o)) : null;
  return { sid: FB.sid, st: RAID.stage, c: c ? [c.id, c.k] : null, back: FB.backT > 0 ? Math.ceil(FB.backT) : 0, kit: cp(FB.kit) };
}
function fbRjAfter(s) {
  if (typeof FB === 'undefined' || !FB.on || !s || typeof s !== 'object') return;
  if (typeof s.sid === 'string' && s.sid && !FB.sid) FB.sid = s.sid.slice(0, 24);
  // (bled out when I went: back on my feet in the time that was left, or I'd stay a ghost)
  if (ZM.ghost) { FB.backT = Math.max(1, Math.min(FBC.BACK, +s.back || FBC.BACK)); if (s.kit && Array.isArray(s.kit.own)) FB.kit = s.kit; }
  if (Array.isArray(s.c) && s.c[0] != null && (s.st | 0) === RAID.stage) FBK.want = { id: String(s.c[0]), until: performance.now() + 12000 };
}
// what was in my arms: whenever the host's word has it lying loose in the first few seconds back (put down at the
// landing while I was gone, or dropped as I came back in before I was on my feet), it's mine again
function fbkWant() {
  const W = FBK.want, S = RAID.st, L = S && S.loot, now = performance.now(); if (!W) return;
  if (now > W.until) { FBK.want = null; return; }
  if (!L || now < (W.next || 0) || (typeof fbiAble === 'function' && !fbiAble())) return;
  const q = L.find(o => o.id === W.id); if (!q || q.by) return;
  if (typeof fbCarrying === 'function' && fbCarrying()) { FBK.want = null; return; }
  raidAsk('carry', q.id); if (ZM.net === 'client') { q.by = FPS.me.id; S.pend = 0.9; S.pendId = q.id; }
  W.next = now + 1500; if (!W.said) { W.said = 1; fpsFeed(`You have ${fbLootOf(q.k).n} again.`); }
}
// (hosting) what's in the arms of someone who's left is put down at the landing
const fbkLeftHands = {
  me() { if (FBK.want) fbkWant(); },
  tick() {
    if (ZM.net !== 'host') return;
    const S = RAID.st, L = S && S.loot; if (!L || typeof FBI === 'undefined') return;
    for (const o of L) {
      if (!o.by || o.by === FPS.me.id) continue;
      const r = FPS.remote.get(o.by); if (r && !r.left) continue;
      const [x, y] = FBI.land(), a = (o.id.length * 1.3) % 6.28, who = fbNick(o.by);
      o.by = ''; o.x = x + Math.cos(a) * 1.6; o.y = y + Math.sin(a) * 1.6;
      if (typeof fbIsleSay === 'function') fbIsleSay(`${who} has gone: ${fbLootOf(o.k).n} is left at the landing.`);
    }
  },
};
fbHook('isle', fbkLeftHands); fbHook('port', fbkLeftHands);

// ---------- on the card, and in the pause menu ----------
const fbkCrates = c => { const w = Math.ceil(c / 2), o = Math.floor(c / 2), p = (n, one, many) => `${n} ${n === 1 ? one : many}`, b = []; if (w) b.push(p(w, 'weapon crate', 'weapon crates')); if (o) b.push(p(o, 'outfit crate', 'outfit crates')); return b.join(' and '); };
function fbKeepRender() {
  const el = $('fbKeep'); if (!el) return;
  const st = fbStandings().map(s => `${s.s} ${s.lv}`).join(' · ');
  if (!FBK.tot && !FBK.voy) { el.textContent = `Nothing banked yet. Every ${FBKC.PER.toLocaleString('en')} sovereigns sold in a session pays a weapon or outfit crate; each company standing gained, a pirate token.`; el.title = ''; return; }
  const L = FBK.last, lt = L && (L.g || L.v) ? ` Last time: ${fbSov(L.g)}${L.v ? `, ${L.v} ${L.v === 1 ? 'voyage' : 'voyages'}` : ''}${L.c ? ', ' + fbkCrates(L.c) : ''}.` : '';
  el.textContent = `Banked: ${fbSov(FBK.tot)} in all, ${FBK.best.toLocaleString('en')} your best session. Standing: ${st}.` + lt;
  el.title = fbStandings().map(s => `${s.n[0].toUpperCase() + s.n.slice(1)}: standing ${s.lv}, ${s.done} ${s.done === 1 ? 'voyage' : 'voyages'} done${s.next ? `, ${s.next} more to ${s.lv + 1}` : ''}`).join('\n');
}
var FBK_MENU = '';
function fbMenuKeepRender() {
  const el = $('fbMenuKeep'); if (!el) return;
  const on = typeof FB !== 'undefined' && FB.on && typeof FPS !== 'undefined' && FPS.menu;
  if (el.hidden !== !on) el.hidden = !on;
  if (!on) return;
  if ($('fpsLeave').textContent !== 'Leave the Wide Water') { $('fpsLeave').textContent = 'Leave the Wide Water'; $('fpsResume').textContent = 'Back to the sea'; }   // (the raid's words, otherwise)
  const r = FBK.r && FBK.r.sid === fbkSid() ? FBK.r : { g: 0, c: 0, v: 0 }, gold = Math.max(fbkNum(FB.gold), r.g), nx = (Math.floor(gold / FBKC.PER) + 1) * FBKC.PER;
  const key = [gold, r.c, r.v, FBK.tot, FBK.best, FBK.voy, FB.hold.length].join();
  if (key === FBK_MENU) return; FBK_MENU = key;
  el.textContent = '';
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  el.append(mk('p', 'fbmk-purse', `The crew’s purse: ${fbSov(gold)} this session${r.v ? `, ${r.v} ${r.v === 1 ? 'voyage' : 'voyages'} done` : ''}. The next crate at ${nx.toLocaleString('en')}${r.c ? ` (${fbkCrates(r.c)} so far)` : ''}.`));
  el.append(mk('p', 'fbmk-all', `In all: ${fbSov(FBK.tot)} banked, ${FBK.best.toLocaleString('en')} your best session${FB.hold.length ? `. In the hold, unsold: ${fbSov(fbHoldValue())}` : ''}.`));
  const ul = mk('ul', 'fbmk-co'); ul.setAttribute('aria-label', 'Company standings');
  for (const s of fbStandings()) {
    const li = mk('li'), C = fbCompany(s.k);
    li.append(mk('b', '', s.n[0].toUpperCase() + s.n.slice(1)), mk('span', 'fbmk-lv', `standing ${s.lv}`));
    const bar = mk('span', 'fbmk-bar'); bar.setAttribute('aria-hidden', 'true'); for (let k = 1; k <= 10; k++) bar.append(mk('i', k <= s.lv ? 'on' : ''));
    li.append(bar, mk('small', '', `${C.for} · ${s.done} done${s.next ? ` · ${s.next} more to ${s.lv + 1}` : ' · the highest'}`));
    ul.append(li);
  }
  el.append(ul);
}

fbKeepLoad();
fbKeepRender();
setInterval(fbKeepTick, 500);
