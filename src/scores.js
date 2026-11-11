// The scoreboard: every game everyone plays, in all five modes, kept where the game is hosted.
//
// Each game you play is an entry of its own (a run of Skerry Light, a round of Wreckers' Night, a war, a night at the
// Lighthouse, a raid down Maren's End), logged by itself as it goes and once more at its end, so you can be on a board
// many times. A game left or lost before its end keeps what it got to, with a yellow asterisk by the name. Each board
// shows its top ten, and All for everyone (the server shows at most 25 of one player's). The per-game numbers:
//   skerry  s: voyages made in the run      b: close shaves          (ends when the boat's lost, or ashore from harbour)
//   fps     s: kills in the round           b: 1 if you won it       (ends when the round does)
//   war     s: 1 if won                     b: land taken (tiles)    (ends won or lost)
//   zm      s: rounds held in the night     b: kills                 (ends when the Lighthouse falls)
//   raid    s: time through (100000 less its seconds; 0: not through)    b: damage to its bosses    c: kills
//          (ends through the door; going down before it is incomplete)
//   fogrun  s: the furthest island reached   b: time through, as raid (0: not won)   c: islands lit   (src/frkeep.js;
//          ends won, lost in the fog or sunk; left before then is incomplete)
// Your own games are kept on this device too (`skerry-runs`, your best 25 of each and the one under way).
//
// Below, from before: your bests, kept in your save (they're no longer what the board shows, but the boards from
// before showed them, and those entries are still read, each as one game).
//
// On claude.ai the artifact keeps it in its own shared database (a document per player under `scores/`, each
// written only by its player, read by everyone; names are shown as each viewer's claude.ai sees them).
// On your own site the server keeps it (server/scores.js, in a free Upstash Redis). Either way, this browser
// also remembers your bests, and only ever sends them upward.
//
// What counts, per game (s is what the board ranks by, b breaks ties and is shown beside it):
//   skerry  s: most voyages made in one run        b: voyages made in all
//   fps     s: most kills in one round             b: rounds won
//   war     s: wars won                            b: most land taken in one war (tiles)
//   zm      s: most rounds held in one night        b: most kills in one night (the Lighthouse)
//   raid    s: best time through Maren's End (kept as 100000 less its seconds, so higher is better; 0: never through)
//           b: most damage done to its bosses in one raid    c: the drowned sent back in all raids, together
//   fogrun  s: the furthest island reached    b: the fastest won run (as raid)    c: islands lit in all runs
// And two marks: p, you've played it; f, you've finished a game of it (a voyage to harbour, a round of Wreckers'
// Night to its end, a war to its end, a night at the Lighthouse until it fell, Maren's End to the door). A game left
// or lost before its end still counts what it got to; until one's finished, your name has a yellow asterisk by it.
// (bests from before the marks: finished, except Maren's End with no time, which never was)
//
// Your bests are part of your save (src/crates.js saveData: `best`, merged by taking the higher of each), so they
// follow your recovery code (src/cloudsave.js) to every device, and on the game's own site you're on the board once,
// under an id made from that code (not the code itself): a browser's own entry from before moves across to it.
// Your name on the board is your username: one name for every game, kept on this device (and in your save), typed
// in any of the name boxes (the board's, the crew's, Wreckers' Night's, the Lighthouse's) and filled into the rest.

const BOARD = {
  games: {
    skerry: { name: 'Skerry Light', s: 'Voyages', b: 'Close shaves', what: 'Each run: the voyages made before the boat was lost, and its close shaves.' },
    fps: { name: 'Wreckers’ Night', s: 'Kills', b: 'Round', what: 'Each round of Wreckers’ Night: your kills, and whether you won it.', fb: v => v > 0 ? 'Won' : '—' },
    war: { name: 'Drowned Reach', s: 'Result', b: 'Land', what: 'Each war of the Drowned Reach: won or not, and the land taken.', fs: v => v > 0 ? 'Won' : '—', fb: v => `${v} tiles` },
    zm: { name: 'Keeper’s Last Light', s: 'Rounds held', b: 'Kills', what: 'Each night at the Lighthouse: the rounds held, and the drowned sent back.' },
    raid: { name: 'Maren’s End', s: 'Time', b: 'Boss damage', c: 'Kills', what: 'Each raid down Maren’s End: the time through, the damage done to its bosses, and the drowned sent back.',
      fs: v => v > 0 ? raidTimeOf(v) : '—' },
    gannet: { name: 'The Gannet’s Wake', s: 'Time', b: 'Boss damage', c: 'Kills', what: 'Each raid out to the Gannet: the time through, the damage done to its bosses, and the drowned sent back.',
      fs: v => v > 0 ? raidTimeOf(v) : '—' },
    // [fogrun] src/frkeep.js
    fogrun: { name: 'Fog Run', s: 'Furthest', b: 'Time', c: 'Lit', what: 'Each fog run: the furthest island reached, the time through if it was won, and the islands lit.',
      fs: v => v > 0 ? 'Island ' + v : '—', fb: v => v > 0 ? raidTimeOf(v) : '—' },
  },
  open: {}, mine: null, via: null, db: null, user: null, uid: null, data: null, loading: false, err: '', lastT: 0, sendT: 0, store: '',
};

// ---------- your games: each one an entry on the board ----------
// BOARD.runs[game]: [{ r: its id, s, b, c, f: played to its end, at, u: not yet on the board }]; BOARD.cur[game]: the
// id of the one under way
function runsLoad() {
  let o = {}; try { o = JSON.parse(localStorage.getItem('skerry-runs') || '{}') || {}; } catch (e) {}
  BOARD.runs = {}; BOARD.cur = {};
  for (const g of Object.keys(BOARD.games)) BOARD.runs[g] = Array.isArray(o[g]) ? o[g].filter(r => r && typeof r.r === 'string') : [];
}
const runKey = r => (r.s | 0) * 1e9 + (r.b | 0) + (r.c | 0) * 1e-3;
function runsSave() {
  for (const g of Object.keys(BOARD.games)) {
    // your best 25, the one under way, and any not on the board yet
    const L = BOARD.runs[g].slice().sort((a, b) => runKey(b) - runKey(a));
    BOARD.runs[g] = L.filter((r, k) => k < 25 || r.r === BOARD.cur[g] || r.u);
  }
  try { localStorage.setItem('skerry-runs', JSON.stringify(BOARD.runs)); } catch (e) {}
}
// a game begun: a new entry, from nothing
function scoreRunStart(game) {
  if (!BOARD.runs || !BOARD.runs[game]) return;
  let r = ''; while (r.length < 12) r += Math.random().toString(36).slice(2); r = r.slice(0, 12);
  BOARD.runs[game].push({ r, s: 0, b: 0, c: 0, f: 0, at: Date.now() }); BOARD.cur[game] = r; runsSave();
}
// the game under way, as it stands (each number only goes up; done: played to its end, so no asterisk)
function scoreRun(game, s, b, c, done) {
  if (!BOARD.runs || !BOARD.runs[game]) return;
  if (!BOARD.cur[game]) return;   // (none under way: each mode begins one with scorePlayed)
  const r = BOARD.runs[game].find(x => x.r === BOARD.cur[game]); if (!r) return;
  s = Math.max(r.s, Math.floor(s || 0)); b = Math.max(r.b, Math.floor(b || 0)); c = Math.max(r.c | 0, Math.floor(c || 0));
  if (s === r.s && b === r.b && c === (r.c | 0) && (r.f || !done)) return;
  Object.assign(r, { s, b, c, at: Date.now(), u: 1 }); if (done) r.f = 1; runsSave();
  boardSendSoon(game);
}
// that game's over: the next one's a new entry
function scoreRunEnd(game) { if (BOARD.cur) BOARD.cur[game] = null; }

// ---------- your bests, here ----------
function boardLoadMine() {
  let m = {}; try { m = JSON.parse(localStorage.getItem('skerry-bests') || '{}') || {}; } catch (e) {}
  for (const g of Object.keys(BOARD.games)) {
    const o = m[g] || {};
    m[g] = { s: Math.max(0, o.s | 0), b: Math.max(0, o.b | 0) }; if (BOARD.games[g].c) m[g].c = Math.max(0, (o.c | 0) || 0);
    const any = m[g].s + m[g].b + (m[g].c | 0) > 0;
    m[g].p = o.p || any ? 1 : 0; m[g].f = 'f' in o ? (o.f ? 1 : 0) : boardOldF(g, m[g]);
  }
  // bests from before there was a board
  try { m.skerry.s = Math.max(m.skerry.s, parseInt(localStorage.getItem('skerry-helm-best') || '0', 10) || 0); } catch (e) {}
  if (typeof warLoadStats === 'function') { const st = warLoadStats(); m.war.s = Math.max(m.war.s, st.wins | 0); m.war.b = Math.max(m.war.b, st.bestTiles | 0); }
  return m;
}
// an entry from before the marks: finished, if it has anything, but Maren's End only with a time
function boardOldF(g, e) { return (g === 'raid' || g === 'gannet' ? e.s | 0 : (e.s | 0) + (e.b | 0) + (e.c | 0)) > 0 ? 1 : 0; }
// a best from before games were kept, as one game (as server/scores.js oldAsRun)
function boardOldRun(g, e, f) { const r = { s: e.s | 0, b: e.b | 0, c: e.c | 0, f }; if (g === 'skerry' || g === 'fps') r.b = 0; if (g === 'war') r.s = r.s > 0 ? 1 : 0; return r; }
// a claude.ai board document's finished mark for a game (one from before the marks: as boardOldF)
function boardDocF(d, g) { return g + '_f' in d ? (d[g + '_f'] ? 1 : 0) : boardOldF(g, { s: d[g + '_s'], b: d[g + '_b'], c: d[g + '_c'] }); }
function boardSaveMine() { try { localStorage.setItem('skerry-bests', JSON.stringify(BOARD.mine)); } catch (e) {} }
// (your bests still go into your save, but the board is your games now)
// a new best (either number) goes on the board soon after
// (c: a third number, for a game that has one: Maren's End's kills in all; done: a game of it played to its end)
function scoreReport(game, s, b, c, done) {
  const m = BOARD.mine && BOARD.mine[game]; if (!m) return;
  s = Math.max(0, Math.floor(s || 0)); b = Math.max(0, Math.floor(b || 0)); c = Math.max(0, Math.floor(c || 0));
  if (s <= m.s && b <= m.b && c <= (m.c | 0) && m.p && (m.f || !done)) return;
  m.s = Math.max(m.s, s); m.b = Math.max(m.b, b); if (BOARD.games[game].c) m.c = Math.max(m.c | 0, c); m.p = 1; if (done) m.f = 1; boardSaveMine();
}
// Skerry Light: a voyage made, and how many this run has made
function scoreVoyage(runVoyages) { const m = BOARD.mine && BOARD.mine.skerry; if (!m) return; scoreReport('skerry', runVoyages, m.b + 1, 0, true); }
// a game begun: you're on its board from now, with an asterisk until you finish one
function scorePlayed(game) { scoreReport(game, 0, 0, 0); scoreRunStart(game); }
// leaving a game before its end (or the page closing on one): what it got to so far counts
function scoreLeaving() {
  try {
    if (typeof FPS !== 'undefined' && FPS.on && !FPS.zm) { const mine = fpsScores().find(p => p.me); if (mine) { scoreReport('fps', mine.k, 0); scoreRun('fps', mine.k, 0); } scoreRunEnd('fps'); }
    if (typeof ZM !== 'undefined' && ZM.on && !ZM.over) {
      if (typeof RAID !== 'undefined' && RAID.on) { if (typeof raidReport === 'function') raidReport(); }
      else { scoreReport('zm', Math.max(0, ZM.round - 1), ZM.kills); scoreRun('zm', Math.max(0, ZM.round - 1), ZM.kills); scoreRunEnd('zm'); }
    }
    if (typeof WAR !== 'undefined' && WAR.on && WAR.phase === 'play' && !WAR.result && WAR.nations && WAR.nations[WAR.me]) { const st = warLoadStats(), t = WAR.nations[WAR.me].taken | 0; scoreReport('war', st.wins || 0, Math.max(st.bestTiles || 0, t)); scoreRun('war', 0, t); scoreRunEnd('war'); }
    if (typeof run !== 'undefined' && typeof state !== 'undefined' && state === 'play' && run) scoreRun('skerry', run.voyages, run.shaves || 0);
  } catch (e) {}
}
addEventListener('pagehide', scoreLeaving);   // (kept here, and sent next time if it can't go now)
function boardId() {
  try { let id = localStorage.getItem('skerry-pid'); if (!id || !/^[a-z0-9]{12,40}$/.test(id)) { id = ''; while (id.length < 20) id += Math.random().toString(36).slice(2); id = id.slice(0, 20); localStorage.setItem('skerry-pid', id); } return id; }
  catch (e) { return null; }
}
function boardName() {
  const v = (typeof NET !== 'undefined' && NET.nick) || ($('warNick') && $('warNick').value) || '';
  return String(v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, 16) || 'A sailor';
}

// ---------- your username: one for every game, kept on this device ----------
const NICK_BOXES = ['nick', 'fpsNick', 'zmNick', 'rdNick', 'boardName'];
// Maren's End's best time, from its s (100000 less the seconds)
function raidTimeOf(v) { const t = Math.max(0, 100000 - v); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
function nickSet(v, from) {
  const n = typeof cleanNick === 'function' ? cleanNick(v || '') : String(v || '').trim().slice(0, 16);
  if (typeof NET !== 'undefined') NET.nick = n;
  try { localStorage.setItem('skerry-nick', n); } catch (e) {}
  for (const id of NICK_BOXES) { const el = $(id); if (el && el !== from && document.activeElement !== el && el.value !== n) el.value = n; }
  if (BOARD.mine) { clearTimeout(BOARD.nickT); BOARD.nickT = setTimeout(() => boardSendSoon('all'), 1500); }
  return n;
}
function nickSetup() {
  // (from before there was one name: the board's own, if the crew's was never set)
  let n = typeof NET !== 'undefined' ? NET.nick : '';
  if (!n) { try { n = localStorage.getItem('skerry-board-name') || ''; } catch (e) {} }
  nickSet(n);
  for (const id of NICK_BOXES) { const el = $(id); if (el) el.addEventListener('input', () => nickSet(el.value, el)); }
  // the Drowned Reach's house name: kept here too
  const h = $('warNick');
  if (h) { try { const v = localStorage.getItem('skerry-war-house'); if (v && !h.value) h.value = v; } catch (e) {} h.addEventListener('input', () => { try { localStorage.setItem('skerry-war-house', h.value.trim().slice(0, 18)); } catch (e) {} }); }
}
// for the save (src/crates.js): your bests and your name, and folding another save's in
function boardBests() { return BOARD.mine; }
function boardNick() { return (typeof NET !== 'undefined' && NET.nick) || ''; }
function boardMerge(best, nick, takeLooks) {
  let changed = false;
  if (best && typeof best === 'object' && BOARD.mine) for (const g of Object.keys(BOARD.games)) {
    const o = best[g]; if (!o) continue;
    const m = BOARD.mine[g], s = Math.max(m.s, Math.max(0, o.s | 0)), b = Math.max(m.b, Math.max(0, o.b | 0)), c = Math.max(m.c | 0, Math.max(0, o.c | 0));
    const p = m.p || o.p || (o.s | 0) + (o.b | 0) + (o.c | 0) > 0 ? 1 : 0, f = m.f || ('f' in o ? o.f : boardOldF(g, o)) ? 1 : 0;
    if (s !== m.s || b !== m.b || (BOARD.games[g].c && c !== (m.c | 0)) || p !== m.p || f !== m.f) { m.s = s; m.b = b; if (BOARD.games[g].c) m.c = c; m.p = p; m.f = f; changed = true; }
  }
  if (changed) { boardSaveMine(); boardSendSoon('all'); boardRender(); }
  const n = typeof cleanNick === 'function' ? cleanNick(nick || '') : '';
  if (n && n !== boardNick() && (takeLooks || !boardNick())) { nickSet(n); changed = true; }
  return changed;
}

// ---------- who you are on the board (the game's own site) ----------
// with a recovery code: an id made from it (so every device with your code is the one entry); else this browser's
async function boardIdNow() {
  const code = typeof CS !== 'undefined' && CS.on && CS.code;
  if (code && window.crypto && crypto.subtle) {
    if (BOARD.cidFor !== code) {
      const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('skerry-board:' + code));
      BOARD.cid = [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24); BOARD.cidFor = code;
    }
    return BOARD.cid;
  }
  return boardId();
}

// ---------- where the board lives ----------
function boardApiUrl() {
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    // the server that hands out the page keeps the board; a copy hosted elsewhere uses the crew server's
    const ws = typeof crewServerUrl === 'function' ? crewServerUrl() : '';
    if (ws && SK.SERVER) return ws.replace(/^ws/, 'http').replace(/\/ws$/, '') + '/api/scores';
    return location.origin + '/api/scores';
  }
  return '';
}
async function boardInit() {
  BOARD.mine = boardLoadMine(); boardSaveMine(); runsLoad();
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = user && await user.id();
      if (db && uid) {
        BOARD.via = 'claude'; BOARD.db = db; BOARD.user = user; BOARD.uid = uid;
        // what the board already has for you counts as your best too
        try { const snap = await db.doc('scores/' + uid).get(); const d = snap.exists ? snap.data() : null; if (d) for (const g of Object.keys(BOARD.games)) { const M = BOARD.mine[g]; M.s = Math.max(M.s, d[g + '_s'] | 0); M.c = Math.max(M.c | 0, d[g + '_c'] | 0); M.b = Math.max(M.b, d[g + '_b'] | 0); if ((d[g + '_k'] || 0) > 0) { M.p = 1; if (boardDocF(d, g)) M.f = 1; } if (!BOARD.games[g].c) delete M.c; } } catch (e) {}
        boardSaveMine(); boardSendSoon('all');
      } else BOARD.err = 'Sign in to claude.ai to see the scoreboard.';
    } catch (e) { BOARD.err = 'The scoreboard isn’t available here.'; }
  } else if (boardApiUrl()) { BOARD.via = 'server'; boardSendSoon('all'); }
  else BOARD.err = 'This copy of the game was opened from a file, so it has no scoreboard. Your bests are still kept in this browser.';
  boardRender(); boardFetch();
}

// ---------- sending your games ----------
// (any game marked u goes; BOARD_PENDING just says there's something to look at)
const BOARD_PENDING = new Set();
function boardSendSoon(game) {
  BOARD_PENDING.add(game);
  clearTimeout(BOARD.sendT); BOARD.sendT = setTimeout(boardSend, 2500);
}
async function boardSend() {
  if (!BOARD.via || !BOARD_PENDING.size) return;
  // (one at a time: another asked for meanwhile goes after this one)
  if (BOARD.sending) { BOARD.sendAgain = true; return; }
  BOARD.sending = true;
  const games = [...BOARD_PENDING]; BOARD_PENDING.clear();
  const m = BOARD.mine, R = BOARD.runs, has = r => r.s + r.b + (r.c | 0) > 0;
  try {
    if (BOARD.via === 'claude') {
      // one document for you: your games (best 25 of each, as [id, s, b, c, f, at]), and your bests as the board from
      // before kept them (so a page from before still shows you)
      const doc = { nick: boardName(), at: Date.now() };
      for (const g of Object.keys(BOARD.games)) {
        if (m[g].s + m[g].b + (m[g].c | 0) > 0) { doc[g + '_s'] = m[g].s; doc[g + '_b'] = m[g].b; doc[g + '_k'] = m[g].s * 1e9 + m[g].b + ((m[g].c | 0) > 0 && !m[g].s && !m[g].b ? 0.5 : 0); doc[g + '_f'] = m[g].f ? 1 : 0; if (BOARD.games[g].c) doc[g + '_c'] = m[g].c | 0; }
        doc[g + '_runs'] = R[g].filter(has).sort((a, b) => runKey(b) - runKey(a)).slice(0, 25).map(r => [r.r, r.s, r.b, r.c | 0, r.f ? 1 : 0, Math.floor(r.at || 0)]);
      }
      await BOARD.db.doc('scores/' + BOARD.uid).set(doc);
      for (const g of Object.keys(BOARD.games)) for (const r of R[g]) delete r.u;
      runsSave();
    } else {
      const id = await boardIdNow(); if (!id) { BOARD.sending = false; return; }
      let all = true;
      for (const g of Object.keys(BOARD.games)) for (const r of R[g].filter(x => x.u)) {
        if (!has(r)) { delete r.u; continue; }
        const sent = { s: r.s, b: r.b, c: r.c, f: r.f };
        const res = await fetch(boardApiUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, rid: r.r, name: boardName(), game: g, s: r.s, b: r.b, c: r.c | 0, f: r.f ? 1 : 0 }) });
        if (!res.ok) all = false;
        // (it may have gone up again meanwhile: then it goes again)
        else if (r.s === sent.s && r.b === sent.b && r.c === sent.c && r.f === sent.f) delete r.u;
        runsSave();
        await new Promise(res => setTimeout(res, 3200));   // the server takes one score every few seconds from each address
      }
      if (!all || Object.values(R).some(L => L.some(r => r.u))) { clearTimeout(BOARD.sendT); BOARD.sendT = setTimeout(boardSend, 4000); }
    }
    BOARD.lastT = 0; boardFetch();
  } catch (e) {
    // (a Viewer on claude.ai can read the board but not write to it; a server that's asleep wakes for the next try)
    if (BOARD.via === 'claude') BOARD.err = 'You can see the board, but your scores can’t be added from here (the page’s owner can give you Contributor access).';
    else { for (const g of games) BOARD_PENDING.add(g); clearTimeout(BOARD.sendT); BOARD.sendT = setTimeout(boardSend, 8000); }
    boardRender();
  }
  BOARD.sending = false;
  if (BOARD.sendAgain) { BOARD.sendAgain = false; if (BOARD_PENDING.size) setTimeout(boardSend, 500); }
}

// ---------- reading the board ----------
async function boardFetch(force) {
  if (!BOARD.via || BOARD.loading) return;
  if (!force && Date.now() - BOARD.lastT < 30000) return;
  BOARD.loading = true; BOARD.lastT = Date.now(); boardRender();
  try {
    if (BOARD.via === 'claude') {
      // everyone's document (the latest 500 players), and every game in each; one from before games were kept has
      // its best, as one game
      const data = {}, q = await BOARD.db.collection('scores').orderBy('at', 'desc').limit(500).get();
      const docs = q.docs.map(d => ({ id: d.id, d: d.data() || {} }));
      for (const g of Object.keys(BOARD.games)) {
        const L = [];
        for (const { id, d } of docs) {
          const base = { id, n: '', nick: String(d.nick || ''), me: id === BOARD.uid };
          if (Array.isArray(d[g + '_runs'])) { for (const a of d[g + '_runs']) if (Array.isArray(a)) L.push(Object.assign({ s: a[1] | 0, b: a[2] | 0, c: a[3] | 0, f: a[4] ? 1 : 0 }, base)); }
          else if ((d[g + '_k'] || 0) > 0) L.push(Object.assign(boardOldRun(g, { s: d[g + '_s'] | 0, b: d[g + '_b'] | 0, c: d[g + '_c'] | 0 }, boardDocF(d, g)), base));
        }
        data[g] = L.filter(e => e.s + e.b + e.c > 0).sort((a, b) => runKey(b) - runKey(a)).slice(0, 500);
      }
      // names, as this viewer's claude.ai shows them
      const ids = [...new Set(Object.values(data).flat().map(e => e.id))];
      let ps = {}; try { ps = ids.length ? await BOARD.user.profiles(ids) : {}; } catch (e) {}
      for (const e of Object.values(data).flat()) e.n = (ps[e.id] && ps[e.id].name) || e.nick || 'Someone';
      BOARD.data = data; BOARD.store = 'claude'; BOARD.err = BOARD.err && /Contributor/.test(BOARD.err) ? BOARD.err : '';
    } else {
      const id = await boardIdNow();
      const r = await fetch(boardApiUrl(), { cache: 'no-store', headers: id ? { 'x-board-id': id } : {} });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json(); BOARD.data = j.games || {}; BOARD.store = j.store || ''; BOARD.err = '';
    }
  } catch (e) { BOARD.err = 'Couldn’t reach the scoreboard just now. Try Refresh in a moment.'; }
  BOARD.loading = false; boardRender();
}
// every game at once: the top ten of each, and All to see everyone
function boardRender() {
  const box = $('boardGames'); if (!box) return;
  box.innerHTML = ''; let anyInc = false;
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  for (const [g, G] of Object.entries(BOARD.games)) {
    const rows = (BOARD.data && BOARD.data[g]) || [], open = !!BOARD.open[g], sec = mk('section', 'boardgame');
    const top = mk('div', 'bgtop'); top.append(mk('h2', '', G.name));
    if (rows.length > 10) {
      const t = mk('button', 'tool bgmore', open ? 'Top 10' : `All ${rows.length}`); t.type = 'button'; t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.addEventListener('click', () => { BOARD.open[g] = !open; boardRender(); }); top.append(t);
    }
    sec.append(top);
    const head = mk('div', 'boardhead'); head.setAttribute('aria-hidden', 'true'); head.title = G.what;
    for (const [c, t] of [['rk', '#'], ['nm', 'Name'], ['sc', G.s], ['sb', G.b]].concat(G.c ? [['sb', G.c]] : [])) head.append(mk('span', c, t));
    if (G.c) sec.classList.add('three');
    sec.append(head);
    const ol = mk('ol', 'boardlist'); ol.setAttribute('aria-label', G.name + ': ' + G.what);
    if (!rows.length) ol.append(mk('li', 'empty', BOARD.loading && !BOARD.data ? 'Reading the board…' : BOARD.data ? 'No one yet. Be the first.' : BOARD.err ? '—' : 'Reading the board…'));
    let meShown = false;
    (open ? rows : rows.slice(0, 10)).forEach((e, k) => {
      const li = mk('li', e.me ? 'me' : ''); if (e.me) meShown = true;
      // (no f: a server from before the marks; its rows count as finished)
      const inc = e.f === 0 || e.f === false; if (inc) anyInc = true;
      for (const [cls, txt] of [['rk', String(k + 1)], ['nm', e.n + (e.me ? ' (you)' : '')], ['sc', G.fs ? G.fs(e.s) : String(e.s)], ['sb', G.fb ? G.fb(e.b) : String(e.b)]].concat(G.c ? [['sb', String(e.c | 0)]] : [])) {
        const sp = mk('span', cls, txt); li.append(sp);
        if (cls === 'nm' && inc) { const a = mk('span', 'inc', '*'); a.title = 'An incomplete game'; a.setAttribute('aria-label', ' (an incomplete game)'); sp.append(a); }
      }
      ol.append(li);
    });
    sec.append(ol);
    // your best game, under a board you're not on as far as it shows
    const m = BOARD.runs && BOARD.runs[g] && BOARD.runs[g].filter(r => r.s + r.b + (r.c | 0) > 0).sort((a, b) => runKey(b) - runKey(a))[0];
    if (m && !meShown) {
      const p = mk('p', 'boardmine', `Your best: ${G.fs ? G.fs(m.s) : m.s} · ${G.fb ? G.fb(m.b) : m.b}${G.c ? ' · ' + (m.c | 0) : ''}`);
      if (!m.f) { const a = mk('span', 'inc', '*'); a.title = 'An incomplete game'; p.append(a); anyInc = true; }
      sec.append(p);
    }
    box.append(sec);
  }
  // what the asterisk means, under the board while there's one on it
  if ($('boardKey')) $('boardKey').hidden = !anyInc;
  $('boardNameRow').hidden = BOARD.via === 'claude';
  $('boardNote').textContent = BOARD.err && BOARD.data ? BOARD.err
    : BOARD.via === 'claude' ? 'Names are as claude.ai shows them. Everyone who opens this page shares the board.'
    : BOARD.store === 'memory' ? 'This server keeps the board in memory only, so it starts over when the server restarts.'
    : BOARD.via === 'server' ? 'Everyone who plays on this site shares the board. Your scores go on it by themselves, under your name, and follow your save to every device.'
    : BOARD.err || '';
}

(() => {
  if (!$('boardCard')) return;
  nickSetup();
  $('boardRefresh').addEventListener('click', () => boardFetch(true));
  // the minimise button: the card shrinks to a small bar with just its name, and back; kept in this browser
  const mb = $('boardMin'), setMini = on => { $('boardCard').classList.toggle('mini', on); mb.textContent = on ? '+ Show' : '– Minimise'; mb.setAttribute('aria-expanded', on ? 'false' : 'true'); mb.title = on ? 'Show the whole scoreboard' : 'Make the scoreboard small'; };
  let mini = false; try { mini = localStorage.getItem('skerry-board-mini') === '1'; } catch (e) {}
  setMini(mini);
  mb.addEventListener('click', () => { mini = !mini; setMini(mini); try { localStorage.setItem('skerry-board-mini', mini ? '1' : '0'); } catch (e) {} if (!mini) boardFetch(true); });
  // keep it fresh while the title screen is up
  setInterval(() => { if (!$('titleCard').hidden) boardFetch(); }, 10000);
  boardInit();
})();
