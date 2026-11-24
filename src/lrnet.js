'use strict';
// The Lamp Road played online: a lobby on its card, and up to ten people in one match, each on their own screen.
//
// Like Skerry League's (src/lgnet.js), it all goes through the room the crews sail in (src/net.js), on its own key
// (`lr`) in each player's presence: { room, sid, nick, at, tm } in the lobby (the match's code, which starts with p,
// who you are, when you came in, and the side you'd like: tm 0 the Lamplighters, 1 the Wreckers, -1 either, as the
// card's Your side has it). The first in is the host, who adds lob { n, sk }: how many are in, and the bots' skill
// picked on the host's card. server/server.js relays one match's players to each other at full rate, and to everyone
// else only enough for the list (lrLite: the code, the host, and whose the seats are).
// The seats (lrnSeats): everyone in the lobby goes on the side they asked for while it has room (five a side), the
// rest to whichever side has fewer people; every seat left over is a bot. The host presses Start together and puts
// st { g the match's id, sk, seats } in its presence, ten seats [sid ('' for a bot), team, name, hero ''] in seat
// order (0-4 the Lamplighters, 5-9 the Wreckers); every screen then starts the match with lrStart({ skill, net: { role,
// seats, g } }) (src/lr.js), and people pick their heroes in the match's own pick.
// During the match the host's screen runs everything (the bots, the shots, the damage, the Wain, the clock), and
// about fourteen times a second (ten on claude.ai) puts w { n, T, s, k } in its presence: T its clock, s the match as lrSnap() packs it
// (every body, the Wain, the bulkheads, zones and things in flight, the feed, and the events since the last one), k
// for each player the last of their poses it took (so each screen can tell how far its own body ran ahead).
// Everyone else's screen moves its own body itself, with no delay (lrOwnStep), and as often puts in its presence
// p [seq, sn, x, y, z, vx, vy, vz, yaw, pitch, mx, mz, held, tapped, flags]: where it is (sn, how many times it has
// come back, so a pose from before a death is never taken), which buttons are held, and which were pressed at all
// since the last send (so a tap between sends isn't lost); u [n, 1 | 2, x, y, z, yaw], the last movement ability it
// used (Ballast Rush, Gull's Rise, the Wisp's blink, which its own screen moved it through), for the host to start its
// cooldown and its effect; and h, a hero it asks for (taken in the pick, in its spawn or while it's down).
// The host takes each person's pose as theirs (p.remote: its sim never moves that body), carried on by its speed for
// as long ago as it was sent and slid there (lrnPlace), with a jump further than anyone can move clamped; their
// buttons drive their shots and abilities there. On the others' screens every other body is slid the same way to where
// the host's last word had it; their own shots show and sound at once (src/lr.js lrGuestFire) while what they hit is
// the host's to say, and a knock the host gives their body comes as an event.
// Leaving: a player gone quiet for ten seconds, or out of the match, is played by a bot on the host's screen until
// they come back (the lobby's list, and the rejoin bar, src/rejoin.js, offer Rejoin to anyone whose seat it is). If
// the host goes, the match ends for everyone. The host's screen in a background tab isn't drawn, so a timer runs the
// match on there (lrnHidden); the browser slows that timer too, so the lobby asks the host to keep the tab in front.

var LRN = { code: null, at: 0, msg: '', st: null, doneG: null, g: null, role: null, hostSid: '', off: null, seq: 0, sendT: 0, lobT: 0, seen: {}, was: {}, hostSeen: 0, wSeen: -1,
  first: true, ended: false, lastP: {}, lastU: {}, samp: {}, pend: {}, fresh: {}, k: {}, hist: {}, tap: 0, n: 0, cart: null, placeT: -1, heroReq: '', heroAt: 0, hidT: 0 };
var LRN_MAX = 10;
var LRN_GONE = 10000;   // ms without a word before a player (or the host) is taken to have gone
const lrnClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, n);
const lrnR = (v, k) => Math.round((+v || 0) * k) / k;
const lrnMine = p => !!(p && p.isMe && p.sameTab);
const LRN_BTN = ['fire', 'alt', 'a1', 'a2', 'ult', 'reload', 'jump'];
function lrnOnline() { return !!(typeof NET !== 'undefined' && NET.room && NET.status === 'ready'); }
function lrnInMatch() { return !!(LRM.on && LRM.net); }
function lrnNick() { const n = lrMyName(); return lrnClean(n === 'You' ? (NET.nick || '') : n, 16) || 'Keeper ' + String(NET.sid || '').slice(0, 3).toUpperCase(); }
function lrnOf(p) { const z = p && p.presence && p.presence.lr; return z && typeof z === 'object' && typeof z.room === 'string' && typeof z.sid === 'string' ? z : null; }
function lrnTm() { const v = $('lrSide') ? $('lrSide').value : 'r'; return v === '0' ? 0 : v === '1' ? 1 : -1; }
function lrnBase() { return { room: LRN.code, sid: NET.sid, nick: lrnNick(), at: LRN.at, tm: lrnTm() }; }
function lrnPeers(code) {
  const out = NET.peers.filter(p => { const z = lrnOf(p); return z && z.room === code && fresh(p) && !lrnMine(p); });
  if (LRN.code === code) out.push({ isMe: true, sameTab: true, presence: { lr: lrnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = lrnOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (lrnOf(a).at || 0) - (lrnOf(b).at || 0) || (lrnOf(a).sid < lrnOf(b).sid ? -1 : 1));
}
function lrnMembers() { return LRN.code ? lrnPeers(LRN.code).slice(0, LRN_MAX) : []; }
function lrnAmHost() { const m = lrnMembers(); return !!m.length && lrnMine(m[0]); }
// the host: in the lobby, the first in; in a match, whoever started it (so the next in line isn't taken for them)
function lrnHostZ() {
  const m = lrnMembers();
  if (LRN.hostSid) { const h = m.find(p => !lrnMine(p) && lrnOf(p).sid === LRN.hostSid); return h ? lrnOf(h) : null; }
  return m.length && !lrnMine(m[0]) ? lrnOf(m[0]) : null;
}
function lrnSend(z) { if (NET.room) NET.room.presence({ lr: z }).catch(() => {}); }
// the match the host has picked on the card: the bots' skill (the rest of the match is the same every time)
function lrnPick() { const v = $('lrSkill') ? $('lrSkill').value : 'fair'; return { sk: LR_SKILL[v] ? v : 'fair' }; }
function lrnLob() { if (lrnAmHost()) return lrnPick(); const h = lrnHostZ(), l = h && h.lob; return { sk: l && LR_SKILL[l.sk] ? l.sk : 'fair' }; }
function lrnSendLobby() {
  if (!LRN.code) return;
  const z = lrnBase();
  if (lrnAmHost()) z.lob = Object.assign({ n: lrnMembers().length }, lrnPick());
  lrnSend(z);
}
function lrnHost() {
  if (!lrnOnline() || lrnInMatch()) return;
  LRN.code = 'p' + Math.random().toString(36).slice(2, 8); LRN.at = Date.now(); LRN.msg = ''; LRN.doneG = null; LRN.hostSid = '';
  lrnSendLobby(); lrnRender();
}
// join a match's lobby (or, with rejoin, step back into a match under way that has a seat for me)
function lrnJoin(code, rejoin) {
  if (!lrnOnline() || !code || lrnInMatch()) return;
  if (!rejoin && lrnPeers(code).length >= LRN_MAX) { LRN.msg = 'That match is full (ten players).'; lrnRender(); return; }
  // (my join time goes after everyone already in, whatever my clock says, so a slow clock never puts me ahead of the host)
  const late = Math.max(0, ...lrnPeers(code).map(p => lrnOf(p).at || 0));
  LRN.code = code; LRN.at = Math.max(Date.now(), late + 1); LRN.msg = ''; LRN.doneG = null; LRN.hostSid = '';
  lrnSendLobby(); lrnRender(); lrNetPeers();
}
function lrnLeave() { if (lrnInMatch()) return; LRN.code = null; LRN.st = null; LRN.g = null; LRN.role = null; LRN.hostSid = ''; if (typeof NET !== 'undefined' && NET.room) NET.room.presence({ lr: null }).catch(() => {}); lrnRender(); }
function lrnSide() { const seat = lrnSeats().find(z => z[0] === NET.sid), t = seat ? 1 - seat[1] : 0, el = $('lrSide'); if (el) el.value = String(t); lrnSendLobby(); lrnRender(); }
// the matches being hosted here
function lrnOpen() {
  const rooms = new Map();
  for (const p of NET.peers) { const z = lrnOf(p); if (!z || !fresh(p) || lrnMine(p)) continue; if (!rooms.has(z.room)) rooms.set(z.room, []); rooms.get(z.room).push(p); }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === LRN.code) continue;
    list.sort((a, b) => (lrnOf(a).at || 0) - (lrnOf(b).at || 0));
    const h = lrnOf(list[0]), st = h.st && typeof h.st.g === 'string' ? h.st : null, over = !!(h.ov || (h.w && h.w.ov));
    const mine = !!(st && !over && Array.isArray(st.seats) && st.seats.some(x => Array.isArray(x) && x[0] === NET.sid));
    out.push({ code, host: lrnClean(h.nick, 16) || 'Someone', n: list.length, started: !!st, mine });
  }
  return out;
}

// ---------- the seats ----------
// who plays where: everyone in the lobby (in the order they came), on the side they asked for while it has room and
// otherwise the side with fewer people; bots for the rest. Bots' names are dealt when the match starts.
function lrnSeats() {
  const m = lrnMembers(), side = [[], []], left = [];
  for (const p of m) { const z = lrnOf(p); if ((z.tm === 0 || z.tm === 1) && side[z.tm].length < 5) side[z.tm].push(z); else left.push(z); }
  for (const z of left) { const t = side[0].length <= side[1].length ? 0 : 1; (side[t].length < 5 ? side[t] : side[1 - t]).push(z); }
  const seats = [];
  for (let t = 0; t < 2; t++) for (let i = 0; i < 5; i++) { const z = side[t][i]; seats.push(z ? [z.sid, t, lrnClean(z.nick, 16) || 'A keeper', ''] : ['', t, '', '']); }
  return seats;
}

function lrnRender() {
  const q = id => $('lr' + id); if (!q('Mp') || !q('MpNote')) return;
  const on = lrnOnline(), mine = !!LRN.code;
  q('MpNote').textContent = on ? 'Up to ten, each on their own screen, with bots in every empty seat. One of you hosts; the others join, and the host starts when everyone’s in.' : (typeof NET !== 'undefined' && NET.status === 'connecting' ? 'Looking for other players…' : ((typeof NET !== 'undefined' && NET.offReason) || 'Playing together isn’t available here. You can still play against the bots.'));
  q('MpOpen').hidden = !on || mine; q('Lobby').hidden = !mine;
  if (!on) return;
  if (!mine) {
    const L = lrnOpen(), el = q('Lobbies'), key = JSON.stringify(L) + LRN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key; el.textContent = '';
    if (LRN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = LRN.msg; el.append(p); }
    if (!L.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No one is hosting a match right now. Host one, and send the people you want to play with to this page.'; el.append(p); return; }
    for (const n of L) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `${n.host}’s match`;
      const sm = document.createElement('small'); sm.textContent = n.mine ? 'under way · tap to rejoin' : n.started ? 'under way' : `${n.n}/${LRN_MAX} players · tap to join`;
      b.append(nm, sm); b.disabled = !n.mine && (n.started || n.n >= LRN_MAX); b.addEventListener('click', () => lrnJoin(n.code, n.mine)); el.append(b);
    }
    return;
  }
  const m = lrnMembers(), host = lrnAmHost(), hz = m.length ? lrnOf(m[0]) : null, seats = lrnSeats(), L = lrnLob();
  const sideOf = sid => { const z = seats.find(x => x[0] === sid); return z ? LR_TEAMS[z[1]] : null; };
  // (a match under way that I dropped out of, with my seat still in it: back in)
  const st = !host && hz && hz.st && typeof hz.st.g === 'string' ? hz.st : null, over = !!(hz && hz.w && hz.w.ov);
  const back = !!(st && !over && Array.isArray(st.seats) && st.seats.some(x => Array.isArray(x) && x[0] === NET.sid));
  const key = JSON.stringify(m.map(p => [lrnOf(p).sid, lrnOf(p).nick, lrnOf(p).tm])) + JSON.stringify(L) + host + back + !!st + LRN.msg;
  q('MpStart').hidden = !host; q('MpRejoin').hidden = !back; q('MpSwap').hidden = back || !!st;
  if (q('Lobby').dataset.k === key) return; q('Lobby').dataset.k = key;
  q('LobbyHead').textContent = host ? 'Your match' : `${lrnClean(hz && hz.nick, 16) || 'Someone'}’s match`;
  const ol = q('LobbyList'); ol.textContent = '';
  m.forEach((p, k) => {
    const li = document.createElement('li'), z = lrnOf(p), T = sideOf(z.sid);
    li.textContent = (lrnClean(z.nick, 16) || 'A keeper') + (lrnMine(p) ? ' (you)' : '') + (T ? ` · ${T.name}` : '') + (z.tm !== 0 && z.tm !== 1 ? ' (either)' : '') + (k === 0 ? ' · hosting' : '');
    if (T) li.style.color = T.col; if (lrnMine(p)) li.className = 'me'; ol.append(li);
  });
  const bots = seats.filter(z => !z[0]).length, ppl = [0, 1].map(t => seats.filter(z => z[0] && z[1] === t).length);
  const what = `Gullhaven · ${ppl[0]} Lamplighter${ppl[0] === 1 ? '' : 's'} and ${ppl[1]} Wrecker${ppl[1] === 1 ? '' : 's'}${bots ? ` · ${bots} ${({ easy: 'Easy', fair: 'Fair', hard: 'Hard' })[L.sk] || 'Fair'} bot${bots === 1 ? '' : 's'}` : ''}`;
  q('LobbyMsg').textContent = back ? 'Your match is still going. Rejoin it, and a bot hands your seat back.' : st && !host ? 'A match is under way. Wait here for the next one.' : LRN.msg || (host ? `${what}. Start when everyone’s in (the bots’ skill is yours to pick above). Keep this tab in front while you host: the match runs on your screen.` : `${what}. Waiting for the host to start.`);
}

// ---------- starting ----------
function lrnStart() {
  if (!lrnAmHost() || lrnInMatch()) return;
  const seats = lrnSeats(), names = LR_BOTNAMES.map(l => l.slice().sort(() => Math.random() - 0.5));
  seats.forEach((z, i) => { if (!z[0]) z[2] = names[z[1]][i % 5]; });
  lrnBegin({ g: Math.random().toString(36).slice(2, 9), sk: lrnPick().sk, seats }, 'host', NET.sid);
}
// the host's st, checked over before it's used on anyone else's screen
function lrnStOk(s) {
  if (!s || typeof s.g !== 'string' || !Array.isArray(s.seats) || s.seats.length !== 10) return null;
  const seats = s.seats.map((z, i) => Array.isArray(z) ? [typeof z[0] === 'string' ? z[0].slice(0, 16) : '', i < 5 ? 0 : 1, lrnClean(z[2], 16) || 'A keeper', LR_HEROES[z[3]] ? z[3] : ''] : null);
  if (seats.some(z => !z)) return null;
  return { g: s.g.slice(0, 12), sk: LR_SKILL[s.sk] ? s.sk : 'fair', seats };
}
function lrnBegin(st, role, hostSid) {
  // (my counts start from the clock, so after a rejoin the host takes my poses and moves as newer than before I left)
  const base = Date.now(), now = performance.now();
  Object.assign(LRN, { st, g: st.g, doneG: st.g, role, hostSid: hostSid || '', off: null, seq: base, sendT: 0, seen: {}, was: {}, hostSeen: now, wSeen: -1, first: true, ended: false,
    lastP: {}, lastU: {}, samp: {}, pend: {}, fresh: {}, k: {}, hist: {}, tap: 0, n: 0, cart: null, placeT: -1, heroReq: '', heroAt: 0 });
  for (const z of st.seats) if (z[0]) LRN.seen[z[0]] = now;
  lrStart({ skill: st.sk, net: { role, seats: st.seats, g: st.g } });
  LRM.useN = base; LRM.use = null; LRM.ownUse = {}; LRM.meRef = null; LRM.shotAt = 0;
  if (role === 'host') { for (const p of LRM.P) if (p.sid && p.i !== LRM.me) p.remote = true; }
  else { const me = lrMe(); if (me) me.sn = -1; }   // (so the host's first word puts my body where it has it)
  lrnSendNow();
}
// every change in the room (src/net.js): keep the lobby current, start when the host does, and read the match
function lrNetPeers() {
  if (lrnInMatch()) { lrnRead(); return; }
  if (LRN.code) {
    const m = lrnMembers();
    if (!m.some(lrnMine)) { LRN.msg = 'That match filled up before you got in.'; lrnLeave(); return; }
    const h = m[0], hz = h ? lrnOf(h) : null;
    if (h && !lrnMine(h) && hz.st && typeof hz.st.g === 'string' && hz.st.g !== LRN.doneG && !LRM.on) {
      const st = lrnStOk(hz.st);
      if (st && st.seats.some(x => x[0] === NET.sid) && !(hz.w && hz.w.ov)) { lrnBegin(st, 'guest', hz.sid); return; }
      LRN.doneG = hz.st.g; LRN.msg = 'They started without you. Wait here for the next match, or host your own.';
    }
    if (lrnAmHost() && performance.now() - (LRN.lobT || 0) > 3000) { LRN.lobT = performance.now(); lrnSendLobby(); }
  }
  lrnRender();
}
// out of the match (its end, Leave, or the host gone): back in the lobby
function lrnStop() {
  // (the side I played for stays my pick for the next match, unless I'd asked for one already)
  const mine = LRN.st && LRN.st.seats.find(x => x[0] === NET.sid), el = $('lrSide'); if (mine && el && el.value === 'r') el.value = String(mine[1]);
  LRN.g = null; LRN.st = null; LRN.role = null; LRN.hostSid = '';
  if (LRN.code) lrnSendLobby();
  setTimeout(lrnRender, 50);
}

// ---------- during the match ----------
const lrnBtns = I => LRN_BTN.reduce((b, k, n) => b | (I[k] ? 1 << n : 0), 0);
// each frame, before the ticks: the others where they were last heard to be, carried on by their speed for as long ago
// as that was and slid there; on the host, a person's buttons and look into their input; on the others, the Wain,
// the clock and whatever's in flight carried on between the host's words
function lrnPlace(dt) {
  if (!lrnInMatch()) return;
  const now = performance.now(), host = lrHost();
  // (a person's taps since the last frame go into the ticks to come; once a tick has run with them, they're spent)
  if (host) { const ran = LRM.t !== LRN.placeT; for (const k in LRN.fresh) { LRN.pend[k] = (ran ? 0 : LRN.pend[k] || 0) | LRN.fresh[k]; LRN.fresh[k] = 0; } if (ran) for (const k in LRN.pend) if (!(k in LRN.fresh)) LRN.pend[k] = 0; }
  LRN.placeT = LRM.t;
  for (const p of LRM.P) {
    if (p.i === LRM.me) continue;
    const S = LRN.samp[p.i]; if (!S) continue;
    if (host) {
      if (!p.remote || p.bot) continue;
      const quiet = now - S.t > 600, I = p.inp, b = (quiet ? 0 : S.held) | (LRN.pend[p.i] || 0);
      I.mx = quiet ? 0 : S.mx; I.mz = quiet ? 0 : S.mz; I.yaw = S.yaw; I.pitch = S.pitch;
      LRN_BTN.forEach((k, n) => { I[k] = !!(b & (1 << n)); });
      if (!p.alive || S.sn !== p.sn) continue;
      p.yaw = S.yaw; p.pitch = S.pitch; p.gnd = S.gnd; p.glide = S.glide; p.vx = S.vx; p.vy = S.vy; p.vz = S.vz;
    }
    const age = Math.min(0.15, Math.max(0, (now - S.t) / 1000)), tx = S.x + S.vx * age, tz = S.z + S.vz * age;
    const ty = S.gnd ? S.y : Math.max(S.y - 4, S.y + S.vy * age - 0.5 * LR_G * age * age);
    const d = Math.hypot(tx - p.x, ty - p.y, tz - p.z);
    if (d > 4) { p.x = tx; p.y = ty; p.z = tz; }
    else {
      // (slid, but never much faster than the body itself is going, so a sudden turn doesn't make it leap)
      const k = Math.min(1, dt * (host ? 20 : 14)), dh = Math.hypot(tx - p.x, tz - p.z), cap = (Math.hypot(S.vx, S.vz) * 1.3 + 3) * dt, kh = dh * k > cap ? cap / dh : k;
      p.x += (tx - p.x) * kh; p.z += (tz - p.z) * kh; p.y += (ty - p.y) * k;
    }
    p.px = p.x; p.py = p.y; p.pz = p.z;
    if (!host) { const k = Math.min(1, dt * 16); p.yaw = lrAng(p.yaw + lrAng(S.yaw - p.yaw) * k); p.pitch += (S.pitch - p.pitch) * k; }
  }
  if (host) return;
  // the Wain, the clock, the phase's timer
  const C = LRM.cart, W = LRN.cart;
  if (C && W) { const L = C.L || lrPathLen(), age = Math.min(0.25, (now - W.t) / 1000), tgt = lrClamp(W.s + W.v * age, W.floor, L); C.s += (tgt - C.s) * Math.min(1, dt * 8); if (Math.abs(tgt - C.s) > 3) C.s = tgt; lrPlaceCart(); C.px = C.x; C.pz = C.z; }
  if (LRM.ph === 'play' && !LRM.ot) LRM.clock = Math.max(0, LRM.clock - dt); else if (LRM.ph === 'pick' || LRM.ph === 'setup') LRM.phT = Math.max(0, LRM.phT - dt);
  for (const j of LRM.proj) if (!j.own) { if (j.k !== 'bolt') j.vy -= LR_G * dt; j.x += j.vx * dt; j.y += j.vy * dt; j.z += j.vz * dt; }
  lrOwnBolts(dt);
}
// each frame, after the ticks: my word out, and (the host) anyone gone, or (the others) the host gone
function lrnTick(dt) {
  if (!lrnInMatch()) return;
  const now = performance.now(), me = lrMe();
  if (me && !me.bot) LRN.tap |= lrnBtns(me.inp);
  LRN.sendT -= dt;
  if (LRN.sendT <= 0) { LRN.sendT = NET.via === 'claude' ? 0.1 : 1 / 14; lrnSendNow(); }
  if (lrHost()) {
    const here = new Map(lrnMembers().map(p => [lrnOf(p).sid, lrnOf(p)]));
    for (const p of LRM.P) {
      if (!p.sid || p.i === LRM.me || p.bot) continue;
      const z = here.get(p.sid), inMatch = z && z.g === LRN.g;
      // gone quiet, or out of the match: a bot takes over from where they are
      if ((z && !inMatch && LRN.was[p.sid]) || now - (LRN.seen[p.sid] || 0) > LRN_GONE) lrnToBot(p);
    }
  } else if (!LRN.ended) {
    const hz = lrnHostZ();
    if ((hz && hz.g !== LRN.g && LRN.wSeen >= 0) || now - LRN.hostSeen > LRN_GONE) {
      LRN.ended = true; lrSay('The host has left, so the match is over.', 4);
      setTimeout(() => { if (lrnInMatch()) lrExit(); }, 2500);
    }
    // (a hero asked for: dropped once the host has made it so, or after a few seconds if it couldn't)
    if (me) { if (me.inp.hero !== LRN.heroReq) { LRN.heroReq = me.inp.hero; LRN.heroAt = now; } if (me.inp.hero && (me.inp.hero === me.hero || now - LRN.heroAt > 4000)) me.inp.hero = ''; }
  }
}
function lrnToBot(p) {
  p.bot = true; p.remote = false; p.ai = {}; p.inp = Object.assign(lrInp0(), { yaw: p.yaw, pitch: p.pitch }); delete LRN.samp[p.i]; delete LRN.was[p.sid];
  if (LRM.ph !== 'over') lrSay(`${p.name} has left. A bot plays for them now.`, 2.5);
}
// what goes in my presence: the base, the match, and (the host) the match's state, (the others) my own body
function lrnSendNow() {
  if (!LRN.code || !LRN.g) return;
  const z = lrnBase(), me = lrMe(); z.g = LRN.g;
  if (lrHost()) { z.st = LRN.st; z.w = { n: ++LRN.n, T: Math.round(performance.now()), s: lrSnap(), k: Object.assign({}, LRN.k) }; if (LRM.ph === 'over') z.w.ov = 1; }
  else if (me && !me.bot && !LRN.first) {
    const I = me.inp, seq = ++LRN.seq;
    z.p = [seq, me.sn, lrnR(me.x, 100), lrnR(me.y, 100), lrnR(me.z, 100), lrnR(me.vx, 10), lrnR(me.vy, 10), lrnR(me.vz, 10), lrnR(me.yaw, 1000), lrnR(me.pitch, 1000),
      lrnR(I.mx, 100), lrnR(I.mz, 100), lrnBtns(I), LRN.tap, (me.gnd ? 1 : 0) | (me.glide ? 2 : 0)];
    LRN.hist[seq] = { x: me.x, z: me.z, sn: me.sn }; delete LRN.hist[seq - 60];
    if (LRM.use) z.u = LRM.use;
    if (I.hero) z.h = I.hero;
  }
  LRN.tap = 0;
  lrnSend(z);
}
// the room changed: the host reads everyone's body, moves and picks; the others read the host's word
function lrnRead() {
  const now = performance.now();
  if (lrHost()) {
    for (const pr of lrnMembers()) {
      if (lrnMine(pr)) continue;
      const z = lrnOf(pr); if (!z || z.g !== LRN.g) continue;
      const p = LRM.P.find(q => q.sid === z.sid && q.i !== LRM.me); if (!p) continue;
      if (Array.isArray(z.p) && z.p[0] > (LRN.lastP[z.sid] || 0)) {
        LRN.lastP[z.sid] = z.p[0]; LRN.seen[z.sid] = now; LRN.was[z.sid] = 1;
        if (p.bot) { p.bot = false; p.remote = true; p.ai = null; if (LRM.ph !== 'over') lrSay(`${p.name} is back.`, 2); }
        lrnHeard(p, z.p, now);
      }
      if (p.bot) continue;
      if (Array.isArray(z.u) && z.u[0] > (LRN.lastU[z.sid] || 0)) { LRN.lastU[z.sid] = z.u[0]; lrnUse(p, z.u); }
      if (typeof z.h === 'string' && LR_HEROES[z.h] && z.h !== p.hero) p.inp.hero = z.h;
    }
    return;
  }
  const hz = lrnHostZ(); if (!hz || hz.g !== LRN.g || !hz.w || typeof hz.w !== 'object' || !(hz.w.n > LRN.wSeen)) return;
  LRN.wSeen = hz.w.n; LRN.hostSeen = now;
  // (when the host sent it, on my clock: its clock and mine differ by the quickest any word has come, so a word that
  // was held up on the way is taken as older, and the bodies carried on that much further)
  let at = now; const T = +hz.w.T;
  if (Number.isFinite(T)) { const off = now - T; LRN.off = LRN.off == null || off < LRN.off ? off : LRN.off + (off - LRN.off) * 0.01; at = Math.max(now - 400, Math.min(now, T + LRN.off)); }
  lrnWord(hz.w, at);
}
// the host: a person's pose, checked over (in the map; no further from the last than anyone could have gone)
function lrnHeard(p, a, now) {
  if (a.length < 15 || !a.slice(0, 15).every(Number.isFinite)) return;
  const B = LR_MAP.bounds, old = LRN.samp[p.i];
  const S = { t: now, sn: a[1], x: lrClamp(a[2], B.x0, B.x1), y: lrClamp(a[3], -5, 40), z: lrClamp(a[4], B.z0, B.z1), vx: lrClamp(a[5], -20, 20), vy: lrClamp(a[6], -40, 30), vz: lrClamp(a[7], -20, 20),
    yaw: lrAng(a[8]), pitch: lrClamp(a[9], -1.5, 1.5), mx: lrClamp(a[10], -1, 1), mz: lrClamp(a[11], -1, 1), held: a[12] | 0, gnd: !!(a[14] & 1), glide: !!(a[14] & 2) };
  const from = old && old.sn === S.sn ? old : p.alive && S.sn === p.sn ? { x: p.x, y: p.y, z: p.z, t: now - 100 } : null;
  if (from) {
    const far = Math.hypot(S.x - from.x, S.z - from.z), may = 20 * Math.max(0.05, (now - from.t) / 1000) + 9;
    if (far > may) { const k = may / far; S.x = from.x + (S.x - from.x) * k; S.z = from.z + (S.z - from.z) * k; }
  }
  LRN.samp[p.i] = S; LRN.fresh[p.i] = (LRN.fresh[p.i] || 0) | (a[13] & 127);   // (taps, kept for the next tick)
  if (S.sn === p.sn && p.alive) LRN.k[p.sid] = a[0];
}
// the host: a movement ability a person's own screen took them through; its cooldown, and what everyone sees of it
function lrnUse(p, u) {
  if (u.length < 6 || !u.slice(0, 6).every(Number.isFinite)) return;
  const H = LR_HEROES[p.hero], k = u[1] === 1 ? 'a1' : 'a2', can = LRM.ph === 'play' || (LRM.ph === 'setup' && p.team === 1);
  if (!H || !p.alive || !can || p.cd[k] > 0.6) return;
  const own = (p.hero === 'bollard' && k === 'a1') || (p.hero === 'razorbill' && k === 'a1') || (p.hero === 'linnet' && k === 'a2'); if (!own) return;
  p.cd[k] = H.cd[k]; p.act = { k, t: 0 };
  const S = LRN.samp[p.i] || p;
  if (p.hero === 'bollard') { p.rushYaw = lrAng(u[5]); p.rushHit = []; lrFxPush('rush', { x: p.x, y: p.y + 1, z: p.z, v: p.i }); }
  else if (p.hero === 'razorbill') { p.glide = true; lrFxPush('rise', { x: u[2], y: u[3], z: u[4], v: p.i }); }
  else lrFxPush('blink', { x: u[2], y: u[3] + 1, z: u[4], x2: S.x, y2: S.y + 1, z2: S.z, v: p.i });
}
// everyone but the host: the host's word on the match
function lrnWord(w, now) {
  const s = w.s; if (!s || typeof s !== 'object' || !Array.isArray(s.P) || s.P.length !== LRM.P.length) return;
  const was = LRM.ph, first = LRN.first, keep = LRM.P.map(p => ({ x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, sn: p.sn })), C = LRM.cart, cs = C ? C.s : 0, me = lrMe();
  // (my body, against where it was when it sent the pose the host last took)
  const h = w.k && typeof w.k === 'object' ? LRN.hist[w.k[NET.sid]] : null; LRM.meRef = h && me && h.sn === me.sn ? h : null;
  try { lrApply(s); } catch (e) { console.error(e); return; }
  s.P.forEach((a, i) => {
    const p = LRM.P[i]; if (!p || i === LRM.me || !Array.isArray(a)) return;
    LRN.samp[i] = { t: now, sn: a[29], x: a[1], y: a[2], z: a[3], vx: a[4], vy: a[5], vz: a[6], yaw: a[7], pitch: a[8], gnd: !!(a[10] & 2) };
    const o = keep[i]; if (!first && o.sn === a[29]) { p.x = o.x; p.y = o.y; p.z = o.z; p.yaw = o.yaw; p.pitch = o.pitch; p.px = p.x; p.py = p.y; p.pz = p.z; }   // (slid there by lrnPlace)
  });
  if (LRM.cart) {
    const C2 = LRM.cart, L = C2.L || lrPathLen(), v = LRM.ph !== 'play' ? 0 : C2.st === 'push' ? [0, 1.1, 1.5, 1.9][Math.min(3, C2.n)] : C2.st === 'back' ? -0.6 : 0;
    LRN.cart = { s: C2.s, t: now, v, floor: LRM.stage ? LR_MAP.cps[LRM.stage - 1] * L : 0 };
    if (!first && Math.abs(C2.s - cs) < 3) { C2.s = cs; lrPlaceCart(); }
  }
  LRN.first = false;
  // (the end, as the host has it: the end card here, and the match in my record)
  if (LRM.ph === 'over' && was !== 'over') { LRM.ph = was; lrEnd(LRM.win); LRN.ended = true; }
}
// the host's screen in a background tab isn't drawn, so the match runs on here (the browser slows this timer too)
function lrnHidden() {
  const now = performance.now(), dt = Math.min(1.5, (now - (LRN.hidT || now)) / 1000); LRN.hidT = now;
  if (!document.hidden || !lrnInMatch() || !lrHost() || dt <= 0) return;
  lrnPlace(dt);
  for (let left = dt; left > 1e-4; left -= LR_DT) lrTick(LR_DT);
  lrnTick(dt);
}

// ---------- coming back (src/rejoin.js) ----------
// while I'm in someone else's match: a note of it, so a new tab (or this one, reloaded) can take my seat back
function lrnRjRecord() {
  if (!lrnInMatch() || !LRN.code) return null;
  if (lrHost()) return false;
  if (LRM.ph === 'over' || LRN.ended) return null;
  return { k: 'lr', code: LRN.code, g: LRN.g, label: 'your Lamp Road match' };
}
function lrnRjLive(r) { return !lrnInMatch() && lrnOnline() && lrnOpen().some(x => x.code === r.code && x.started && x.mine); }
function lrnRejoin(r) { if (!lrnRjLive(r)) return false; if (typeof shareShow === 'function') shareShow('lamproad'); lrnJoin(r.code, true); return true; }

(function lrnInit() {
  if (!$('lrMp') || !$('lrMpHost')) return;
  $('lrMpHost').addEventListener('click', lrnHost);
  $('lrMpStart').addEventListener('click', lrnStart);
  $('lrMpSwap').addEventListener('click', lrnSide);
  $('lrMpLeave').addEventListener('click', lrnLeave);
  $('lrMpRejoin').addEventListener('click', () => { if (lrnInMatch()) return; LRN.doneG = null; LRN.msg = ''; lrNetPeers(); });
  // (the host's skill and anyone's side or name, out to the lobby as they change)
  for (const id of ['lrSkill', 'lrSide', 'lrNick']) { const el = $(id); if (el) el.addEventListener('change', () => { if (LRN.code && !lrnInMatch()) { lrnSendLobby(); lrnRender(); } }); }
  setInterval(() => { if (typeof state !== 'undefined' && state === 'title') lrnRender(); }, 1500);
  // (in the lobby, everyone says they're still here every few seconds, so a long wait doesn't look like leaving)
  setInterval(() => { if (LRN.code && !lrnInMatch()) lrnSendLobby(); }, 4000);
  setInterval(lrnHidden, 100);
  lrnRender();
})();
