'use strict';
// Skerry Clash's rating (MMR): one number for each username, from 1000, up for a win and down for a loss by how
// likely it was (Elo). A duel online counts at K 32 against the other keeper's rating; a match against the bot counts
// at K 16 against the bot's own fixed rating (easy 800, normal 1100, hard 1300), so you have a rating alone but the
// duels online move it more. A draw is half a win, and nobody goes below 0. The board 'clash' (src/scores.js) ranks
// everyone by it: rating, wins, matches.
//
// Where it's kept. On the game's own site the server is the judge (server/scores.js postMmr): each finished match is
// sent there under your username and your board id (src/scores.js boardIdNow, made from your recovery code), and the
// answer is your new rating. The rating belongs to the username alone: play under it on any device, with any save,
// and every match moves the same rating. The page asks the server for the username's rating (rlmPull, GET
// /api/scores?mmr=<name>) when it opens, when the name changes and whenever the board's read, so a device that's
// never played under the name still shows the real one (the server's is the truth). A duel online is rated only once both
// keepers' screens have said the same thing about it (its id g, one won and one lost, or both drew), so this page
// asks again every so often until the other side's result is in. On claude.ai there's no server: your rating is
// worked out here, from the other keeper's rating as their lobby presence gave it (mr, src/rlnet.js), and written
// into your own board document with your scores (self-reported, like everything else on that board). Opened from a
// file, it's worked out here and kept on this device only.
// Leaving an online duel before its end counts as a loss (and the other keeper's screen reports the win), so walking
// off can't save a rating; a duel cut off by a lost connection isn't rated.
//
// Kept on this device under 'skerry-rival-mmr' (RLM.s: { name key: { n, r, b best, w, l, d, at last played } }, a
// few names), and in the save (src/rlcrates.js rkData's m, merged by rlmMerge: the newest of each name by at).
// Renaming yourself moves to the rating of the new name (from 1000 if it's new); the old one stays with the old name.
// The hooks: rlmReport(r, net) from rlRecord (src/rlcrates.js) and from src/rlnet.js for a duel left early; rlmMine()
// for the lobby presence; rlmEndLine() for the end card (src/rlhud.js); rlmRender() the card's line (#rlMmr);
// rlmFromBoard() when the board's read (src/scores.js); rlmDoc() the claude.ai document's part; rlmData/rlmMerge.

var RLM = { s: {}, last: null, done: new Set(), q: [], busy: false };
var RLM_R0 = 1000, RLM_BOT = { easy: 800, normal: 1100, hard: 1300 }, RLM_K = { net: 32, bot: 16 };   // (vars and function declarations: the build runs every file as one script, and src/scores.js may ask first)
function rlmKey(v) { return String(v || '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯<>&"]/g, '').trim().slice(0, 16).toLowerCase().replace(/\s+/g, ' '); }
function rlmElo(ra, rb, s, k) { return Math.max(0, Math.round(ra + k * (s - 1 / (1 + Math.pow(10, (rb - ra) / 400))))); }
// the username as it's rated (the one in the name boxes; none: not rated)
function rlmName() { const n = typeof boardNick === 'function' ? boardNick() : ''; return String(n || '').replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, 16); }
function rlmLoad() {
  try { const o = JSON.parse(localStorage.getItem('skerry-rival-mmr') || '{}'); if (o && typeof o === 'object') for (const [k, e] of Object.entries(o)) { const f = rlmFix(e); if (f && k === rlmKey(f.n)) RLM.s[k] = f; } } catch (e) {}
}
function rlmFix(e) {
  if (!e || typeof e !== 'object' || typeof e.n !== 'string' || !rlmKey(e.n)) return null;
  const n = v => Math.max(0, Math.min(99999, Math.floor(+v || 0)));
  return { n: e.n.slice(0, 16), r: n(e.r), b: Math.max(n(e.b), n(e.r)), w: n(e.w), l: n(e.l), d: n(e.d), at: Math.max(0, +e.at || 0) };
}
function rlmSave() {
  // (the eight played most lately)
  const L = Object.entries(RLM.s).sort((a, b) => b[1].at - a[1].at).slice(0, 8); RLM.s = Object.fromEntries(L);
  try { localStorage.setItem('skerry-rival-mmr', JSON.stringify(RLM.s)); } catch (e) {}
}
// yours, under the name you have now (a new name: 1000, nothing played)
function rlmCur() { const n = rlmName(), k = rlmKey(n); return k ? RLM.s[k] || { n, r: RLM_R0, b: RLM_R0, w: 0, l: 0, d: 0, at: 0, fresh: true } : null; }
function rlmMine() { const c = rlmCur(); return c ? c.r : null; }
function rlmVia() { return typeof BOARD !== 'undefined' ? BOARD.via : null; }

// ---------- a match over ----------
// r = { win, draw } as rlRecord has it; net = { g, side, opp, omr } for a duel online (src/rlnet.js rlnMmrInfo)
function rlmReport(r, net) {
  const name = rlmName(), k = rlmKey(name), cur = rlmCur();
  const res = r && r.draw ? 'd' : r && r.win ? 'w' : 'l', s = res === 'w' ? 1 : res === 'd' ? 0.5 : 0;
  if (!net && typeof RL !== 'undefined' && RL.mode === 'net') net = typeof rlnMmrInfo === 'function' ? rlnMmrInfo() : null;
  if (typeof RL !== 'undefined' && RL.mode === 'net' && !net) return;
  if (net && (RLM.done.has(net.g) || !net.opp)) return;
  if (!k) { RLM.last = { none: 1 }; rlmShow(); return; }
  if (net) RLM.done.add(net.g);
  const lvl = net ? null : (RL_BOTNM[RL.bot.lvl] ? RL.bot.lvl : 'normal'), opp = net ? (Number.isFinite(net.omr) ? net.omr : RLM_R0) : RLM_BOT[lvl];
  const nr = rlmElo(cur.r, opp, s, RLM_K[net ? 'net' : 'bot']);
  RLM.last = { d: nr - cur.r, r: nr, sure: false, net: !!net, opp: net ? net.opp : '', k };
  const via = rlmVia();
  if (via === 'server') {
    RLM.q.push({ body: { mmr: 1, name, kind: net ? 'net' : 'bot', res, lvl: lvl || undefined, g: net ? net.g : undefined, side: net ? net.side : undefined, opp: net ? net.opp : undefined, host: net ? !!net.host : undefined }, last: RLM.last, tries: 0 });
    rlmSend();
  } else {
    // (worked out here: claude.ai's board, or this device alone)
    rlmSet(k, name, nr, res); RLM.last.sure = true;
    if (via === 'claude' && typeof boardSendSoon === 'function') boardSendSoon('all');
  }
  rlmShow();
}
function rlmSet(k, name, r, res, o) {
  const e = RLM.s[k] || { n: name, r: RLM_R0, b: RLM_R0, w: 0, l: 0, d: 0, at: 0 };
  e.n = name; e.r = r; e.at = Date.now();
  if (o) { e.w = o.w | 0; e.l = o.l | 0; e.d = o.dr | 0; e.b = Math.max(o.b | 0, r); }
  else { e[res === 'w' ? 'w' : res === 'd' ? 'd' : 'l']++; e.b = Math.max(e.b, r); }
  RLM.s[k] = e; rlmSave();
}
// to the server, one at a time; a duel's asked about again until the other side is in (about eight minutes)
var RLM_WAIT = [3000, 5000, 8000, 12000, 20000, 30000, 45000, 60000, 90000, 120000, 120000];
async function rlmSend() {
  if (RLM.busy || !RLM.q.length) return;
  RLM.busy = true;
  const job = RLM.q[0], L = job.last, again = ms => { RLM.busy = false; setTimeout(rlmSend, ms); };
  let out = null, code = 0;
  try {
    const id = typeof boardIdNow === 'function' ? await boardIdNow() : null;
    if (!id) { RLM.q.shift(); L.off = 1; RLM.busy = false; rlmShow(); return; }
    const res = await fetch(boardApiUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ id }, job.body)) });
    code = res.status; out = await res.json().catch(() => ({}));
  } catch (e) { code = 0; }
  if (code === 200 && out && out.rated) {
    RLM.q.shift(); rlmSet(L.k, job.body.name, out.r | 0, job.body.res, out); Object.assign(L, { d: out.d | 0, r: out.r | 0, sure: true, wait: 0 });
    if (typeof BOARD !== 'undefined') { BOARD.lastT = 0; setTimeout(() => typeof boardFetch === 'function' && boardFetch(true), 800); }
  } else if (code === 200 && out && out.pending) {
    L.wait = 1;
    if (job.tries < RLM_WAIT.length) { RLM.q.push(RLM.q.shift()); rlmShow(); return again(RLM_WAIT[job.tries++]); }   // (to the back: a bot match after it needn't wait)
    RLM.q.shift(); L.wait = 0; L.unrated = 'never';
  } else if (code === 200) { RLM.q.shift(); L.unrated = out && out.why || 'no'; }
  else if (code === 429 && out && out.soon) { RLM.q.shift(); L.unrated = 'soon'; }
  else if ((code === 429 || code === 0 || code >= 500) && job.tries < RLM_WAIT.length) { rlmShow(); return again(Math.max(3500, RLM_WAIT[job.tries++])); }
  else { RLM.q.shift(); L.unrated = 'no'; }
  RLM.busy = false; rlmShow();
  if (RLM.q.length) setTimeout(rlmSend, 3200);
}

// ---------- what's shown ----------
function rlmSigned(d) { return (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d); }
// the end card's line: the change, and whether it's in yet
function rlmEndLine() {
  const L = RLM.last; if (!L) return '';
  if (L.none) return 'Set a username (on the scoreboard) to have a rating.';
  if (L.unrated) return L.unrated === 'never' ? `Not rated: ${L.opp || 'your rival'}’s result never came in.` : L.unrated === 'soon' ? 'Not rated: one match against the bot a minute counts.' : 'Not rated: the two results didn’t agree.';
  if (L.off) return `${rlmSigned(L.d)} MMR (on this device only)`;
  if (L.sure) return `${rlmSigned(L.d)} MMR · now ${L.r}`;
  return L.wait ? `${rlmSigned(L.d)} MMR, once ${L.opp || 'your rival'}’s result is in` : `${rlmSigned(L.d)} MMR…`;
}
function rlmShow() {
  const el = $('rlEndMmr');
  if (el) { const t = rlmEndLine(); el.textContent = t; el.hidden = !t; el.classList.toggle('up', !!RLM.last && RLM.last.d > 0 && !RLM.last.unrated); el.classList.toggle('down', !!RLM.last && RLM.last.d < 0 && !RLM.last.unrated); }
  rlmRender();
}
// the card's line, under the record
function rlmRender() {
  const el = $('rlMmr'); if (!el) return;
  const c = rlmCur(), n = c ? c.w + c.l + c.d : 0;
  el.textContent = !c ? 'Set a username on the scoreboard to have a rating (MMR).'
    : !n ? `MMR ${c.r}: no rated matches yet as ${c.n}.` : `MMR ${c.r} (best ${c.b}) · ${n} rated ${n === 1 ? 'match' : 'matches'} as ${c.n}`;
}
// the username's rating as the server has it: the truth (another device may have played under it since). Not while
// one of this page's own matches is still on its way there (its answer brings the rating anyway).
function rlmFromBoard() { rlmPull(); }
var RLM_PULL = { t: 0, k: '', busy: false, timer: 0 };
function rlmPullSoon(ms) { clearTimeout(RLM_PULL.timer); RLM_PULL.timer = setTimeout(() => rlmPull(true), ms || 900); }
async function rlmPull(force) {
  if (rlmVia() !== 'server' || RLM_PULL.busy || typeof boardApiUrl !== 'function' || !boardApiUrl()) return;
  const n = rlmName(), k = rlmKey(n); if (!k) return;
  if (!force && RLM_PULL.k === k && Date.now() - RLM_PULL.t < 20000) return;
  RLM_PULL.busy = true; RLM_PULL.k = k; RLM_PULL.t = Date.now();
  try {
    const r = await fetch(boardApiUrl() + '?mmr=' + encodeURIComponent(n), { cache: 'no-store' });
    const j = r.ok ? await r.json() : null, P = j && j.p;
    if (P && rlmKey(rlmName()) === k && !RLM.q.some(q => rlmKey(q.body.name) === k)) {
      const f = rlmFix(Object.assign({}, P, { n: (RLM.s[k] && RLM.s[k].n) || n, at: Math.max(+P.at || 0, RLM.s[k] ? RLM.s[k].at : 0) }));
      const m = RLM.s[k];
      if (f && (!m || m.r !== f.r || m.w !== f.w || m.l !== f.l || m.d !== f.d || m.b !== f.b)) { RLM.s[k] = f; rlmSave(); rlmRender(); }
    }
  } catch (e) {}
  RLM_PULL.busy = false;
}
// your part of the claude.ai board document
function rlmDoc() { const c = rlmCur(); return c && c.w + c.l + c.d > 0 ? { n: c.n, r: c.r, b: c.b, w: c.w, l: c.l, d: c.d } : null; }

// ---------- the save (src/rlcrates.js rkData / rkMerge) ----------
function rlmData() { return RLM.s; }
function rlmMerge(m) {
  if (!m || typeof m !== 'object') return false;
  let changed = false;
  for (const [k, e] of Object.entries(m)) { const f = rlmFix(e); if (f && k === rlmKey(f.n) && (!RLM.s[k] || f.at > RLM.s[k].at)) { RLM.s[k] = f; changed = true; } }
  if (changed) { rlmSave(); rlmRender(); }
  return changed;
}

(function rlmInit() {
  rlmLoad(); rlmRender();
  // (the name boxes: the line follows the username as it's typed)
  for (const id of typeof NICK_BOXES !== 'undefined' ? NICK_BOXES : []) { const el = $(id); if (el) el.addEventListener('input', () => { setTimeout(rlmRender, 0); rlmPullSoon(); }); }
  setTimeout(() => rlmPull(true), 2500);   // (once the board knows where it lives)
})();
