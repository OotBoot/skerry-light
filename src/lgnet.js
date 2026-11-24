'use strict';
// Skerry League played online: a lobby on its card, and up to six in one match, each on their own screen.
//
// Like Skerry Links' lobby (src/golfnet.js), it all goes through the room the crews sail in (src/net.js), on its own key
// (`lg`) in each player's presence: { room, sid, nick, at, bt, sk, tm } in the lobby (the match's code, who you are, when
// you came in, your ship and her skin, and the side you'd like: tm 0 Blue, 1 Orange, -1 either). The first in is the
// host, who adds lob { n, sz, mn, sk, fl }: how many are in and the match the host has picked on the card (ships a side,
// minutes, the bots, the fleet). server/server.js relays one match's players to each other at full rate, and only
// that much to everyone else, for the list.
// The seats (lgnSeats): everyone in the lobby goes on the side they asked for while it has room, the rest to whichever
// side has fewer people, and the sides grow to fit (four people make at least two a side; six, three). Every seat left
// over is a bot. The host presses Kick off together and puts st { g the match's id, sz, mn, sk, fl, seats } in its
// presence, each seat [sid ('' for a bot), team, slot, boat, skin, name]; every screen then starts the match with
// lgStart({ net: { role, seats, g } }) (src/league.js).
// During the match each screen sails its own ship with no delay, and about fifteen times a second (ten on claude.ai)
// puts where she is in its presence as p [seq, x, y, h, v, bv, rudder, w, gale, galeOn, sail]. The host's screen
// also runs the bots, the ball, the gale buoys, the clock and the score, and sends them as w (lgnWord): the phase and
// its timer, the clock, overtime, the score, the kickoff count (ko), the ball [x, y, z, vx, vy, vz], the buoys that
// are down (pd, a bit each), the bots' ships (bt), each seat's goals and touches, the goals so far (gs, and the last
// as ge), and for each player the last pose it has heard (pk, so each can time the round trip) and its word on their
// last hit (hk [seq, 1 taken or 0 not]).
// The others' ships are drawn where they were last heard to be, carried on by their speed and turn for as long ago as
// that was, and slid there smoothly (lgnPlace).
// The ball, on everyone's screen but the host's, is a forecast: it flies, bounces and is struck here as on the host's,
// and each snapshot pulls it back to the host's ball carried on by half the round trip (lgnBall). When your own ship
// strikes it, your screen sends the hit as hq [seq, x, y, z, vx, vy, vz]: where you saw the ball and how it flew off.
// The host takes it if its own ball was within LGN_HIT_NEAR of there and nobody else struck it in the last tenth of a
// second, and puts its ball there and so; until the host's word on the hit comes back, your ball isn't pulled back.
// A gale buoy your ship takes is sent the same way (q [seq, buoy]); the host marks it down.
// Leaving: a player gone quiet for ten seconds, or out of the match (Leave, or the end card's way back), hands their
// ship to a bot on the host's screen; one who comes back (the lobby's list offers Rejoin to anyone whose seat it is)
// takes her back. If the host goes, the match ends for everyone else, and isn't recorded.
// The host's screen in a background tab: the browser stops drawing it, so a timer runs the match on there (lgnHidden);
// a background tab is also slowed by the browser, so the lobby asks the host to keep it in front.

var LGN = { code: null, at: 0, msg: '', tm: -1, st: null, doneG: null, g: null, role: null, seq: 0, sendT: 0, lobT: 0, seen: {}, hostSeen: 0,
  wSeen: -1, first: true, koSeen: 0, gSeen: 0, phSeen: '', otSeen: false, ended: false, lastP: {}, lastHq: {}, lastQ: {}, hk: {}, pk: {}, sentAt: {}, rtt: 160,
  hq: null, hseq: 0, hitAt: -1e9, q: null, qseq: 0, padAt: {}, samp: {}, back: {} };
const LGN_MAX = 6;
const LGN_GONE = 10000;     // ms without a word before a player (or the host) is taken to have gone
const LGN_HIT_NEAR = 16;    // m: how far the host's ball may be from where a player says they struck it
const lgnClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, n);
const lgnR = (v, k) => Math.round((+v || 0) * k) / k;
function lgnOnline() { return !!(typeof NET !== 'undefined' && NET.room && NET.status === 'ready'); }
function lgnInMatch() { return !!(LG.on && LG.net); }
function lgnNick() { return lgnClean(lgMyName() === 'You' ? (NET.nick || '') : lgMyName(), 16) || 'Sailor ' + String(NET.sid || '').slice(0, 3).toUpperCase(); }
function lgnOf(p) { const z = p && p.presence && p.presence.lg; return z && typeof z === 'object' && typeof z.room === 'string' && typeof z.sid === 'string' ? z : null; }
const lgnMine = p => !!(p && p.isMe && p.sameTab);
function lgnMyBoat() { const b = $('lgBoat'); return lgBoatOf((b && b.value) || 'brig').id; }
function lgnBase() { const bt = lgnMyBoat(); return { room: LGN.code, sid: NET.sid, nick: lgnNick(), at: LGN.at, bt, sk: lgMySkinId(bt), tm: LGN.tm }; }
function lgnPeers(code) {
  const out = NET.peers.filter(p => { const z = lgnOf(p); return z && z.room === code && fresh(p) && !lgnMine(p); });
  if (LGN.code === code) out.push({ isMe: true, sameTab: true, presence: { lg: lgnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = lgnOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (lgnOf(a).at || 0) - (lgnOf(b).at || 0) || (lgnOf(a).sid < lgnOf(b).sid ? -1 : 1));
}
function lgnMembers() { return LGN.code ? lgnPeers(LGN.code).slice(0, LGN_MAX) : []; }
function lgnAmHost() { const m = lgnMembers(); return !!m.length && lgnMine(m[0]); }
function lgnHostZ() { const m = lgnMembers(); return m.length && !lgnMine(m[0]) ? lgnOf(m[0]) : null; }
function lgnSend(z) { if (NET.room) NET.room.presence({ lg: z }).catch(() => {}); }
// the match the host has picked on the card
function lgnPick() { const v = id => $(id) ? $(id).value : ''; return { sz: lgClamp(+v('lgSize') || 2, 1, 3), mn: [3, 5, 7].includes(+v('lgMins')) ? +v('lgMins') : 5, sk: LG_SKILL[v('lgSkill')] ? v('lgSkill') : 'fair', fl: v('lgFleet') === 'same' ? 'same' : 'mixed', md: v('lgGame') === 'side' ? 'sd' : '' }; }
function lgnLob() { if (lgnAmHost()) return lgnPick(); const h = lgnHostZ(), l = h && h.lob; return l ? { sz: lgClamp(l.sz | 0 || 2, 1, 3), mn: [3, 5, 7].includes(l.mn) ? l.mn : 5, sk: LG_SKILL[l.sk] ? l.sk : 'fair', fl: l.fl === 'same' ? 'same' : 'mixed', md: l.md === 'sd' ? 'sd' : '' } : lgnPick(); }
// (Spindrift, md 'sd': two a side at most, so four in a match)
function lgnMaxOf(code) { const p = lgnPeers(code)[0], z = p && lgnOf(p), l = z && z.lob; return l && l.md === 'sd' ? 4 : LGN_MAX; }
function lgnSendLobby() {
  if (!LGN.code) return;
  const z = lgnBase();
  if (lgnAmHost()) z.lob = Object.assign({ n: lgnMembers().length }, lgnPick());
  lgnSend(z);
}
function lgnHost() {
  if (!lgnOnline() || lgnInMatch()) return;
  LGN.code = 'l' + Math.random().toString(36).slice(2, 8); LGN.at = Date.now(); LGN.msg = ''; LGN.doneG = null;
  lgnSendLobby(); lgnRender();
}
// join a match's lobby (or, with rejoin, step back into a match under way that has a seat for me)
function lgnJoin(code, rejoin) {
  if (!lgnOnline() || !code || lgnInMatch()) return;
  if (!rejoin && lgnPeers(code).length >= lgnMaxOf(code)) { LGN.msg = `That match is full (${lgnMaxOf(code) === 4 ? 'four' : 'six'} players).`; lgnRender(); return; }
  // (my join time goes after everyone already in, whatever my clock says, so a slow clock never puts me ahead of the host)
  const late = Math.max(0, ...lgnPeers(code).map(p => lgnOf(p).at || 0));
  LGN.code = code; LGN.at = Math.max(Date.now(), late + 1); LGN.msg = ''; LGN.doneG = null;
  lgnSendLobby(); lgnRender(); lgNetPeers();
}
function lgnLeave() { if (lgnInMatch()) return; LGN.code = null; LGN.st = null; LGN.g = null; LGN.role = null; if (NET.room) NET.room.presence({ lg: null }).catch(() => {}); lgnRender(); }
function lgnSide() { const seat = lgnSeats().find(z => z[0] === NET.sid); LGN.tm = seat ? 1 - seat[1] : (LGN.tm === 0 ? 1 : 0); lgnSendLobby(); lgnRender(); }
// the matches being hosted here
function lgnOpen() {
  const rooms = new Map();
  for (const p of NET.peers) { const z = lgnOf(p); if (!z || !fresh(p) || lgnMine(p)) continue; if (!rooms.has(z.room)) rooms.set(z.room, []); rooms.get(z.room).push(p); }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === LGN.code) continue;
    list.sort((a, b) => (lgnOf(a).at || 0) - (lgnOf(b).at || 0));
    const h = lgnOf(list[0]), st = h.st && typeof h.st.g === 'string' ? h.st : null;
    const mine = !!(st && Array.isArray(st.seats) && st.seats.some(x => Array.isArray(x) && x[0] === NET.sid));
    out.push({ code, host: lgnClean(h.nick, 16) || 'Someone', n: list.length, started: !!st, mine, max: h.lob && h.lob.md === 'sd' ? 4 : LGN_MAX, sd: !!(h.lob && h.lob.md === 'sd') });
  }
  return out;
}

// ---------- the seats ----------
// who sails where: everyone in the lobby (in the order they came), on the side they asked for while it has room and
// otherwise the side with fewer people; the sides as big as the host picked, or bigger to fit everyone; bots for the rest
function lgnSeats() {
  const m = lgnMembers(), L = lgnLob(), n = m.length, size = lgClamp(Math.max(L.sz, Math.ceil(n / 2)), 1, L.md === 'sd' ? 2 : 3);
  const side = [[], []];
  const left = [];
  for (const p of m) { const z = lgnOf(p); if ((z.tm === 0 || z.tm === 1) && side[z.tm].length < size) side[z.tm].push(z); else left.push(z); }
  for (const z of left) { const t = side[0].length <= side[1].length ? 0 : 1; if (side[t].length < size) side[t].push(z); else if (side[1 - t].length < size) side[1 - t].push(z); }
  const host = m.length ? lgnOf(m[0]) : null, ids = typeof BOATS !== 'undefined' ? BOATS.map(b => b.id) : ['brig'];
  const names = LG_BOTNAMES.slice(), seats = [];
  let k = 0;
  for (let t = 0; t < 2; t++) for (let i = 0; i < size; i++) {
    const z = side[t][i];
    if (z) { seats.push([z.sid, t, i, lgBoatOf(z.bt).id, typeof z.sk === 'string' ? z.sk.slice(0, 24) : '', lgnClean(z.nick, 16) || 'A sailor']); continue; }
    // (the bots sail the handier ships more often than the Carrier; or, with one fleet, the host's own ship)
    const r = ids[(k * 7 + t * 3 + i) % ids.length], bid = L.fl === 'same' && host ? lgBoatOf(host.bt).id : r === 'carrier' && (k % 3) ? 'brig' : r;
    seats.push(['', t, i, bid, '', names[(k * 5 + 3) % names.length]]); k++;
  }
  return seats;
}

function lgnRender() {
  const q = id => $('lg' + id); if (!q('Mp')) return;
  const on = lgnOnline(), mine = !!LGN.code;
  q('MpNote').textContent = on ? 'Up to six, each on their own screen, with bots in any empty seats. One of you hosts; the others join, and the host kicks off when everyone’s in.' : (NET.status === 'connecting' ? 'Looking for other players…' : (NET.offReason || 'Playing together isn’t available here. You can still play against the bots.'));
  q('MpOpen').hidden = !on || mine; q('Lobby').hidden = !mine;
  if (!on) return;
  if (!mine) {
    const L = lgnOpen(), el = q('Lobbies'), key = JSON.stringify(L) + LGN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key; el.textContent = '';
    if (LGN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = LGN.msg; el.append(p); }
    if (!L.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No one is hosting a match right now. Host one, and send the people you want to play with to this page.'; el.append(p); return; }
    for (const n of L) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `${n.host}’s match${n.sd ? ' · Spindrift' : ''}`;
      const sm = document.createElement('small'); sm.textContent = n.mine ? 'under way · tap to rejoin' : n.started ? 'under way' : `${n.n}/${n.max} players · tap to join`;
      b.append(nm, sm); b.disabled = !n.mine && (n.started || n.n >= n.max); b.addEventListener('click', () => lgnJoin(n.code, n.mine)); el.append(b);
    }
    return;
  }
  const m = lgnMembers(), host = lgnAmHost(), hz = m.length ? lgnOf(m[0]) : null, seats = lgnSeats(), L = lgnLob();
  const sideOf = sid => { const z = seats.find(x => x[0] === sid); return z ? LG_TEAMS[z[1]] : null; };
  // (a match under way that I dropped out of, with my seat still in it: back in)
  const st = !host && hz && hz.st && typeof hz.st.g === 'string' ? hz.st : null, back = !!(st && Array.isArray(st.seats) && st.seats.some(x => Array.isArray(x) && x[0] === NET.sid) && !(hz.w && hz.w.ph === 'e'));
  const key = JSON.stringify(m.map(p => [lgnOf(p).sid, lgnOf(p).nick, lgnOf(p).tm, lgnOf(p).bt])) + JSON.stringify(L) + host + back + !!st + LGN.msg;
  q('MpStart').hidden = !host; q('MpRejoin').hidden = !back; q('MpSwap').hidden = back || !!st;
  if (q('Lobby').dataset.k === key) return; q('Lobby').dataset.k = key;
  q('LobbyHead').textContent = host ? 'Your match' : `${lgnClean(hz && hz.nick, 16) || 'Someone'}’s match`;
  const ol = q('LobbyList'); ol.textContent = '';
  m.forEach((p, k) => {
    const li = document.createElement('li'), z = lgnOf(p), T = sideOf(z.sid), b = lgBoatOf(z.bt);
    li.textContent = (lgnClean(z.nick, 16) || 'A sailor') + (lgnMine(p) ? ' (you)' : '') + ` · ${b.name || b.id}` + (T ? ` · ${T.name}` : '') + (k === 0 ? ' · hosting' : '');
    if (T) li.style.color = T.col; if (lgnMine(p)) li.className = 'me'; ol.append(li);
  });
  const size = seats.length / 2, bots = seats.filter(z => !z[0]).length;
  const what = `${L.md === 'sd' ? 'Spindrift · ' : 'The Harbour Pool · '}${size} against ${size} · ${L.mn} minutes${bots ? ` · ${bots} ${LG_SKILL[L.sk] ? ({ easy: 'Easy', fair: 'Fair', hard: 'Hard' })[L.sk] : 'Fair'} bot${bots === 1 ? '' : 's'}` : ''}`;
  q('LobbyMsg').textContent = back ? 'Your match is still going. Rejoin it, and a bot hands your ship back.' : st && !host ? 'A match is under way. Wait here for the next one.' : LGN.msg || (host ? `${what}. Kick off when everyone’s in (the match is yours to pick above). Keep this tab in front while you host: the match runs on your screen.` : `${what}. Waiting for the host to kick off.`);
}

// ---------- starting ----------
function lgnStart() {
  if (!lgnAmHost() || lgnInMatch()) return;
  const L = lgnPick(), seats = lgnSeats(), st = { g: Math.random().toString(36).slice(2, 9), sz: seats.length / 2, mn: L.mn, sk: L.sk, fl: L.fl, md: L.md, seats };
  lgnBegin(st, 'host');
}
// the host's st, checked over before it's used on anyone else's screen
function lgnStOk(s) {
  if (!s || typeof s.g !== 'string' || !Array.isArray(s.seats)) return null;
  const seats = s.seats.slice(0, 6).filter(z => Array.isArray(z) && (z[1] === 0 || z[1] === 1)).map(z => [typeof z[0] === 'string' ? z[0].slice(0, 16) : '', z[1], lgClamp(z[2] | 0, 0, 2), lgBoatOf(z[3]).id, typeof z[4] === 'string' ? z[4].slice(0, 24) : '', lgnClean(z[5], 16) || 'A sailor']);
  if (!seats.length || seats.length % 2) return null;
  return { g: s.g.slice(0, 12), sz: seats.length / 2, mn: [3, 5, 7].includes(s.mn) ? s.mn : 5, sk: LG_SKILL[s.sk] ? s.sk : 'fair', fl: s.fl === 'same' ? 'same' : 'mixed', md: s.md === 'sd' && seats.length <= 4 ? 'sd' : '', seats };
}
function lgnBegin(st, role) {
  // (my counts start from the clock, so after a rejoin the host takes my ship, hits and buoys as newer than before I left)
  const base = Date.now();
  Object.assign(LGN, { st, g: st.g, doneG: st.g, role, seq: base, sendT: 0, seen: {}, hostSeen: performance.now(), wSeen: -1, first: true, koSeen: 0, gSeen: 0, phSeen: '', otSeen: false, ended: false,
    lastP: {}, lastHq: {}, lastQ: {}, hk: {}, pk: {}, sentAt: {}, hq: null, hseq: base, hitAt: -1e9, q: null, qseq: base, padAt: {}, samp: {}, back: {} });
  for (const z of st.seats) if (z[0]) LGN.seen[z[0]] = performance.now();
  lgStart({ size: st.sz, mins: st.mn, skill: st.sk, fleet: st.fl, game: st.md === 'sd' ? 'side' : 'pool', boat: lgnMyBoat(), net: { role, seats: st.seats, g: st.g } });
  LGN.koSeen = LG.ko;
  lgnSendNow();
}
// every change in the room (src/net.js): keep the lobby current, start when the host does, and read the match
function lgNetPeers() {
  if (lgnInMatch()) { lgnRead(); return; }
  if (LGN.code) {
    const m = lgnMembers();
    if (!m.some(lgnMine)) { LGN.msg = 'That match filled up before you got in.'; lgnLeave(); return; }
    const h = m[0], hz = h ? lgnOf(h) : null;
    if (h && !lgnMine(h) && hz.st && typeof hz.st.g === 'string' && hz.st.g !== LGN.doneG && !LG.on) {
      const st = lgnStOk(hz.st);
      if (st && st.seats.some(x => x[0] === NET.sid)) { lgnBegin(st, 'client'); return; }
      LGN.doneG = hz.st.g; LGN.msg = 'They kicked off without you. Wait here for the next match, or host your own.';
    }
    if (lgnAmHost() && performance.now() - (LGN.lobT || 0) > 3000) { LGN.lobT = performance.now(); lgnSendLobby(); }
  }
  lgnRender();
}
// out of the match (its end, Leave, or the host gone): back in the lobby
function lgnStop() {
  // (the side I sailed for stays my pick for the next match, unless I'd picked one already)
  const mine = LGN.st && LGN.st.seats.find(x => x[0] === NET.sid); if (mine && LGN.tm < 0) LGN.tm = mine[1];
  LGN.g = null; LGN.st = null; LGN.role = null;
  if (LGN.code) lgnSendLobby();
  setTimeout(lgnRender, 50);
}

// ---------- during the match ----------
function lgnSeatOf(sid) { return LG.ships.find(s => s.sid === sid) || null; }
// a ship as heard: [x, y, h, v, bv, rudder, w, gale, galeOn, sail]
function lgnPose(s) { if (LG.side) return sdPose(s); return [lgnR(s.x, 100), lgnR(s.y, 100), lgnR(s.h, 1000), lgnR(s.v, 100), lgnR(s.bv, 100), lgnR(s.rudder, 100), lgnR(s.w, 1000), Math.round(s.gale), s.galeOn ? 1 : 0, lgnR(s.sail, 100)]; }
function lgnHeard(s, a, now) {
  if (LG.side) return sdHeard(s, a, now);
  if (!Array.isArray(a) || a.length < 10 || !a.slice(0, 7).every(Number.isFinite)) return;
  const x = lgClamp(a[0], -LGC.AX - 5, LGC.AX + 5), y = lgClamp(a[1], -LGC.AY - LGC.GD, LGC.AY + LGC.GD);
  const first = !LGN.samp[s.i];
  LGN.samp[s.i] = { t: now, x, y, h: lgAng(a[2]), v: lgClamp(a[3], -20, 200), bv: lgClamp(a[4], 0, 60), rudder: lgClamp(a[5], -1, 1), w: lgClamp(a[6], -6, 6), gale: lgClamp(+a[7] || 0, 0, 100), galeOn: !!a[8], sail: Math.max(LGC.SAIL0, +a[9] || 0) };
  if (first) { s.x = x; s.y = y; s.h = lgAng(a[2]); }
}
// each frame: the others' ships where they are, the host's word or my own out, and anyone who's gone
function lgnTick(dt) {
  const now = performance.now();
  lgnPlace(dt, now);
  LGN.sendT -= dt;
  if (LGN.sendT <= 0) { LGN.sendT = NET.via === 'claude' ? 0.1 : 1 / 15; lgnSendNow(); }
  if (LGN.role === 'host') {
    const here = new Map(lgnMembers().map(p => [lgnOf(p).sid, lgnOf(p)]));
    for (const s of LG.ships) {
      if (!s.sid || s.me) continue;
      const z = here.get(s.sid), inMatch = z && z.g === LGN.g;
      if (inMatch) LGN.seen[s.sid] = now;
      // gone quiet, or out of the match: a bot takes her over from where she is
      if (!s.bot && (!inMatch && (z || now - (LGN.seen[s.sid] || 0) > LGN_GONE))) { s.bot = true; delete LGN.samp[s.i]; s.ai.t = 0; if (LG.ph !== 'end') lgSay(`${s.nm} has left. A bot sails her now.`, 2.5); }
    }
  } else if (!LGN.ended) {
    const hz = lgnHostZ();
    if (hz && hz.g === LGN.g) LGN.hostSeen = now;
    if ((hz && hz.g !== LGN.g && LGN.wSeen >= 0) || now - LGN.hostSeen > LGN_GONE) { LGN.ended = true; lgSay('The host has left, so the match is over.', 4); setTimeout(() => { if (lgnInMatch()) lgQuit(); }, 2500); }
  }
}
// what goes in my presence: the base, the match, my ship, and (the host) the match's state, (the others) my claims
function lgnSendNow() {
  if (!LGN.code || !LGN.g) return;
  const z = lgnBase(), me = lgMeShip(); z.g = LGN.g;
  if (me) { z.p = [++LGN.seq].concat(lgnPose(me)); LGN.sentAt[LGN.seq] = performance.now(); delete LGN.sentAt[LGN.seq - 40]; }
  if (LGN.role === 'host') { z.st = LGN.st; z.w = lgnWord(); }
  else { if (LGN.hq) z.hq = LGN.hq; if (LGN.q) z.q = LGN.q; }
  lgnSend(z);
}
const LGN_PH = { count: 'c', play: 'p', goal: 'g', end: 'e' }, LGN_PHR = { c: 'count', p: 'play', g: 'goal', e: 'end' };
LGN.n = 0;
function lgnWord() {
  const B = LG.ball, last = LG.goals[LG.goals.length - 1];
  let pd = 0; LG.pads.forEach((p, i) => { if (p.t > 0) pd |= 1 << i; });
  return { n: ++LGN.n, ph: LGN_PH[LG.ph] || 'p', pt: lgnR(LG.phT, 100), ck: lgnR(LG.clock, 100), ot: LG.ot ? 1 : 0, sc: LG.score.slice(), ko: LG.ko,
    b: [lgnR(B.x, 100), lgnR(B.y, 100), lgnR(B.z, 100), lgnR(B.vx, 100), lgnR(B.vy, 100), lgnR(B.vz, 100)], bg: B.gone ? 1 : 0, pd,
    bt: LG.ships.filter(s => s.bot).map(s => [s.i].concat(lgnPose(s))),
    gl: LG.ships.map(s => s.goals), tc: LG.ships.map(s => s.touches), gs: LG.goals.length, ge: last ? [last.team, last.byI == null ? -1 : last.byI, last.own ? 1 : 0] : null,
    pk: Object.assign({}, LGN.pk), hk: Object.assign({}, LGN.hk) };
}
// the room changed: the host reads everyone's ship, hits and buoys; the others read the host's word and everyone's ship
function lgnRead() {
  const now = performance.now(), host = LGN.role === 'host';
  for (const p of lgnMembers()) {
    if (lgnMine(p)) continue;
    const z = lgnOf(p); if (!z || z.g !== LGN.g) continue;
    const s = lgnSeatOf(z.sid);
    if (s && Array.isArray(z.p) && z.p[0] > (LGN.lastP[z.sid] || 0)) {
      LGN.lastP[z.sid] = z.p[0];
      if (host) { LGN.pk[z.sid] = z.p[0]; if (s.bot && LG.ph !== 'end') { s.bot = false; lgSay(`${s.nm} is back.`, 2); } }
      if (!s.bot || !host) lgnHeard(s, z.p.slice(1), now);
    }
    if (host && s && !s.bot) {
      if (Array.isArray(z.hq) && z.hq[0] > (LGN.lastHq[z.sid] || 0)) { LGN.lastHq[z.sid] = z.hq[0]; LGN.hk[z.sid] = [z.hq[0], lgnTakeHit(s, z.hq) ? 1 : 0]; }
      if (Array.isArray(z.q) && z.q[0] > (LGN.lastQ[z.sid] || 0)) { LGN.lastQ[z.sid] = z.q[0]; const pd = LG.pads[z.q[1] | 0]; if (pd && pd.t <= 0) pd.t = pd.back; }
    }
  }
  if (host) return;
  const hz = lgnHostZ(); if (!hz || hz.g !== LGN.g || !hz.w || typeof hz.w !== 'object') return;
  if (!(hz.w.n > LGN.wSeen)) return;
  LGN.wSeen = hz.w.n;
  lgnApply(hz.w, now);
}
// the host: a player's word that their ship struck the ball
function lgnTakeHit(s, h) {
  const B = LG.ball;
  if (LG.ph !== 'play' || B.gone || h.length < 7 || !h.slice(1, 7).every(Number.isFinite)) return false;
  if (Math.hypot(B.x - h[1], B.y - h[2]) > LGN_HIT_NEAR) return false;
  if (LG.lastHitBy && LG.lastHitBy !== s && LG.t - LG.lastHitT < 0.1) return false;   // (someone else got there first)
  if (LG.side) sdTakeClamp(B, h);
  else { B.x = lgClamp(h[1], -LGC.AX + LGC.R, LGC.AX - LGC.R); B.y = lgClamp(h[2], -LGC.AY - LGC.GD + LGC.R, LGC.AY + LGC.GD - LGC.R); B.z = lgClamp(h[3], LGC.FLOAT, 70);
  B.vx = h[4]; B.vy = h[5]; B.vz = lgClamp(h[6], -40, 30); }
  const sp = Math.hypot(B.vx, B.vy); if (sp > 120) { B.vx *= 120 / sp; B.vy *= 120 / sp; }
  if (LG.last !== s || LG.t - LG.lastHitT > 0.3) { s.touches++; LG.hits++; }
  LG.prev = LG.last && LG.last !== s ? LG.last : LG.prev; LG.last = s; LG.lastHitT = LG.t; LG.lastHitBy = s;
  lgSnd('hit', Math.min(1, sp / 60));
  return true;
}
// my own ship struck the ball here: to the host
function lgnHit(B) {
  LGN.hq = [++LGN.hseq, lgnR(B.x, 100), lgnR(B.y, 100), lgnR(B.z, 100), lgnR(B.vx, 100), lgnR(B.vy, 100), lgnR(B.vz, 100)];
  LGN.hitAt = performance.now();
  LGN.sendT = Math.min(LGN.sendT, 0.01);
}
// my own ship took a gale buoy here: to the host
function lgnPad(i) { if (i < 0) return; LGN.q = [++LGN.qseq, i]; LGN.padAt[i] = performance.now(); LGN.sendT = Math.min(LGN.sendT, 0.01); }
// everyone but the host: the host's word on the match
function lgnApply(w, now) {
  const ph = LGN_PHR[w.ph] || 'play';
  // the round trip, from the last ship of mine the host has heard
  const pk = w.pk && w.pk[NET.sid], at = LGN.sentAt[pk];
  if (at) { LGN.rtt += (lgClamp(now - at, 20, 1500) - LGN.rtt) * 0.2; delete LGN.sentAt[pk]; }
  // a new kickoff: everyone on their marks
  if (w.ko !== LGN.koSeen) { LGN.koSeen = w.ko; if (ph === 'count') { const g = LG.ships.map(s => s.goals), t = LG.ships.map(s => s.touches); lgKickoff(); LG.ships.forEach((s, i) => { s.goals = g[i]; s.touches = t[i]; }); for (const k in LGN.samp) delete LGN.samp[k]; } }
  if (LGN.phSeen === 'count' && ph === 'play') { lgSnd('go'); lgSay('Go!', 0.8); }
  if (w.ot && !LGN.otSeen && !LGN.first) { lgSay('Overtime! Next goal wins', 2.5); lgSnd('horn'); }
  LGN.otSeen = !!w.ot; LGN.phSeen = ph;
  LG.ph = ph; LG.phT = +w.pt || 0; LG.clock = +w.ck || 0; LG.ot = !!w.ot;
  if (Array.isArray(w.sc)) LG.score = [w.sc[0] | 0, w.sc[1] | 0];
  if (Array.isArray(w.gl)) w.gl.forEach((v, i) => { if (LG.ships[i]) LG.ships[i].goals = v | 0; });
  if (Array.isArray(w.tc)) w.tc.forEach((v, i) => { if (LG.ships[i]) LG.ships[i].touches = v | 0; });
  // the bots (and any ship a bot has taken over: mine, if I've just come back, is put where the bot left her)
  const bots = new Set();
  if (Array.isArray(w.bt)) for (const a of w.bt) {
    if (!Array.isArray(a)) continue; const s = LG.ships[a[0] | 0]; if (!s) continue; bots.add(s.i);
    if (s.me) { if (LGN.first) { s.x = +a[1] || 0; s.y = +a[2] || 0; s.h = +a[3] || 0; } continue; }
    s.bot = true; lgnHeard(s, a.slice(1), now);
  }
  for (const s of LG.ships) if (s.sid && !s.me && s.bot && !bots.has(s.i)) s.bot = false;
  // the goals
  if (LGN.first) LGN.gSeen = w.gs | 0;
  if ((w.gs | 0) > LGN.gSeen && Array.isArray(w.ge)) { LGN.gSeen = w.gs | 0; const by = w.ge[1] >= 0 ? LG.ships[w.ge[1]] || null : null; lgGoalShow(w.ge[0] ? 1 : 0, by, !!w.ge[2]); }
  // the gale buoys: down where the host says, up again where it says (unless I've only just taken one)
  const pd = w.pd | 0;
  LG.pads.forEach((p, i) => { const down = !!(pd & (1 << i)); if (down && p.t <= 0) p.t = p.back * 0.9; else if (!down && p.t > 0 && now - (LGN.padAt[i] || -1e9) > 900) p.t = 0; });
  lgnBall(w, now);
  LGN.first = false;
  if (ph === 'end' && !LGN.ended) { LGN.ended = true; LG.ball.gone = !!w.bg; lgEnd(); }
}
// the ball: the host's, carried on by half the round trip; mine is pulled to it, unless my own hit is still on its way
function lgnBall(w, now) {
  const B = LG.ball, b = w.b; if (!Array.isArray(b) || b.length < 6 || !b.every(Number.isFinite)) return;
  const was = B.gone; B.gone = !!w.bg;
  const hk = w.hk && w.hk[NET.sid], acked = Array.isArray(hk) && hk[0] >= LGN.hseq;
  if (!acked && now - LGN.hitAt < 700 && !B.gone) return;
  const T = { x: b[0], y: b[1], z: b[2], vx: b[3], vy: b[4], vz: b[5], rx: 0, ry: 0, gone: B.gone };
  const lead = lgClamp(LGN.rtt / 2000, 0, 0.3);
  if (!T.gone && (LG.ph === 'play')) for (let t = 0; t < lead; t += 1 / 60) lgBallFly(T, Math.min(1 / 60, lead - t));
  const err = Math.hypot(T.x - B.x, T.y - B.y, T.z - B.z);
  if (was !== B.gone || err > 10 || LG.ph !== 'play') { B.x = T.x; B.y = T.y; B.z = T.z; B.vx = T.vx; B.vy = T.vy; B.vz = T.vz; return; }
  const k = 0.35; B.x += (T.x - B.x) * k; B.y += (T.y - B.y) * k; B.z += (T.z - B.z) * k; B.vx = T.vx; B.vy = T.vy; B.vz = T.vz;
}
// the ball's own flight a moment on (the water, the air and the walls; no ships, no goals), for the forecast
function lgBallFly(B, dt) {
  if (LG.side) return sdBallFly(B, dt);
  if (B.z > LGC.FLOAT + 0.05 || B.vz > 0) { B.vz -= LGC.G * dt; const k = Math.exp(-dt * 0.08); B.vx *= k; B.vy *= k; }
  else { const k = Math.exp(-dt * 0.32); B.vx *= k; B.vy *= k; B.vz = 0; B.z = LGC.FLOAT; }
  B.x += B.vx * dt; B.y += B.vy * dt; B.z += B.vz * dt;
  if (B.z < LGC.FLOAT) { B.z = LGC.FLOAT; B.vz = B.vz < -3 ? -B.vz * 0.42 : 0; }
  for (const wl of lgWalls()) { const d = lgSegHit(wl, B.x, B.y, LGC.R); if (d) { B.x += d.nx * d.pen; B.y += d.ny * d.pen; const vn = B.vx * d.nx + B.vy * d.ny; if (vn < 0) { B.vx -= 1.78 * vn * d.nx; B.vy -= 1.78 * vn * d.ny; } } }
}
// the others' ships: where each was last heard to be, carried on for as long ago as that was, and slid there
function lgnPlace(dt, now) {
  if (LG.side) return sdPlace(dt, now);
  const lead = lgClamp(LGN.rtt / 2000, 0, 0.15);
  for (const s of LG.ships) {
    if (lgOwn(s)) continue;
    const S = LGN.samp[s.i]; if (!S) continue;
    const age = lgClamp((now - S.t) / 1000 + lead, 0, 0.35), V = S.v + S.bv, hm = S.h + S.w * age / 2;
    const frozen = LG.ph === 'count' || LG.ph === 'end';
    const tx = frozen ? S.x : S.x + Math.sin(hm) * V * age, ty = frozen ? S.y : S.y + Math.cos(hm) * V * age, th = frozen ? S.h : lgAng(S.h + S.w * age);
    const d = Math.hypot(tx - s.x, ty - s.y);
    if (d > 30) { s.x = tx; s.y = ty; s.h = th; }
    else { const k = Math.min(1, dt * 14); s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; s.h = lgAng(s.h + lgAng(th - s.h) * k); }
    s.v = S.v; s.bv = S.bv; s.rudder = S.rudder; s.w = S.w; s.gale = S.gale; s.galeOn = S.galeOn; s.sail = S.sail;
  }
}
// names over the other people's ships, so a friend is told from a bot
function lgnTags() {
  let box = $('lgTags');
  if (!box) { box = document.createElement('div'); box.id = 'lgTags'; box.className = 'lg-tags'; $('lgUI').append(box); }
  box.hidden = !!LG.side; if (LG.side) return;   // (Spindrift draws its names on its own canvas)
  if (typeof L3 === 'undefined' || !L3.cam || typeof THREE === 'undefined') return;
  const w = innerWidth, h = innerHeight, v = new THREE.Vector3();
  for (const s of LG.ships) {
    let el = box.querySelector(`[data-i="${s.i}"]`);
    if (!s.sid || s.me || LG.ph === 'end') { if (el) el.hidden = true; continue; }
    if (!el) { el = document.createElement('span'); el.dataset.i = s.i; el.style.color = LG_TEAMS[s.team].col; box.append(el); }
    const t = s.nm + (s.bot ? ' · bot' : ''); if (el.textContent !== t) el.textContent = t;
    v.copy(lv(s.x, s.y, 10 + s.boat.len * 0.75)).project(L3.cam);
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { el.hidden = true; continue; }
    el.hidden = false; el.style.transform = `translate(${Math.round((v.x + 1) / 2 * w)}px, ${Math.round((1 - v.y) / 2 * h)}px) translate(-50%, -100%)`;
  }
}
// the host's screen in a background tab isn't drawn, so the match runs on here (the browser slows this timer too)
function lgnHidden() {
  const now = performance.now(), dt = Math.min(1.5, (now - (LGN.hidT || now)) / 1000); LGN.hidT = now;
  if (!document.hidden || !lgnInMatch() || LGN.role !== 'host' || dt <= 0) return;
  LG.t += dt;
  for (let left = dt; left > 1e-4; left -= 0.05) lgSim(Math.min(0.05, left));
}

(function lgnInit() {
  if (!$('lgMp')) return;
  $('lgMpHost').addEventListener('click', lgnHost);
  $('lgMpStart').addEventListener('click', lgnStart);
  $('lgMpSwap').addEventListener('click', lgnSide);
  $('lgMpLeave').addEventListener('click', lgnLeave);
  $('lgMpRejoin').addEventListener('click', () => { if (lgnInMatch()) return; LGN.doneG = null; LGN.msg = ''; lgNetPeers(); });
  // (the host's picks and anyone's ship, out to the lobby as they change)
  for (const id of ['lgGame', 'lgSize', 'lgMins', 'lgSkill', 'lgFleet', 'lgBoat', 'lgNick']) { const el = $(id); if (el) el.addEventListener('change', () => { if (LGN.code && !lgnInMatch()) { lgnSendLobby(); lgnRender(); } }); }
  setInterval(() => { if (state === 'title') lgnRender(); }, 1500);
  // (in the lobby, everyone says they're still here every few seconds, so a long wait doesn't look like leaving)
  setInterval(() => { if (LGN.code && !lgnInMatch()) lgnSendLobby(); }, 4000);
  setInterval(lgnHidden, 100);
  lgnRender();
})();
