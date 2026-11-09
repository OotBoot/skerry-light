// The scoreboard: everyone's best in all three games, kept where the game is hosted.
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

const BOARD = {
  games: {
    skerry: { name: 'Skerry Light', s: 'Best run', b: 'Voyages', what: 'Most voyages made in one run, without losing the boat. Voyages: made in all.' },
    fps: { name: 'Wreckers’ Night', s: 'Best round', b: 'Rounds won', what: 'Most kills in one round of Wreckers’ Night. Rounds won: rounds you finished on top.' },
    war: { name: 'The Drowned Reach', s: 'Wars won', b: 'Most land', what: 'Wars of the Drowned Reach won, alone or together. Most land: the most tiles taken in one war.' },
  },
  tab: 'skerry', mine: null, via: null, db: null, user: null, uid: null, data: null, loading: false, err: '', lastT: 0, sendT: 0, store: '',
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
  const v = ($('boardName') && $('boardName').value || '').trim() || (typeof NET !== 'undefined' && NET.nick) || ($('fpsNick') && $('fpsNick').value) || ($('warNick') && $('warNick').value) || '';
  return String(v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, 18) || 'A sailor';
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
  const games = [...BOARD_PENDING]; BOARD_PENDING.clear();
  const m = BOARD.mine;
  try {
    if (BOARD.via === 'claude') {
      const doc = { nick: boardName(), at: Date.now() };
      for (const g of Object.keys(BOARD.games)) if (m[g].s + m[g].b > 0) { doc[g + '_s'] = m[g].s; doc[g + '_b'] = m[g].b; doc[g + '_k'] = m[g].s * 1e7 + m[g].b; }
      await BOARD.db.doc('scores/' + BOARD.uid).set(doc);
    } else {
      const id = boardId(); if (!id) return;
      for (const g of games) {
        if (m[g].s + m[g].b <= 0) continue;
        const r = await fetch(boardApiUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, name: boardName(), game: g, s: m[g].s, b: m[g].b }) });
        if (r.status === 429) { BOARD_PENDING.add(g); clearTimeout(BOARD.sendT); BOARD.sendT = setTimeout(boardSend, 4000); }
        await new Promise(res => setTimeout(res, 3200));   // the server takes one score every few seconds from each address
      }
    }
    BOARD.lastT = 0; boardFetch();
  } catch (e) {
    // (a Viewer on claude.ai can read the board but not write to it; a server that's asleep wakes for the next try)
    if (BOARD.via === 'claude') BOARD.err = 'You can see the board, but your scores can’t be added from here (the page’s owner can give you Contributor access).';
    boardRender();
  }
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
        const q = await BOARD.db.collection('scores').orderBy(g + '_k', 'desc').limit(25).get();
        data[g] = q.docs.map(d => ({ id: d.id, d: d.data() || {} })).filter(e => (e.d[g + '_k'] || 0) > 0).map(e => ({ id: e.id, n: '', nick: String(e.d.nick || ''), s: e.d[g + '_s'] | 0, b: e.d[g + '_b'] | 0, me: e.id === BOARD.uid }));
      }
      // names, as this viewer's claude.ai shows them
      const ids = [...new Set(Object.values(data).flat().map(e => e.id))];
      let ps = {}; try { ps = ids.length ? await BOARD.user.profiles(ids) : {}; } catch (e) {}
      for (const e of Object.values(data).flat()) e.n = (ps[e.id] && ps[e.id].name) || e.nick || 'Someone';
      BOARD.data = data; BOARD.store = 'claude'; BOARD.err = BOARD.err && /Contributor/.test(BOARD.err) ? BOARD.err : '';
    } else {
      const r = await fetch(boardApiUrl(), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json(); BOARD.data = j.games || {}; BOARD.store = j.store || ''; BOARD.err = '';
      const me = boardName();
      for (const g of Object.keys(BOARD.data)) for (const e of BOARD.data[g]) e.me = e.n === me && BOARD.mine[g] && e.s === BOARD.mine[g].s && e.b === BOARD.mine[g].b;
    }
  } catch (e) { BOARD.err = 'Couldn’t reach the scoreboard just now. Try Refresh in a moment.'; }
  BOARD.loading = false; boardRender();
}
function boardRender() {
  const list = $('boardList'); if (!list) return;
  const G = BOARD.games[BOARD.tab], rows = BOARD.data && BOARD.data[BOARD.tab] || [];
  for (const b of document.querySelectorAll('#boardTabs button')) { const on = b.dataset.g === BOARD.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
  $('boardWhat').textContent = G.what;
  $('boardHeadS').textContent = G.s; $('boardHeadB').textContent = G.b;
  list.innerHTML = '';
  if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = BOARD.loading ? 'Reading the board…' : BOARD.data ? 'No one is on this board yet. Be the first.' : (BOARD.err || 'Reading the board…'); list.append(li); }
  rows.forEach((e, k) => {
    const li = document.createElement('li'); if (e.me) li.className = 'me';
    for (const [cls, txt] of [['rk', String(k + 1)], ['nm', e.n + (e.me ? ' (you)' : '')], ['sc', String(e.s)], ['sb', BOARD.tab === 'war' ? `${e.b} tiles` : String(e.b)]]) { const sp = document.createElement('span'); sp.className = cls; sp.textContent = txt; li.append(sp); }
    list.append(li);
  });
  const m = BOARD.mine && BOARD.mine[BOARD.tab];
  $('boardMine').textContent = m ? `Your best: ${G.s.toLowerCase()} ${m.s} · ${G.b.toLowerCase()} ${m.b}${BOARD.tab === 'war' ? ' tiles' : ''}` : '';
  $('boardNameRow').hidden = BOARD.via !== 'server';
  $('boardNote').textContent = BOARD.err && rows.length ? BOARD.err
    : BOARD.via === 'claude' ? 'Names are as claude.ai shows them. Everyone who opens this page shares the board.'
    : BOARD.store === 'memory' ? 'This server keeps the board in memory only, so it starts over when the server restarts.'
    : BOARD.via === 'server' ? 'Everyone who plays on this site shares the board. Your name is whatever you put above.' : '';
}

(() => {
  if (!$('boardCard')) return;
  for (const b of document.querySelectorAll('#boardTabs button')) b.addEventListener('click', () => { BOARD.tab = b.dataset.g; try { localStorage.setItem('skerry-board-tab', BOARD.tab); } catch (e) {} boardRender(); });
  try { const t = localStorage.getItem('skerry-board-tab'); if (BOARD.games[t]) BOARD.tab = t; const n = localStorage.getItem('skerry-board-name'); if (n) $('boardName').value = n; } catch (e) {}
  $('boardRefresh').addEventListener('click', () => boardFetch(true));
  $('boardName').addEventListener('change', () => { try { localStorage.setItem('skerry-board-name', $('boardName').value.trim()); } catch (e) {} boardSendSoon('all'); });
  // keep it fresh while the title screen is up
  setInterval(() => { if (!$('titleCard').hidden) boardFetch(); }, 10000);
  boardInit();
})();
