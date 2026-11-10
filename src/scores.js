// The scoreboard: everyone's best in all four games, kept where the game is hosted.
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
//
// Your bests are part of your save (src/crates.js saveData: `best`, merged by taking the higher of each), so they
// follow your recovery code (src/cloudsave.js) to every device, and on the game's own site you're on the board once,
// under an id made from that code (not the code itself): a browser's own entry from before moves across to it.
// Your name on the board is your username: one name for every game, kept on this device (and in your save), typed
// in any of the name boxes (the board's, the crew's, Wreckers' Night's, the Lighthouse's) and filled into the rest.

const BOARD = {
  games: {
    skerry: { name: 'Skerry Light', s: 'Best run', b: 'Voyages', what: 'Most voyages made in one run, without losing the boat. Voyages: made in all.' },
    fps: { name: 'Wreckers’ Night', s: 'Best round', b: 'Rounds won', what: 'Most kills in one round of Wreckers’ Night. Rounds won: rounds you finished on top.' },
    war: { name: 'Drowned Reach', s: 'Wars won', b: 'Most land', what: 'Wars of the Drowned Reach won, alone or together. Most land: the most tiles taken in one war.' },
    zm: { name: 'Keeper’s Last Light', s: 'Rounds held', b: 'Most kills', what: 'The most rounds held at the Lighthouse in one night. Most kills: the drowned sent back in one night.' },
  },
  open: {}, mine: null, via: null, db: null, user: null, uid: null, data: null, loading: false, err: '', lastT: 0, sendT: 0, store: '',
};

// ---------- your bests, here ----------
function boardLoadMine() {
  let m = {}; try { m = JSON.parse(localStorage.getItem('skerry-bests') || '{}') || {}; } catch (e) {}
  for (const g of Object.keys(BOARD.games)) m[g] = { s: Math.max(0, (m[g] && m[g].s) | 0), b: Math.max(0, (m[g] && m[g].b) | 0) };
  // bests from before there was a board
  try { m.skerry.s = Math.max(m.skerry.s, parseInt(localStorage.getItem('skerry-helm-best') || '0', 10) || 0); } catch (e) {}
  if (typeof warLoadStats === 'function') { const st = warLoadStats(); m.war.s = Math.max(m.war.s, st.wins | 0); m.war.b = Math.max(m.war.b, st.bestTiles | 0); }
  return m;
}
function boardSaveMine() { try { localStorage.setItem('skerry-bests', JSON.stringify(BOARD.mine)); } catch (e) {} }
// a new best (either number) goes on the board soon after
function scoreReport(game, s, b) {
  const m = BOARD.mine && BOARD.mine[game]; if (!m) return;
  s = Math.max(0, Math.floor(s || 0)); b = Math.max(0, Math.floor(b || 0));
  if (s <= m.s && b <= m.b) return;
  m.s = Math.max(m.s, s); m.b = Math.max(m.b, b); boardSaveMine();
  boardSendSoon(game);
}
// Skerry Light: a voyage made, and how many this run has made
function scoreVoyage(runVoyages) { const m = BOARD.mine && BOARD.mine.skerry; if (!m) return; scoreReport('skerry', runVoyages, m.b + 1); }
function boardId() {
  try { let id = localStorage.getItem('skerry-pid'); if (!id || !/^[a-z0-9]{12,40}$/.test(id)) { id = ''; while (id.length < 20) id += Math.random().toString(36).slice(2); id = id.slice(0, 20); localStorage.setItem('skerry-pid', id); } return id; }
  catch (e) { return null; }
}
function boardName() {
  const v = (typeof NET !== 'undefined' && NET.nick) || ($('warNick') && $('warNick').value) || '';
  return String(v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, 16) || 'A sailor';
}

// ---------- your username: one for every game, kept on this device ----------
const NICK_BOXES = ['nick', 'fpsNick', 'zmNick', 'boardName'];
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
    const m = BOARD.mine[g], s = Math.max(m.s, Math.max(0, o.s | 0)), b = Math.max(m.b, Math.max(0, o.b | 0));
    if (s !== m.s || b !== m.b) { m.s = s; m.b = b; changed = true; }
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
  BOARD.mine = boardLoadMine(); boardSaveMine();
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = user && await user.id();
      if (db && uid) {
        BOARD.via = 'claude'; BOARD.db = db; BOARD.user = user; BOARD.uid = uid;
        // what the board already has for you counts as your best too
        try { const snap = await db.doc('scores/' + uid).get(); const d = snap.exists ? snap.data() : null; if (d) for (const g of Object.keys(BOARD.games)) { BOARD.mine[g].s = Math.max(BOARD.mine[g].s, d[g + '_s'] | 0); BOARD.mine[g].b = Math.max(BOARD.mine[g].b, d[g + '_b'] | 0); } } catch (e) {}
        boardSaveMine(); boardSendSoon('all');
      } else BOARD.err = 'Sign in to claude.ai to see the scoreboard.';
    } catch (e) { BOARD.err = 'The scoreboard isn’t available here.'; }
  } else if (boardApiUrl()) { BOARD.via = 'server'; boardSendSoon('all'); }
  else BOARD.err = 'This copy of the game was opened from a file, so it has no scoreboard. Your bests are still kept in this browser.';
  boardRender(); boardFetch();
}

// ---------- sending your bests ----------
const BOARD_PENDING = new Set();
function boardSendSoon(game) {
  if (game === 'all') for (const g of Object.keys(BOARD.games)) BOARD_PENDING.add(g); else BOARD_PENDING.add(game);
  clearTimeout(BOARD.sendT); BOARD.sendT = setTimeout(boardSend, 2500);
}
async function boardSend() {
  if (!BOARD.via || !BOARD_PENDING.size) return;
  // (one at a time: another asked for meanwhile goes after this one)
  if (BOARD.sending) { BOARD.sendAgain = true; return; }
  BOARD.sending = true;
  const games = [...BOARD_PENDING]; BOARD_PENDING.clear();
  const m = BOARD.mine;
  try {
    if (BOARD.via === 'claude') {
      const doc = { nick: boardName(), at: Date.now() };
      for (const g of Object.keys(BOARD.games)) if (m[g].s + m[g].b > 0) { doc[g + '_s'] = m[g].s; doc[g + '_b'] = m[g].b; doc[g + '_k'] = m[g].s * 1e7 + m[g].b; }
      await BOARD.db.doc('scores/' + BOARD.uid).set(doc);
    } else {
      const id = await boardIdNow(); if (!id) { BOARD.sending = false; return; }
      // every id this browser has been on the board under: any but this one move across to it, one a pass, so no one
      // is on the board twice (a browser's own id, before its save had a recovery code; a code since replaced)
      let used = []; try { used = JSON.parse(localStorage.getItem('skerry-board-used') || '[]').filter(x => typeof x === 'string'); } catch (e) {}
      const pid = boardId(); if (pid && pid !== id && !used.includes(pid)) used.push(pid);
      const was = used.find(x => x !== id) || '';
      if (!used.includes(id)) used.push(id);
      try { localStorage.setItem('skerry-board-used', JSON.stringify(used.slice(-6))); } catch (e) {}
      let all = true;
      for (const g of was ? Object.keys(BOARD.games) : games) {
        if (m[g].s + m[g].b <= 0 && !was) continue;
        const r = await fetch(boardApiUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, name: boardName(), game: g, s: m[g].s, b: m[g].b, was: was || undefined }) });
        if (!r.ok) { all = false; BOARD_PENDING.add(g); }
        await new Promise(res => setTimeout(res, 3200));   // the server takes one score every few seconds from each address
      }
      if (was && all) {
        used = used.filter(x => x !== was); try { localStorage.setItem('skerry-board-used', JSON.stringify(used)); } catch (e) {}
        if (used.some(x => x !== id)) boardSendSoon('all');
      }
      if (!all) { clearTimeout(BOARD.sendT); BOARD.sendT = setTimeout(boardSend, 4000); }
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
      const data = {};
      for (const g of Object.keys(BOARD.games)) {
        const q = await BOARD.db.collection('scores').orderBy(g + '_k', 'desc').limit(10).get();
        data[g] = q.docs.map(d => ({ id: d.id, d: d.data() || {} })).filter(e => (e.d[g + '_k'] || 0) > 0).map(e => ({ id: e.id, n: '', nick: String(e.d.nick || ''), s: e.d[g + '_s'] | 0, b: e.d[g + '_b'] | 0, me: e.id === BOARD.uid }));
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
// all four games at once: the top three of each, and Top 10 to see more
function boardRender() {
  const box = $('boardGames'); if (!box) return;
  box.innerHTML = '';
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  for (const [g, G] of Object.entries(BOARD.games)) {
    const rows = (BOARD.data && BOARD.data[g]) || [], open = !!BOARD.open[g], sec = mk('section', 'boardgame');
    const top = mk('div', 'bgtop'); top.append(mk('h2', '', G.name));
    if (rows.length > 3) {
      const t = mk('button', 'tool bgmore', open ? 'Top 3' : 'Top 10'); t.type = 'button'; t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.addEventListener('click', () => { BOARD.open[g] = !open; boardRender(); }); top.append(t);
    }
    sec.append(top);
    const head = mk('div', 'boardhead'); head.setAttribute('aria-hidden', 'true'); head.title = G.what;
    for (const [c, t] of [['rk', '#'], ['nm', 'Name'], ['sc', G.s], ['sb', G.b]]) head.append(mk('span', c, t));
    sec.append(head);
    const ol = mk('ol', 'boardlist'); ol.setAttribute('aria-label', G.name + ': ' + G.what);
    if (!rows.length) ol.append(mk('li', 'empty', BOARD.loading && !BOARD.data ? 'Reading the board…' : BOARD.data ? 'No one yet. Be the first.' : (BOARD.err || 'Reading the board…')));
    let meShown = false;
    rows.slice(0, open ? 10 : 3).forEach((e, k) => {
      const li = mk('li', e.me ? 'me' : ''); if (e.me) meShown = true;
      for (const [cls, txt] of [['rk', String(k + 1)], ['nm', e.n + (e.me ? ' (you)' : '')], ['sc', String(e.s)], ['sb', g === 'war' ? `${e.b} tiles` : String(e.b)]]) li.append(mk('span', cls, txt));
      ol.append(li);
    });
    sec.append(ol);
    const m = BOARD.mine && BOARD.mine[g];
    if (m && m.s + m.b > 0 && !meShown) sec.append(mk('p', 'boardmine', `Your best: ${m.s} · ${m.b}${g === 'war' ? ' tiles' : ''}`));
    box.append(sec);
  }
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
  // keep it fresh while the title screen is up
  setInterval(() => { if (!$('titleCard').hidden) boardFetch(); }, 10000);
  boardInit();
})();
