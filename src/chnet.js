'use strict';
// Skerry Chess played online: one against one, each on their own screen, through the room the crews sail in
// (src/net.js), on its own key (`ch`) in each player's presence, as Skerry League's lobby does (src/lgnet.js).
//
// In the lobby: { room, sid, nick, at } (the board's code, who you are, when you came in). The first in sets the board
// up and adds lob { v, cl }: the rules ('std' or 'sk') and the colour they'll play ('w', 'b' or 'r' for either), as
// picked on the card. Two at most; a third finds the board full.
// The one who set it up presses Start, and puts st { g the game's id, v, w and b (the sids of White and Black), wn and
// bn (their names) } in its presence. Both screens then start the game (chStart with net).
// During the game each screen puts the whole game so far in its presence as mv, the moves in UCI joined by commas
// ("e2e4,e7e5,..."), with g. There's no host for the moves: each screen plays its own and takes the other's from the
// other's mv, checking each one is legal and made on the other's turn (only on coming back to a game in progress does
// a screen take its own moves from there too). The rest, also in presence:
//   rs: 1 once you've resigned this game (the other side wins);
//   dr: the ply (moves made so far) at which you offer a draw, or -1; when both say the same ply, it's a draw. Making
//       a move withdraws an offer;
//   rm: the game's id, once you'd like a rematch at the end; when both ask, the one who set the board up starts the
//       next game with the colours swapped.
// A player not heard from in this game for CHN_GONE loses it (by leaving); one who comes back within that time picks
// up where they were (the card's list offers it).
// server/server.js relays one board's two players to each other at once, and only enough to list the board to others.

var CHN = { leftG: null, code: null, at: 0, msg: '', st: null, g: null, doneG: null, seen: 0, rs: 0, dr: -1, rm: null, lobT: 0, sync: false, lastRm: null };
const CHN_GONE = 45000;      // ms without a word in this game before the other player is taken to have left
const chnClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, n);
function chnOnline() { return !!(typeof NET !== 'undefined' && NET.room && NET.status === 'ready'); }
function chnInGame() { return !!(CHS.on && CHS.net); }
function chnNick() { return chnClean(chMyName() === 'You' ? (NET.nick || '') : chMyName(), 16) || 'Keeper ' + String(NET.sid || '').slice(0, 3).toUpperCase(); }
function chnOf(p) { const z = p && p.presence && p.presence.ch; return z && typeof z === 'object' && typeof z.room === 'string' && typeof z.sid === 'string' ? z : null; }
const chnMine = p => !!(p && p.isMe && p.sameTab);
function chnBase() { return { room: CHN.code, sid: NET.sid, nick: chnNick(), at: CHN.at }; }
function chnPeers(code) {
  const out = NET.peers.filter(p => { const z = chnOf(p); return z && z.room === code && fresh(p) && !chnMine(p); });
  if (CHN.code === code) out.push({ isMe: true, sameTab: true, presence: { ch: chnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = chnOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (chnOf(a).at || 0) - (chnOf(b).at || 0) || (chnOf(a).sid < chnOf(b).sid ? -1 : 1));
}
function chnMembers() { return CHN.code ? chnPeers(CHN.code).slice(0, 2) : []; }
function chnAmHost() { const m = chnMembers(); return !!m.length && chnMine(m[0]); }
function chnHostZ() { const m = chnMembers(); return m.length && !chnMine(m[0]) ? chnOf(m[0]) : null; }
function chnOther() { const m = chnMembers(); const p = m.find(x => !chnMine(x)); return p ? chnOf(p) : null; }
function chnSend(z) { if (NET.room) NET.room.presence({ ch: z }).catch(() => {}); }
function chnPick() { const v = $('chVar') && $('chVar').value === 'sk' ? 'sk' : 'std', c = $('chSide') ? $('chSide').value : 'w'; return { v, cl: c === 'b' ? 'b' : c === 'r' ? 'r' : 'w' }; }
function chnLob() { if (chnAmHost()) return chnPick(); const h = chnHostZ(), l = h && h.lob; return l ? { v: l.v === 'sk' ? 'sk' : 'std', cl: ['w', 'b', 'r'].includes(l.cl) ? l.cl : 'w' } : chnPick(); }
function chnSendLobby() {
  if (!CHN.code) return;
  const z = chnBase();
  if (chnAmHost()) z.lob = chnPick();
  // (after a game, the rematch ask stays up until it's answered)
  if (CHN.lastRm) z.rm = CHN.lastRm;
  // (and a game left unfinished stays resigned)
  if (CHN.leftG) z.left = CHN.leftG;
  chnSend(z);
}
function chnHost() {
  if (!chnOnline() || chnInGame()) return;
  CHN.code = 'c' + Math.random().toString(36).slice(2, 8); CHN.at = Date.now(); CHN.msg = ''; CHN.doneG = null; CHN.lastRm = null;
  chnSendLobby(); chnRender();
}
function chnJoin(code, rejoin) {
  if (!chnOnline() || !code || chnInGame()) return;
  if (!rejoin && chnPeers(code).length >= 2) { CHN.msg = 'That board is taken (two players already).'; chnRender(); return; }
  const late = Math.max(0, ...chnPeers(code).map(p => chnOf(p).at || 0));
  CHN.code = code; CHN.at = Math.max(Date.now(), late + 1); CHN.msg = ''; CHN.doneG = null; CHN.lastRm = null;
  chnSendLobby(); chnRender(); chNetPeers();
}
function chnLeave() { if (chnInGame()) return; CHN.code = null; CHN.st = null; CHN.g = null; CHN.lastRm = null; if (NET.room) NET.room.presence({ ch: null }).catch(() => {}); chnRender(); }
// the boards being played or waiting here
function chnOpen() {
  const rooms = new Map();
  for (const p of NET.peers) { const z = chnOf(p); if (!z || !fresh(p) || chnMine(p)) continue; if (!rooms.has(z.room)) rooms.set(z.room, []); rooms.get(z.room).push(p); }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === CHN.code) continue;
    list.sort((a, b) => (chnOf(a).at || 0) - (chnOf(b).at || 0));
    const h = chnOf(list[0]), st = h.st && typeof h.st.g === 'string' ? h.st : null;
    const mine = !!(st && (st.w === NET.sid || st.b === NET.sid) && !h.over && h.left !== st.g);
    const lob = h.lob && typeof h.lob === 'object' ? h.lob : {};
    out.push({ code, host: chnClean(h.nick, 16) || 'Someone', n: list.length, started: !!st, mine, v: lob.v === 'sk' ? 'sk' : 'std' });
  }
  return out;
}

function chnRender() {
  const q = id => $('ch' + id); if (!q('Mp')) return;
  const on = chnOnline(), mine = !!CHN.code;
  q('MpNote').textContent = on ? 'Set up a board, and the other player joins it from this card or from your invite. One of you against the other, each on your own screen.' : (NET.status === 'connecting' ? 'Looking for other players…' : (NET.offReason || 'Playing online isn’t available here. You can still play the bots.'));
  q('MpOpen').hidden = !on || mine; q('Lobby').hidden = !mine;
  if (!on) return;
  if (!mine) {
    const L = chnOpen(), el = q('Lobbies'), key = JSON.stringify(L) + CHN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key; el.textContent = '';
    if (CHN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = CHN.msg; el.append(p); }
    if (!L.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Nobody has a board set up right now. Set one up, and send the person you want to play to this page.'; el.append(p); return; }
    for (const n of L) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `${n.host}’s board`;
      const sm = document.createElement('small'); sm.textContent = (n.mine ? 'your game · tap to go back to it' : n.started || n.n >= 2 ? 'being played' : 'waiting for an opponent · tap to join') + ' · ' + CH_VARIANTS[n.v].name;
      b.append(nm, sm); b.disabled = !n.mine && (n.started || n.n >= 2); b.addEventListener('click', () => chnJoin(n.code, n.mine)); el.append(b);
    }
    return;
  }
  const m = chnMembers(), host = chnAmHost(), hz = m.length ? chnOf(m[0]) : null, L = chnLob();
  const st = !host && hz && hz.st && typeof hz.st.g === 'string' ? hz.st : null, back = !!(st && (st.w === NET.sid || st.b === NET.sid) && st.g !== CHN.doneG && !hz.over && !CHS.on);
  const key = JSON.stringify(m.map(p => [chnOf(p).sid, chnOf(p).nick])) + JSON.stringify(L) + host + back + !!st + CHN.msg;
  q('MpStart').hidden = !host; q('MpStart').disabled = m.length < 2; q('MpRejoin').hidden = !back;
  if (q('Lobby').dataset.k === key) return; q('Lobby').dataset.k = key;
  q('LobbyHead').textContent = host ? 'Your board' : `${chnClean(hz && hz.nick, 16) || 'Someone'}’s board`;
  const ol = q('LobbyList'); ol.textContent = '';
  m.forEach((p, k) => { const li = document.createElement('li'), z = chnOf(p); li.textContent = (chnClean(z.nick, 16) || 'A keeper') + (chnMine(p) ? ' (you)' : '') + (k === 0 ? ' · set up the board' : ''); if (chnMine(p)) li.className = 'me'; ol.append(li); });
  const col = { w: 'White', b: 'Black', r: 'either colour' }[L.cl], what = `${CH_VARIANTS[L.v].name}, and ${host ? 'you play' : 'they play'} ${col}`;
  q('LobbyMsg').textContent = CHN.msg || (m.length < 2 ? `${what}. Waiting for an opponent: share the invite, or wait for someone to join from their card.` : host ? `${what}. Start when you're ready (change the rules or your colour on the card above).` : `${what}. Waiting for them to start.`);
}

// ---------- starting a game ----------
function chnStart() {
  if (!chnAmHost() || chnInGame()) return;
  const m = chnMembers(); if (m.length < 2) return;
  const L = chnPick(), me = chnOf(m[0]), them = chnOf(m[1]);
  const white = L.cl === 'w' || (L.cl === 'r' && Math.random() < 0.5);
  chnBegin(chnSt(L.v, white ? me : them, white ? them : me));
}
const chnSt = (v, w, b) => ({ g: Math.random().toString(36).slice(2, 9), v, w: w.sid, b: b.sid, wn: chnClean(w.nick, 16) || 'A keeper', bn: chnClean(b.nick, 16) || 'A keeper' });
function chnStOk(s) {
  if (!s || typeof s.g !== 'string' || typeof s.w !== 'string' || typeof s.b !== 'string') return null;
  return { g: s.g.slice(0, 12), v: s.v === 'sk' ? 'sk' : 'std', w: s.w.slice(0, 16), b: s.b.slice(0, 16), wn: chnClean(s.wn, 16) || 'A keeper', bn: chnClean(s.bn, 16) || 'A keeper' };
}
function chnBegin(st) {
  Object.assign(CHN, { st, g: st.g, doneG: st.g, seen: performance.now(), rs: 0, dr: -1, rm: null, lastRm: null, leftG: null, sync: true });
  const me = st.w === NET.sid ? 1 : -1;
  chStart({ v: st.v, me, uci: [], net: { g: st.g, opp: me > 0 ? st.bn : st.wn } });
  chnSendNow();
}
function chNetPeers() {
  if (chnInGame()) { chnRead(); return; }
  if (CHN.code) {
    const m = chnMembers();
    if (!m.some(chnMine)) { CHN.msg = 'Someone else took that board before you got there.'; chnLeave(); return; }
    const hz = chnHostZ();
    if (hz && hz.st && typeof hz.st.g === 'string' && hz.st.g !== CHN.doneG && !CHS.on && !hz.over && hz.left !== hz.st.g) {
      const st = chnStOk(hz.st);
      // (a new game, or one I was in and dropped out of: the moves so far come from the other screen)
      if (st && (st.w === NET.sid || st.b === NET.sid)) { chnBegin(st); return; }
      CHN.doneG = hz.st.g; CHN.msg = 'They started a game with someone else.';
    }
    // the rematch: both asked, and the one who set the board up starts it with the colours swapped
    const o = chnOther();
    if (chnAmHost() && CHN.lastRm && o && o.rm === CHN.lastRm && CHN.st && CHN.st.g === CHN.lastRm) {
      const me = chnOf(m[0]), wasW = CHN.st.w === NET.sid;
      chnBegin(chnSt(chnPick().v, wasW ? o : me, wasW ? me : o)); return;
    }
    if (chnAmHost() && performance.now() - (CHN.lobT || 0) > 3000) { CHN.lobT = performance.now(); chnSendLobby(); }
  }
  chnRender();
}
function chnStop() {
  CHN.st = CHN.st || null;
  if (CHN.code) chnSendLobby();
  setTimeout(chnRender, 50);
}

// ---------- the game ----------
function chnSendNow() {
  if (!CHN.code || !CHN.g || !CHS.G) return;
  const z = chnBase(); z.g = CHN.g; z.mv = CHS.G.uci.join(',');
  z.st = CHN.st; if (chnAmHost()) z.lob = chnPick();
  if (CHS.G.res) z.over = 1;
  if (CHN.rs) z.rs = 1;
  z.dr = CHN.dr;
  if (CHN.rm) z.rm = CHN.rm;
  chnSend(z);
}
function chnMoved() { CHN.dr = -1; chnSendNow(); chRenderSide(); }
function chnRead() {
  const G = CHS.G, o = chnOther(); if (!G) return;
  if (o && o.left === CHN.g && !G.res) { chEndBy({ w: CHS.me, why: 'resign', who: CHS.names[1] }); return; }
  if (!o || o.g !== CHN.g) return;
  CHN.seen = performance.now(); CHS.netMsg = '';
  const theirs = typeof o.mv === 'string' && o.mv ? o.mv.split(',').slice(0, 1200) : [];
  const mine = G.uci;
  if (!G.res && theirs.length > mine.length && mine.every((u, i) => theirs[i] === u)) {
    for (let i = mine.length; i < theirs.length; i++) {
      // (their moves only, on their turn; my own come from there only when I'm picking a game back up)
      if (G.P.side === CHS.me && !CHN.sync) break;
      const m = chFromUci(G.P, theirs[i], G.legal); if (!m) break;
      chApply(m);
      if (G.res) break;
    }
    CHN.sync = false;
    chnSendNow();
  } else if (CHN.sync && theirs.length <= mine.length) CHN.sync = false;
  if (!G.res && o.rs === 1) chEndBy({ w: CHS.me, why: 'resign', who: CHS.names[1] });
  if (!G.res && CHN.dr >= 0 && o.dr === CHN.dr && CHN.dr === G.uci.length) chEndBy({ w: 0, why: 'agreed' });
  chRenderSide();
}
function chnTick() {
  const now = performance.now();
  if (now - (CHN.tickT || 0) < 250) return; CHN.tickT = now;
  if (now - (CHN.sendT || 0) > 4000) { CHN.sendT = now; chnSendNow(); }
  if (!CHS.G || CHS.G.res) return;
  const quiet = now - CHN.seen;
  const was = CHS.netMsg;
  CHS.netMsg = quiet > 8000 ? `(Waiting for ${CHS.names[1]}: not heard from for ${Math.round(quiet / 1000)} seconds.)` : '';
  if (quiet > CHN_GONE) { CHS.netMsg = ''; chEndBy({ w: CHS.me, why: 'left', who: CHS.names[1] }); }
  if (was !== CHS.netMsg) chRenderSide();
}
// the draw button's words, as things stand
function chnDrawState() {
  const o = chnOther(), ply = CHS.G ? CHS.G.uci.length : 0;
  if (o && o.g === CHN.g && o.dr === ply && CHN.dr !== ply) return 'Accept their draw';
  if (CHN.dr === ply) return 'Draw offered';
  return 'Offer a draw';
}
function chnDraw() {
  if (!CHS.G || CHS.G.res) return;
  const ply = CHS.G.uci.length;
  CHN.dr = CHN.dr === ply ? -1 : ply;
  chnSendNow(); chnRead(); chRenderSide();
}
function chnResign() { CHN.rs = 1; CHN.leftG = CHN.g; chnSendNow(); }
function chnRematch() {
  if (!CHS.G) return;
  CHN.rm = CHN.g; CHN.lastRm = CHN.g; chnSendNow();
  $('chAgain').textContent = 'Waiting for them…'; $('chAgain').disabled = true;
  // (back to the card; the next game starts from there when both have asked)
  setTimeout(() => { $('chAgain').disabled = false; if (CHS.on && CHS.net && CHS.G && CHS.G.res) { const keep = CHN.lastRm; chExit(); CHN.lastRm = keep; chnSendLobby(); chNetPeers(); } }, 700);
}

(function chnInit() {
  if (!$('chMp')) return;
  $('chMpHost').addEventListener('click', chnHost);
  $('chMpStart').addEventListener('click', chnStart);
  $('chMpLeave').addEventListener('click', chnLeave);
  $('chMpRejoin').addEventListener('click', () => { if (chnInGame()) return; CHN.doneG = null; CHN.msg = ''; chNetPeers(); });
  for (const id of ['chVar', 'chSide', 'chNick']) { const el = $(id); if (el) el.addEventListener('change', () => { if (CHN.code && !chnInGame()) { chnSendLobby(); chnRender(); } }); }
  setInterval(() => { if (state === 'title') chnRender(); }, 1500);
  setInterval(() => { if (CHN.code && !chnInGame()) chnSendLobby(); }, 4000);
  // (a game in a background tab: the screen isn't drawn, but the moves still come and go)
  setInterval(() => { if (chnInGame() && document.hidden) { chnRead(); chnTick(); } }, 1000);
  chnRender();
})();
