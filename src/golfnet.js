'use strict';
// Skerry Links played together: a lobby on its card, and up to four in one round, each on their own screen.
//
// Like the Lighthouse's lobby (src/zmnet.js), it all goes through the room the crews sail in (src/net.js), on its own
// key (`gf`) in each player's presence: { room, sid, nick, at } in the lobby (the first in is the host, who adds lob,
// how many are in), and st once the host starts (the round: g its id, hum the players [sid, name], the holes, the wind
// and the meter, and the seed, so every screen has the same wind on every hole). server/server.js relays a round's
// players to each other at full rate, and only that much to everyone else, for the list.
// The host's screen keeps the round: whose go it is, where every ball lies, the strokes and the scores, and sends it
// as w (k the hole, t whose go, tk a count of goes, ph 'card' at a hole's end, P each player [x, y, strokes, holed,
// lie, left], sc the scorecard, ls the last shot). Whoever's go it is swings on their own screen and sends the shot as s
// ([seq, hole, stroke, club, aim, power, strike, putter scale, x, y, end x, end y, how, drop x, drop y, lie]); the host
// takes it, plays it back and passes it on in ls, so everyone sees the same ball fly. Every screen works the flight out
// from the same numbers (gfSim) and puts the ball where the striker's screen said it stopped.
// Leaving: a player gone for ten seconds is marked as left (their card stands; their goes are skipped). If the host
// goes, the round ends for everyone.

var GFN = { code: null, at: 0, msg: '', st: null, doneG: null, g: null, role: null, seq: 0, mine: null, lastS: {}, lsSeq: 0, ls: null, w: null, tk: 0, wT: 0, seen: {}, hostSeen: 0, sentAt: 0 };
const GFN_MAX = 4;
const gfnClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, n);
function gfnOnline() { return !!(typeof NET !== 'undefined' && NET.room && NET.status === 'ready'); }
function gfnNick() { return gfnClean(($('gfNick0') && $('gfNick0').value) || NET.nick || '', 16) || 'Golfer ' + String(NET.sid || '').slice(0, 3).toUpperCase(); }
function gfnOf(p) { const z = p && p.presence && p.presence.gf; return z && typeof z === 'object' && typeof z.room === 'string' && typeof z.sid === 'string' ? z : null; }
function gfnBase() { return { room: GFN.code, sid: NET.sid, nick: gfnNick(), at: GFN.at }; }
function gfnPeers(code) {
  const out = NET.peers.filter(p => { const z = gfnOf(p); return z && z.room === code && fresh(p) && !(p.isMe && p.sameTab); });
  if (GFN.code === code) out.push({ isMe: true, sameTab: true, presence: { gf: gfnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = gfnOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (gfnOf(a).at || 0) - (gfnOf(b).at || 0) || (gfnOf(a).sid < gfnOf(b).sid ? -1 : 1));
}
function gfnMembers() { return GFN.code ? gfnPeers(GFN.code).slice(0, GFN_MAX) : []; }
function gfnAmHost() { const m = gfnMembers(); return !!m.length && m[0].isMe && m[0].sameTab; }
function gfnSend(z) { if (NET.room) NET.room.presence({ gf: z }).catch(() => {}); }
function gfnSendLobby() { if (!GFN.code) return; const z = gfnBase(); if (gfnAmHost()) z.lob = { n: gfnMembers().length }; gfnSend(z); }
function gfnHost() {
  if (!gfnOnline() || GF.on) return;
  GFN.code = 'g' + Math.random().toString(36).slice(2, 8); GFN.at = Date.now(); GFN.msg = '';
  gfnSendLobby(); gfnRender();
}
function gfnJoin(code) {
  if (!gfnOnline() || !code || GF.on) return;
  if (gfnPeers(code).length >= GFN_MAX) { GFN.msg = 'That round is full (four players).'; gfnRender(); return; }
  GFN.code = code; GFN.at = Date.now(); GFN.msg = '';
  gfnSendLobby(); gfnRender();
}
function gfnLeave() { GFN.code = null; GFN.st = null; GFN.g = null; if (NET.room) NET.room.presence({ gf: null }).catch(() => {}); gfnRender(); }
// the rounds being hosted here
function gfnOpen() {
  const rooms = new Map();
  for (const p of NET.peers) { const z = gfnOf(p); if (!z || !fresh(p) || (p.isMe && p.sameTab)) continue; if (!rooms.has(z.room)) rooms.set(z.room, []); rooms.get(z.room).push(p); }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === GFN.code) continue;
    list.sort((a, b) => (gfnOf(a).at || 0) - (gfnOf(b).at || 0));
    const h = gfnOf(list[0]); out.push({ code, host: gfnClean(h.nick, 16) || 'Someone', n: list.length, started: !!(h.st && h.st.g) });
  }
  return out;
}
function gfnRender() {
  const q = id => $('gf' + id); if (!q('Mp')) return;
  const on = gfnOnline(), mine = !!GFN.code;
  q('MpNote').textContent = on ? 'Up to four, each on their own screen. One of you hosts; the others join, and the host tees off when everyone’s in.' : (NET.status === 'connecting' ? 'Looking for other players…' : (NET.offReason || 'Playing together isn’t available here. You can still play with up to four on this screen.'));
  q('MpOpen').hidden = !on || mine; q('Lobby').hidden = !mine;
  if (!on) return;
  if (!mine) {
    const L = gfnOpen(), el = q('Lobbies'), key = JSON.stringify(L) + GFN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key; el.textContent = '';
    if (GFN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = GFN.msg; el.append(p); }
    if (!L.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No one is hosting a round right now. Host one, and send the people you want to play with to this page.'; el.append(p); return; }
    for (const n of L) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `${n.host}’s round`;
      const sm = document.createElement('small'); sm.textContent = n.started ? 'under way' : `${n.n}/${GFN_MAX} players · tap to join`;
      b.append(nm, sm); b.disabled = n.started || n.n >= GFN_MAX; b.addEventListener('click', () => gfnJoin(n.code)); el.append(b);
    }
    return;
  }
  const m = gfnMembers(), host = gfnAmHost(), hz = m.length ? gfnOf(m[0]) : null;
  const key = m.map(p => gfnOf(p).sid + gfnOf(p).nick).join('|') + host + GFN.msg;
  q('MpStart').hidden = !host;
  if (q('Lobby').dataset.k === key) return; q('Lobby').dataset.k = key;
  q('LobbyHead').textContent = host ? 'Your round' : `${gfnClean(hz && hz.nick, 16) || 'Someone'}’s round`;
  const ol = q('LobbyList'); ol.textContent = '';
  m.forEach((p, k) => { const li = document.createElement('li'), z = gfnOf(p); li.textContent = (gfnClean(z.nick, 16) || 'A golfer') + (p.isMe && p.sameTab ? ' (you)' : '') + (k === 0 ? ' · hosting' : ''); if (p.isMe && p.sameTab) li.className = 'me'; ol.append(li); });
  q('LobbyMsg').textContent = GFN.msg || (host ? (m.length > 1 ? `${m.length} of ${GFN_MAX} here. Tee off when everyone’s in (the holes, wind and meter are yours to pick above).` : 'Waiting for others to join. You can tee off alone, too.') : 'Waiting for the host to tee off.');
}
// the host tees off, with everyone in the lobby
function gfnStart() {
  if (!gfnAmHost() || GF.on) return;
  const o = gfOptions(), m = gfnMembers();
  const st = { g: Math.random().toString(36).slice(2, 9), hum: m.map(p => [gfnOf(p).sid, gfnClean(gfnOf(p).nick, 16) || 'A golfer']), holes: o.holes, wind: o.wind, meter: o.meter, seed: (Math.random() * 4294967295) >>> 0 };
  gfnBegin(st, 'host');
}
function gfnBegin(st, role) {
  Object.assign(GFN, { st, g: st.g, doneG: st.g, role, seq: 0, mine: null, lastS: {}, lsSeq: 0, ls: null, w: null, tk: 0, wT: 0, seen: {}, hostSeen: performance.now(), hostTk: -1, sentAt: 0 });
  for (const [sid] of st.hum) GFN.seen[sid] = performance.now();
  gfStart({ net: { role }, names: st.hum.map(h => h[1]), sids: st.hum.map(h => h[0]), holes: st.holes, wind: st.wind, meter: st.meter, seed: st.seed });
}
// every change in the room (src/net.js): keep the lobby current, and start when the host does
function gfNetPeers() {
  if (GF.on && GF.mode === 'net') { gfnRead(); return; }
  if (GFN.code) {
    const m = gfnMembers();
    if (!m.some(p => p.isMe && p.sameTab)) { GFN.msg = 'That round filled up before you got in.'; gfnLeave(); return; }
    const h = m[0], hz = h ? gfnOf(h) : null;
    if (h && !(h.isMe && h.sameTab) && hz.st && typeof hz.st.g === 'string' && hz.st.g !== GFN.doneG && Array.isArray(hz.st.hum) && !GF.on) {
      if (hz.st.hum.some(x => Array.isArray(x) && x[0] === NET.sid)) {
        const s = hz.st, okH = Array.isArray(s.holes) ? s.holes.filter(v => Number.isInteger(v) && v >= 0 && v < 9).slice(0, 9) : null;
        gfnBegin({ g: s.g, hum: s.hum.slice(0, GFN_MAX).filter(Array.isArray).map(x => [String(x[0]), gfnClean(x[1], 16) || 'A golfer']), holes: okH && okH.length ? okH : [0, 1, 2, 3, 4, 5, 6, 7, 8], wind: GF_WIND[s.wind] ? s.wind : 'breezy', meter: GF_METER[s.meter] ? s.meter : 'normal', seed: s.seed >>> 0 }, 'client');
        return;
      }
      GFN.doneG = hz.st.g; GFN.msg = 'They teed off without you. Host your own round, or wait for the next.';
    }
    if (gfnAmHost() && performance.now() - (GFN.lobT || 0) > 3000) { GFN.lobT = performance.now(); gfnSendLobby(); }
  }
  gfnRender();
}

// ---------- during the round ----------
const gfnHostP = () => { const m = gfnMembers(); return m.length && !(m[0].isMe && m[0].sameTab) ? gfnOf(m[0]) : null; };
// my own shot, struck here: out to the others (the host keeps it as the last shot; a player sends it to the host)
function gfnShot(shot) {
  const R = gfSim(GF.H, shot.x, shot.y, shot.c, shot.a, shot.w, shot.e, GF.wind, shot.pu);
  const rec = [++GFN.seq, shot.k, shot.n, shot.c, +shot.a.toFixed(5), +shot.w.toFixed(4), +shot.e.toFixed(4), shot.pu, +shot.x.toFixed(3), +shot.y.toFixed(3), +R.end[0].toFixed(3), +R.end[1].toFixed(3), R.how, R.drop ? +R.drop[0].toFixed(2) : 0, R.drop ? +R.drop[1].toFixed(2) : 0, R.surf];
  if (GFN.role === 'host') { GFN.ls = [++GFN.lsSeq, GF.cur].concat(rec.slice(3)); GFN.sentAt = 0; }
  else GFN.mine = rec;
  gfnSendNow();
}
const gfnTold = r => ({ end: [r[10], r[11]], how: r[12], drop: [r[13], r[14]], surf: r[15] });
// after a shot's played back: the host goes on as ever; a player waits for the host's word on whose go it is
function gfnAfter() { if (GFN.role === 'host') return false; GF.ph = 'wait'; gfnApply(); return true; }
function gfnTurned() { if (GFN.role === 'host') { GFN.tk++; GFN.sentAt = 0; } }
function gfnCanNext() { return GFN.role === 'host'; }
function gfnCardNext() { return GFN.role !== 'host'; }
// a player may swing only when the host's word agrees it's their go
function gfnTurnOk() { if (GFN.role === 'host') return true; const w = GFN.w; return !!w && w.k === GF.hi && w.t === GF.cur && w.ph !== 'card' && GFN.hostTk === w.tk; }
function gfnStop() {
  GFN.g = null; GF.mode = 'solo';
  if (GFN.code) gfnSendLobby();
}
function gfnBackToLobby() { setTimeout(() => { if (GFN.code) gfnSendLobby(); gfnRender(); }, 50); }
// what goes in my presence: the base, the round's id, my last shot, and the host's word
function gfnSendNow() {
  if (!GFN.code) return;
  const z = gfnBase(); z.g = GFN.g;
  if (GFN.role === 'host') { z.st = GFN.st; z.w = gfnWord(); }
  else if (GFN.mine) z.s = GFN.mine;
  gfnSend(z); GFN.sentAt = performance.now();
}
function gfnWord() {
  return { k: GF.hi, t: GF.cur, tk: GFN.tk, ph: GF.ph === 'card' ? 'card' : '', ls: GFN.ls,
    P: GF.P.map(p => [Math.round(p.x * 100), Math.round(p.y * 100), p.st, p.done ? 1 : 0, p.lie, p.gone ? 1 : 0]), sc: GF.P.map(p => p.sc.map(v => v == null ? -1 : v)) };
}
// each frame: the host's word out a few times a second, and anyone who's gone
function gfnTick(dt) {
  const now = performance.now();
  if (GFN.role === 'host') {
    if (now - GFN.sentAt > 250) gfnSendNow();
    const m = gfnMembers(), here = new Set(m.map(p => gfnOf(p).sid));
    GF.P.forEach((p, i) => {
      if (p.gone || p.sid === NET.sid) return;
      if (here.has(p.sid)) GFN.seen[p.sid] = now;
      else if (now - (GFN.seen[p.sid] || 0) > 10000) { p.gone = true; p.done = true; gfSay(`${p.nm} has left the round.`, 3); if (i === GF.cur && (GF.ph === 'aim' || GF.ph === 'swing')) gfNextTurn(); }
    });
  } else {
    if (gfnHostP()) GFN.hostSeen = now;
    else if (now - GFN.hostSeen > 10000) { gfSay('The host has left, so the round is over.', 4); setTimeout(() => { if (GF.on && GF.mode === 'net') gfQuit(); }, 2500); GFN.hostSeen = now + 1e9; }
    if (now - GFN.sentAt > 1000) gfnSendNow();
  }
}
// the room changed during the round: the host reads the players' shots; a player reads the host's word
function gfnRead() {
  if (GFN.role === 'host') {
    for (const p of gfnMembers()) {
      const z = gfnOf(p); if (!z || (p.isMe && p.sameTab) || z.g !== GFN.g || !Array.isArray(z.s)) continue;
      const s = z.s, pi = GF.P.findIndex(q => q.sid === z.sid); if (pi < 0) continue;
      if ((GFN.lastS[z.sid] || 0) >= s[0]) continue;
      // only a shot for this hole, this stroke, on that player's go, while nothing else is in the air
      if (s[1] !== GF.hi || s[2] !== GF.P[pi].st || pi !== GF.cur || (GF.ph !== 'aim' && GF.ph !== 'swing')) { if (s[1] < GF.hi || s[2] < GF.P[pi].st) GFN.lastS[z.sid] = s[0]; continue; }
      GFN.lastS[z.sid] = s[0];
      const shot = { c: s[3] | 0, a: +s[4], w: +s[5], e: +s[6], pu: s[7] | 0, x: +s[8], y: +s[9], k: s[1], n: s[2] };
      GFN.ls = [++GFN.lsSeq, pi].concat(s.slice(3));
      gfPlayShot(pi, shot, gfnTold(s)); GFN.sentAt = 0;
    }
    return;
  }
  const hz = gfnHostP(); if (!hz || hz.g !== GFN.g || !hz.w) return;
  GFN.w = hz.w;
  gfnApply();
}
function gfnApply() {
  const w = GFN.w; if (!w || !GF.on) return;
  // a shot by someone else: played back here
  const ls = w.ls;
  if (Array.isArray(ls) && ls[0] > (GFN.lsSeen || 0)) {
    GFN.lsSeen = ls[0];
    const pi = ls[1] | 0, p = GF.P[pi];
    if (p && p.sid !== NET.sid && w.k === GF.hi && GF.ph !== 'fly' && GF.ph !== 'result') {
      const s = [0, w.k, 0].concat(ls.slice(2));
      gfPlayShot(pi, { c: s[3] | 0, a: +s[4], w: +s[5], e: +s[6], pu: s[7] | 0, x: +s[8], y: +s[9] }, gfnTold(s));
      return;
    }
  }
  if (GF.ph === 'fly' || GF.ph === 'result') return;
  // on to the next hole
  if (w.k > GF.hi) { gfnSync(w, true); $('gfCard').hidden = true; gfLoadHole(Math.min(GF.holes.length - 1, w.k)); GFN.hostTk = -1; }
  if (w.k !== GF.hi) return;
  gfnSync(w, false);
  if (w.ph === 'card') { if (GF.ph !== 'card') gfHoleDone(); return; }
  if (GFN.hostTk !== w.tk) { GFN.hostTk = w.tk; GF.cur = Math.max(0, Math.min(GF.P.length - 1, w.t | 0)); const keep = GFN.hostTk; gfReadyShot(); GFN.hostTk = keep; }
}
// the host's word for where everything lies, and the card so far
function gfnSync(w, cardOnly) {
  if (Array.isArray(w.sc)) w.sc.forEach((row, i) => { const p = GF.P[i]; if (p && Array.isArray(row)) row.forEach((v, k) => { if (k < p.sc.length) p.sc[k] = v >= 0 ? v | 0 : null; }); });
  if (cardOnly || !Array.isArray(w.P)) return;
  w.P.forEach((a, i) => { const p = GF.P[i]; if (!p || !Array.isArray(a)) return; p.x = (a[0] | 0) / 100; p.y = (a[1] | 0) / 100; p.st = a[2] | 0; p.done = !!a[3]; p.lie = GF_SURF[a[4]] ? a[4] : 'rough'; p.gone = !!a[5]; });
}

(function gfnInit() {
  if (!$('gfMp')) return;
  $('gfMpHost').addEventListener('click', gfnHost);
  $('gfMpStart').addEventListener('click', gfnStart);
  $('gfMpLeave').addEventListener('click', gfnLeave);
  setInterval(() => { if (state === 'title') gfnRender(); }, 1500);
  // (in the lobby, everyone says they're still here every few seconds, so a long wait doesn't look like leaving)
  setInterval(() => { if (GFN.code && !(GF.on && GF.mode === 'net')) gfnSendLobby(); }, 4000);
  gfnRender();
})();
