'use strict';
// Skerry Clash played online: a lobby on its card, and a duel for two, each on their own screen.
//
// Like Skerry Links' lobby (src/golfnet.js), it all goes through the room the crews sail in (src/net.js), on its own
// key (`rl`) in each player's presence. In the lobby that is { room, sid, nick, at, dk, sk }: the duel's code, who
// you are, when you came in (the first in is the host, who adds lob, how many are in), and your own deck (dk, the 8
// card ids of rlDeckMine()) and tower skin (sk, rlSkinMine()), so the host can start with both. Two at most.
// The host presses Start and adds st { g the duel's id, sids, names, decks, skins, seed } (cut to { g } once the guest
// has started, to leave the room for the snapshot); both screens then call
// rlStart({ mode: 'net', me: 0 for the host and 1 for the guest, names, decks, skins, seed, net: { host } }).
// server/server.js relays the two in one duel to each other at full rate, and only the lobby part to everyone else.
// During the duel the host's screen runs the whole match (src/rl.js) and about twelve times a second puts the
// whole of it, rlSnap(), in its presence as w, with ws its count (src/transport.js then sends only the parts of it
// that changed since the last send). The guest calls rlApply(w) each time ws is new. A snapshot too big for the
// room (4 KiB for everything in a presence on claude.ai; 12 KB on our own server) goes as text in pieces instead,
// wc [ws, piece, pieces, text], one piece a send, and the guest puts it back together.
// The guest's taps go to the host as q, a short list of [seq, card, x, y] (rlnRequest); the host plays each new one
// once with rlPlay(1, ...) and says the last it has taken as ak, so the guest can drop those from its list.
// Leaving: the guest's presence carries a beat (b) that changes every second; if it stops for ten seconds the host
// wins (rlEnd(0)). If the host's snapshots stop for ten seconds the guest's match ends, shown as a win but not
// recorded (RL.net.gone is set for rl.js), and the guest goes back to the lobby without the host. Quitting the
// match on purpose (rlnBackToLobby before the end) puts quit: the duel's id in the presence, so the other side
// hears of it at once rather than in ten seconds. Afterwards both are back in the same lobby for a rematch.

var RLN = { code: null, at: 0, msg: '', st: null, doneG: null, g: null, role: null, seq: 0, q: [], lastQ: 0, ws: 0, wsSeen: -1, wsSeenAny: -1, sendT: 0, sentAt: 0, seen: 0, beat: 0, lastB: null, chunks: null, quit: null, ended: false, bytes: 0, lobT: 0 };
const RLN_MAX = 2;
const RLN_GONE = 10000;   // ms without a word before the other side is taken to have left
const rlnClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f<>&"]/g, '').trim().slice(0, n);
const RLN_ENC = typeof TextEncoder === 'function' ? new TextEncoder() : null;
const rlnBytes = t => RLN_ENC ? RLN_ENC.encode(t).length : t.length * 3;
function rlnOnline() { return !!(typeof NET !== 'undefined' && NET.room && NET.status === 'ready'); }
function rlnInMatch() { return typeof RL !== 'undefined' && !!RL.on && RL.mode === 'net'; }
function rlnNick() { return rlnClean(NET.nick || '', 16) || 'Keeper ' + String(NET.sid || '').slice(0, 3).toUpperCase(); }
function rlnOf(p) { const z = p && p.presence && p.presence.rl; return z && typeof z === 'object' && typeof z.room === 'string' && typeof z.sid === 'string' ? z : null; }
// my deck and skin, as the deck builder and the crates have them (src/rldeck.js, src/rlcrates.js)
function rlnDeck(d) {
  const ok = id => typeof id === 'string' && /^[a-z0-9_]{1,24}$/.test(id) && (typeof RL_CARD === 'undefined' || !!RL_CARD[id]);
  const fb = typeof RL_DEFAULT_DECK !== 'undefined' ? RL_DEFAULT_DECK.slice() : [];
  return Array.isArray(d) && d.length === 8 && d.every(ok) ? d.slice() : fb;
}
function rlnMyDeck() { let d = null; try { if (typeof rlDeckMine === 'function') d = rlDeckMine(); } catch (e) {} return rlnDeck(d); }
function rlnSkin(s) { return typeof s === 'string' && /^[a-z0-9_-]{0,24}$/i.test(s) ? s : ''; }
function rlnMySkin() { let s = ''; try { if (typeof rlSkinMine === 'function') s = rlSkinMine(); } catch (e) {} return rlnSkin(s); }
function rlnBase(lean) { const z = { room: RLN.code, sid: NET.sid, nick: rlnNick(), at: RLN.at }; if (!lean) { z.dk = rlnMyDeck(); z.sk = rlnMySkin(); } return z; }
function rlnPeers(code) {
  const out = NET.peers.filter(p => { const z = rlnOf(p); return z && z.room === code && fresh(p) && !(p.isMe && p.sameTab); });
  if (RLN.code === code) out.push({ isMe: true, sameTab: true, presence: { rl: rlnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = rlnOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (rlnOf(a).at || 0) - (rlnOf(b).at || 0) || (rlnOf(a).sid < rlnOf(b).sid ? -1 : 1));
}
function rlnMembers() { return RLN.code ? rlnPeers(RLN.code).slice(0, RLN_MAX) : []; }
const rlnMine = p => !!(p && p.isMe && p.sameTab);
function rlnAmHost() { const m = rlnMembers(); return !!m.length && rlnMine(m[0]); }
function rlnOther() { return rlnMembers().find(p => !rlnMine(p)) || null; }
function rlnSend(z) { if (NET.room) NET.room.presence({ rl: z }).catch(() => {}); }
function rlnSendLobby() { if (!RLN.code) return; const z = rlnBase(); if (rlnAmHost()) z.lob = { n: rlnMembers().length }; if (RLN.quit) z.quit = RLN.quit; rlnSend(z); }
function rlnHost() {
  if (!rlnOnline() || rlnInMatch()) return;
  RLN.code = 'r' + Math.random().toString(36).slice(2, 8); RLN.at = Date.now(); RLN.msg = ''; RLN.quit = null;
  rlnSendLobby(); rlnRender();
}
function rlnJoin(code) {
  if (!rlnOnline() || !code || rlnInMatch()) return;
  if (rlnPeers(code).length >= RLN_MAX) { RLN.msg = 'That duel already has two keepers.'; rlnRender(); return; }
  RLN.code = code; RLN.at = Date.now(); RLN.msg = ''; RLN.quit = null;
  rlnSendLobby(); rlnRender();
}
function rlnLeave() { RLN.code = null; RLN.st = null; RLN.g = null; RLN.role = null; RLN.quit = null; if (NET.room) NET.room.presence({ rl: null }).catch(() => {}); rlnRender(); }
// the duels being hosted here
function rlnOpen() {
  const rooms = new Map();
  for (const p of NET.peers) { const z = rlnOf(p); if (!z || !fresh(p) || rlnMine(p)) continue; if (!rooms.has(z.room)) rooms.set(z.room, []); rooms.get(z.room).push(p); }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === RLN.code) continue;
    list.sort((a, b) => (rlnOf(a).at || 0) - (rlnOf(b).at || 0));
    const h = rlnOf(list[0]); out.push({ code, host: rlnClean(h.nick, 16) || 'Someone', n: list.length, started: !!(h.st && h.st.g) });
  }
  return out;
}
function rlnRender() {
  const q = id => $('rl' + id); if (!q('Mp')) return;
  const on = rlnOnline(), mine = !!RLN.code;
  if (q('MpNote')) q('MpNote').textContent = on ? 'One against one, each on your own screen. One of you hosts; the other joins, and the host starts the duel.' : (NET.status === 'connecting' ? 'Looking for other keepers…' : (NET.offReason || 'Playing online isn’t available here. You can still duel the bot.'));
  if (q('MpOpen')) q('MpOpen').hidden = !on || mine; if (q('Lobby')) q('Lobby').hidden = !mine || !on;
  if (!on) return;
  if (!mine) {
    const L = rlnOpen(), el = q('Lobbies'); if (!el) return;
    const key = JSON.stringify(L) + RLN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key; el.textContent = '';
    if (RLN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = RLN.msg; el.append(p); }
    if (!L.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No one is hosting a duel right now. Host one, and send the keeper you want to face to this page.'; el.append(p); return; }
    for (const n of L) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = `${n.host}’s duel`;
      const sm = document.createElement('small'); sm.textContent = n.started ? 'under way' : n.n >= RLN_MAX ? 'full' : 'tap to join';
      b.append(nm, sm); b.disabled = n.started || n.n >= RLN_MAX; b.addEventListener('click', () => rlnJoin(n.code)); el.append(b);
    }
    return;
  }
  const m = rlnMembers(), host = rlnAmHost(), hz = m.length ? rlnOf(m[0]) : null, o = rlnOther(), oz = o ? rlnOf(o) : null;
  const away = !!(oz && oz.g);   // (the other one still has the last duel's end card up)
  const key = m.map(p => rlnOf(p).sid + rlnOf(p).nick).join('|') + host + away + RLN.msg;
  if (q('MpStart')) { q('MpStart').hidden = !host; q('MpStart').disabled = m.length < 2 || away; }
  const L = q('Lobby'); if (L.dataset.k === key) return; L.dataset.k = key;
  if (q('LobbyHead')) q('LobbyHead').textContent = host ? 'Your duel' : `${rlnClean(hz && hz.nick, 16) || 'Someone'}’s duel`;
  const ol = q('LobbyList');
  if (ol) { ol.textContent = ''; m.forEach((p, k) => { const li = document.createElement('li'), z = rlnOf(p); li.textContent = (rlnClean(z.nick, 16) || 'A keeper') + (rlnMine(p) ? ' (you)' : '') + (k === 0 ? ' · hosting' : ''); if (rlnMine(p)) li.className = 'me'; ol.append(li); }); }
  if (q('LobbyMsg')) q('LobbyMsg').textContent = RLN.msg || (host ? (m.length < 2 ? 'Waiting for a rival to join. Share an invite, or wait for someone to tap your duel in their list.' : away ? `Waiting for ${rlnClean(oz.nick, 16) || 'your rival'} to come back from the last duel.` : 'Both keepers are here. Start when you’re ready.') : 'Waiting for the host to start the duel.');
}
// the host starts, with both decks and skins as each put them in their lobby presence
function rlnStart() {
  if (!rlnAmHost() || rlnInMatch() || typeof rlStart !== 'function') return;
  const m = rlnMembers(); if (m.length < 2) return;
  const z = m.map(rlnOf); if (z[1].g) return;
  const st = { g: Math.random().toString(36).slice(2, 9), sids: z.map(x => x.sid), names: [rlnNick(), rlnClean(z[1].nick, 16) || 'A keeper'], decks: [rlnMyDeck(), rlnDeck(z[1].dk)], skins: [rlnMySkin(), rlnSkin(z[1].sk)], seed: (Math.random() * 4294967295) >>> 0 };
  rlnBegin(st, 'host');
}
function rlnBegin(st, role) {
  const now = performance.now();
  Object.assign(RLN, { st, g: st.g, doneG: st.g, role, seq: 0, q: [], lastQ: 0, ws: 0, wsSeen: -1, wsSeenAny: -1, sendT: 0, sentAt: 0, seen: now, lastB: null, chunks: null, quit: null, ended: false, acked: false, msg: '' });
  rlStart({ mode: 'net', me: role === 'host' ? 0 : 1, names: st.names.slice(), decks: st.decks.map(d => d.slice()), skins: st.skins.slice(), seed: st.seed, net: { host: role === 'host' } });
  rlnSendNow();
}
// every change in the room (src/net.js): keep the lobby current, start when the host does, and the duel's traffic
function rlNetPeers() {
  if (rlnInMatch() && RLN.g) { rlnRead(); return; }
  if (RLN.code && typeof RL !== 'undefined' && RL.on && RL.mode !== 'net') rlnLeave();   // (gone off to duel the bot)
  if (RLN.code) {
    const m = rlnMembers();
    if (!m.some(rlnMine)) { RLN.msg = 'That duel filled up before you got in.'; rlnLeave(); return; }
    const h = m[0], hz = h ? rlnOf(h) : null, s = hz && hz.st;
    if (h && !rlnMine(h) && s && typeof s.g === 'string' && s.g !== RLN.doneG && Array.isArray(s.sids) && !(typeof RL !== 'undefined' && RL.on)) {
      if (s.sids[1] === NET.sid && typeof rlStart === 'function') {
        const nm = Array.isArray(s.names) ? s.names : [], dk = Array.isArray(s.decks) ? s.decks : [], sk = Array.isArray(s.skins) ? s.skins : [];
        rlnBegin({ g: s.g.slice(0, 12), sids: [String(s.sids[0]), NET.sid], names: [rlnClean(nm[0], 16) || 'A keeper', rlnClean(nm[1], 16) || rlnNick()], decks: [rlnDeck(dk[0]), rlnDeck(dk[1])], skins: [rlnSkin(sk[0]), rlnSkin(sk[1])], seed: s.seed >>> 0 }, 'guest');
        return;
      }
      RLN.doneG = s.g; RLN.msg = 'They started without you. Host your own duel, or wait for the next.';
    }
    if (rlnAmHost() && performance.now() - RLN.lobT > 3000) { RLN.lobT = performance.now(); rlnSendLobby(); }
  }
  rlnRender();
}

// ---------- during the duel ----------
// the guest's tap, sent to the host (rl.js's rlTry calls this for the guest)
function rlnRequest(r) {
  if (!r || RLN.role !== 'guest' || !RLN.g || typeof r.c !== 'string') return false;
  RLN.q.push([++RLN.seq, r.c.slice(0, 24), Math.round(+r.x * 100) / 100 || 0, Math.round(+r.y * 100) / 100 || 0]);
  if (RLN.q.length > 8) RLN.q.splice(0, RLN.q.length - 8);
  rlnSendNow(); return RLN.seq;
}
// how big a snapshot the room takes, beside everything else in the presence
function rlnBudget(z) {
  const base = rlnBytes(JSON.stringify(typeof myPresence === 'function' ? myPresence() : { app: 'skerry' })) + rlnBytes(JSON.stringify(z)) + 40;
  return (NET.via === 'claude' ? 3900 : 11500) - base;
}
// what goes in my presence: the base and the duel's id, then the host's snapshot and ack, or the guest's beat and taps
function rlnSendNow() {
  if (!RLN.code || !RLN.g) return;
  const z = rlnBase(true); z.g = RLN.g;   // (no deck or skin in a duel: they're in st, and the room is small)
  if (RLN.quit) z.quit = RLN.quit;
  if (RLN.role === 'host') {
    z.st = RLN.acked ? { g: RLN.g } : RLN.st; z.ak = RLN.lastQ;   // (the whole of st only until the guest has started)
    let snap = null; try { snap = rlSnap(); } catch (e) { console.error(e); }
    if (snap) {
      z.ws = ++RLN.ws;
      const text = JSON.stringify(snap), size = rlnBytes(text), room = rlnBudget(z);
      RLN.bytes = size;
      if (size <= room) { z.w = snap; RLN.chunks = null; }
      else {
        // too big for one send: in pieces, one a send (a whole new snapshot once the last piece of this one is out)
        if (!RLN.chunks || RLN.chunks.k >= RLN.chunks.p.length) {
          const per = Math.max(200, Math.floor((room - 30) / (size === text.length ? 1 : 3))), p = [];
          for (let i = 0; i < text.length; i += per) p.push(text.slice(i, i + per));
          RLN.chunks = { ws: z.ws, p, k: 0 };
        }
        const C = RLN.chunks; z.wc = [C.ws, C.k, C.p.length, C.p[C.k]]; C.k++;
      }
    }
  } else { z.b = RLN.beat; if (RLN.q.length) z.q = RLN.q.slice(); }
  rlnSend(z); RLN.sentAt = performance.now();
}
// the other side has gone: the host wins; the guest's match ends (as a win, not recorded) and it leaves the lobby
function rlnGone(why) {
  if (RLN.ended || !rlnInMatch() || RL.ph === 'over') return;
  RLN.ended = true;
  const host = RLN.role === 'host', nm = RLN.st ? RLN.st.names[host ? 1 : 0] : 'Your rival';
  if (typeof toast === 'function') toast(`${nm} ${why === 'quit' ? 'has left' : 'has lost the connection'}, so the duel is yours.`, 'Rival gone');
  if (!host && RL.net) RL.net.gone = true;
  if (typeof rlEnd === 'function') rlEnd(host ? 0 : 1);
  if (host) rlnSendNow();   // (the end, out to anyone still listening)
}
// each frame (rl.js, in net mode): the host's snapshots about twelve times a second; anyone who's gone
function rlnTick(dt) {
  if (!RLN.g || !rlnInMatch()) return;
  const now = performance.now();
  rlnRead();
  if (RLN.role === 'host') {
    RLN.sendT -= dt || 0;
    if (RLN.sendT <= 0) { RLN.sendT += NET.via === 'claude' ? 0.1 : 1 / 12; if (RLN.sendT < -0.2) RLN.sendT = 0; rlnSendNow(); }
  } else if (now - RLN.sentAt > 1000) { RLN.beat++; rlnSendNow(); }
  if (RL.ph !== 'over' && now - RLN.seen > RLN_GONE) rlnGone('lost');
}
// the room changed during the duel: the host reads the guest's beat and taps; the guest reads the host's snapshot
function rlnRead() {
  if (!RLN.g || !rlnInMatch()) return;
  const now = performance.now(), o = rlnOther(), z = o ? rlnOf(o) : null;
  if (z && z.quit === RLN.g) { rlnGone('quit'); return; }
  if (RLN.role === 'host') {
    if (!z || z.g !== RLN.g || z.sid !== RLN.st.sids[1]) return;
    if (!RLN.acked) RLN.acked = true;
    if (z.b !== RLN.lastB) { RLN.lastB = z.b; RLN.seen = now; }
    if (!Array.isArray(z.q) || RL.ph === 'over') return;
    let took = false;
    for (const r of z.q) {
      if (!Array.isArray(r) || !Number.isInteger(r[0]) || r[0] <= RLN.lastQ) continue;
      RLN.lastQ = r[0]; took = true; RLN.seen = now;
      if (typeof r[1] === 'string' && Number.isFinite(r[2]) && Number.isFinite(r[3])) { try { rlPlay(1, r[1], r[2], r[3]); } catch (e) { console.error(e); } }
    }
    if (took) RLN.sendT = Math.min(RLN.sendT, 0.02);   // (the ack and the new unit out with the next frame)
    return;
  }
  if (!z || z.g !== RLN.g || z.sid !== RLN.st.sids[0]) return;
  if (Number.isInteger(z.ak) && RLN.q.length && RLN.q[0][0] <= z.ak) RLN.q = RLN.q.filter(r => r[0] > z.ak);
  let snap = null, ws = z.ws;
  if (z.w && typeof z.w === 'object') snap = z.w;
  else if (Array.isArray(z.wc) && z.wc.length === 4 && typeof z.wc[3] === 'string') {
    const [cw, k, n, t] = z.wc;
    if (!RLN.chunks || RLN.chunks.ws !== cw) RLN.chunks = { ws: cw, p: new Array(Math.min(64, n | 0)).fill(null) };
    if (k >= 0 && k < RLN.chunks.p.length) RLN.chunks.p[k] = t;
    if (RLN.chunks.p.every(x => x != null)) { try { snap = JSON.parse(RLN.chunks.p.join('')); } catch (e) {} ws = cw; RLN.chunks = null; }
  }
  if (Number.isInteger(z.ws) && z.ws !== RLN.wsSeenAny) { RLN.wsSeenAny = z.ws; RLN.seen = now; }
  if (snap && Number.isInteger(ws) && ws > RLN.wsSeen) { RLN.wsSeen = ws; try { rlApply(snap); } catch (e) { console.error(e); } }
}
// back from the duel (rl.js's rlExit): into the same lobby for a rematch, or out of it if the host has gone
function rlnBackToLobby() {
  const was = RLN.g, mid = !!was && typeof RL !== 'undefined' && RL.ph !== 'over' && !RLN.ended;
  const hostGone = RLN.role === 'guest' && !rlnMembers().some(p => !rlnMine(p) && rlnOf(p).sid === (RLN.st && RLN.st.sids[0]));
  RLN.g = null; RLN.role = null; RLN.chunks = null; RLN.q = [];
  if (mid) RLN.quit = was;   // (left before the end: tell the other side straight away)
  setTimeout(() => {
    if (hostGone && RLN.code) { rlnLeave(); RLN.msg = 'The host has left, so that duel is closed.'; }
    else if (RLN.code) rlnSendLobby();
    rlnRender();
  }, 50);
}

(function rlnInit() {
  if (!$('rlMp')) return;
  if ($('rlMpHost')) $('rlMpHost').addEventListener('click', rlnHost);
  if ($('rlMpStart')) $('rlMpStart').addEventListener('click', rlnStart);
  if ($('rlMpLeave')) $('rlMpLeave').addEventListener('click', rlnLeave);
  setInterval(() => { if (typeof state === 'undefined' || state === 'title') rlnRender(); }, 1500);
  // (in the lobby, both say they're still here every few seconds, so a long wait doesn't look like leaving)
  setInterval(() => { if (RLN.code && !RLN.g) rlnSendLobby(); }, 4000);
  // (and during a duel, a backstop for a tab whose frames have stopped, say in the background: the beat and the
  //  snapshot still go out, if only once a second there)
  setInterval(() => {
    if (!RLN.g || !rlnInMatch()) return;
    const now = performance.now();
    if (RLN.role === 'host' && now - RLN.sentAt > 250) rlnSendNow();
    if (RLN.role === 'guest' && now - RLN.sentAt > 1000) { RLN.beat++; rlnSendNow(); }
  }, 250);
  rlnRender();
})();
