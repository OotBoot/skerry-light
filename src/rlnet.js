'use strict';
// Skerry Clash played online: a lobby on its card, and a duel for two, each on their own screen.
//
// Like Skerry Links' lobby (src/golfnet.js), it all goes through the room the crews sail in (src/net.js), on its own
// key (`rl`) in each player's presence. In the lobby that is { room, sid, nick, at, dk, sk }: the duel's code, who
// you are, when you came in (the first in is the host, who adds lob, how many are in), and your own deck (dk, the 8
// card ids of rlDeckMine()) and tower skin (sk, rlSkinMine()), so the host can start with both, and your rating (mr,
// src/rlmmr.js), shown beside your name in the lists and used for the rating's sums on claude.ai. Two at most.
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
// hears of it at once rather than in ten seconds; for the rating it's a loss, and the other side's a win (rlmReport).
// The triple draft (src/rldraft.js): the host may tick Triple draft in the lobby (dr: 1 in its presence, so the
// guest sees it). Then Start puts st { g, sids, names, skins, seed, dr: 1 } (no decks) in the host's lobby presence
// (RLN.dst) and both screens open the draft from that seed. Each says how far it has got as dd { g, n picks, dk the 8
// once done }. When both are done the host checks the guest's 8 against the offers (rldValid) and starts the duel
// as above, with a new st and both decks. If either side drops out of the lobby the draft is called off.
// Three keepers (src/rl3.js): the host may tick Three keepers in the lobby (lob.n3 in its presence, so it shows in
// everyone's list), and the room then takes three. Start puts st { g, sids (three, '' for an empty seat), names,
// decks, skins, seed, n3: 1, bots (the empty seats) } and each guest starts as the keeper at its place in sids; the
// host's screen runs the bots for the empty seats. The guests' taps come as before, and the host acks each guest by
// its place, ak [0, a1, a2]. A guest who quits or goes quiet for ten seconds is out of the match (rl3Leave), and it
// goes on without them; the host going ends it for everyone else, unrecorded. Nothing of it reaches the rating.
// Each side reports a finished duel to the rating itself, by the duel's id g (rlnMmrInfo); the server rates it only
// when both reports agree. Afterwards both are back in the same lobby for a rematch.
// Watching: anyone else may watch a duel, waiting or under way (RLN_WATCH at most, to spare the room). A watcher puts
// { room, sid, nick, at, spec: 1 } in its presence: in the duel's room, so the server relays the host's snapshots to it
// at full rate as it does to the guest, but never one of the two keepers (rlnMembers leaves watchers out), never the
// host and never in the way of Start. When the host's presence carries a duel's id (g) the watcher calls
// rlStart({ mode: 'net', me: 0, names, net: { host: false, spec: true } }) (the names from st, or from the two
// keepers' nicks; the snapshot brings the names, skins and both hands anyway) and only ever applies snapshots, from
// side 0's end (Swap ends turns it round). It sends no taps, beats or quits, and nothing it does reaches the rating,
// the record or the crates. The keepers' HUDs show how many are watching (rlnWatchers).

var RLN = { spec: false, draft: false, n3: false, side: 0, gS: {}, gB: {}, gQ: {}, gOut: {}, dst: null, ddk: null, dlost: 0, code: null, at: 0, msg: '', st: null, doneG: null, g: null, role: null, seq: 0, q: [], lastQ: 0, ws: 0, wsSeen: -1, wsSeenAny: -1, sendT: 0, sentAt: 0, seen: 0, beat: 0, lastB: null, chunks: null, quit: null, ended: false, bytes: 0, lobT: 0 };
const RLN_MAX = 2;
const RLN_WATCH = 8;      // watchers a duel takes at most (each hears the host's snapshots at full rate)
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
function rlnBase(lean) { const z = { room: RLN.code, sid: NET.sid, nick: rlnNick(), at: RLN.at }; if (RLN.spec) { z.spec = 1; return z; } if (!lean) { z.dk = rlnMyDeck(); z.sk = rlnMySkin(); const mr = typeof rlmMine === 'function' ? rlmMine() : null; if (Number.isFinite(mr)) z.mr = mr; } return z; }
const rlnMr = z => z && Number.isFinite(z.mr) ? ' · ' + Math.max(0, Math.round(z.mr)) + ' MMR' : '';
// the duel as the rating wants it (src/rlmmr.js): its id, my side, the other's name and rating
function rlnMmrInfo() { if (!RLN.st || !RLN.g || RLN.spec || RLN.st.n3) return null; const side = RLN.role === 'host' ? 0 : 1; return { g: RLN.st.g, side, host: side === 0, opp: RLN.st.names[1 - side], omr: RLN.omr }; }
// everyone in a duel's room, keepers and watchers (rlnPeers: the keepers only; rlnSpecs: the watchers)
function rlnAll(code) {
  const out = NET.peers.filter(p => { const z = rlnOf(p); return z && z.room === code && fresh(p) && !(p.isMe && p.sameTab); });
  if (RLN.code === code) out.push({ isMe: true, sameTab: true, presence: { rl: rlnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = rlnOf(p).sid; if (seen.has(s)) return false; seen.add(s); return true; }).sort((a, b) => (rlnOf(a).at || 0) - (rlnOf(b).at || 0) || (rlnOf(a).sid < rlnOf(b).sid ? -1 : 1));
}
function rlnPeers(code) { return rlnAll(code).filter(p => !rlnOf(p).spec); }
function rlnSpecs(code) { return rlnAll(code).filter(p => !!rlnOf(p).spec); }
// how many are watching my duel (for the HUD: src/rlhud.js), counted at most twice a second
function rlnWatchers() { if (!RLN.code || !rlnOnline()) return 0; const now = performance.now(); if (now - (RLN.wT || 0) > 500) { RLN.wT = now; RLN.wN = rlnSpecs(RLN.code).length; } return RLN.wN | 0; }
// how many keepers a room takes: three when its host has ticked Three keepers (or its match is for three)
function rlnMax(code) { code = code || RLN.code; if (code === RLN.code && RLN.st && RLN.st.n3 && RLN.g) return 3; const k = rlnPeers(code), h = k[0]; if (!h) return RLN_MAX; if (rlnMine(h)) return RLN.n3 ? 3 : RLN_MAX; const z = rlnOf(h); return (z.lob && z.lob.n3) || (z.st && z.st.n3) ? 3 : RLN_MAX; }
function rlnMembers() { return RLN.code ? rlnPeers(RLN.code).slice(0, rlnMax()) : []; }
// the host's presence (for a guest or a watcher in a match)
function rlnHostP() { return RLN.st ? rlnMembers().find(p => rlnOf(p).sid === RLN.st.sids[0]) || null : null; }
const rlnMine = p => !!(p && p.isMe && p.sameTab);
function rlnAmHost() { const m = rlnMembers(); return !!m.length && rlnMine(m[0]); }
function rlnOther() { return rlnMembers().find(p => !rlnMine(p)) || null; }
function rlnSend(z) { if (NET.room) NET.room.presence({ rl: z }).catch(() => {}); }
function rlnSendLobby() { if (!RLN.code) return; const z = rlnBase(); if (RLN.spec) { rlnSend(z); return; } if (rlnAmHost()) { z.lob = { n: rlnMembers().length }; if (RLN.n3) z.lob.n3 = 1; else if (RLN.draft) z.dr = 1; }
  if (RLN.dst) { if (RLN.role === 'dhost') z.st = RLN.dst; z.dd = { g: RLN.dst.g, n: typeof RLDR !== 'undefined' ? RLDR.picks.length : 0 }; if (RLN.ddk) z.dd.dk = RLN.ddk; } if (RLN.quit) z.quit = RLN.quit; rlnSend(z); }
function rlnHost() {
  if (!rlnOnline() || rlnInMatch()) return;
  RLN.code = 'r' + Math.random().toString(36).slice(2, 8); RLN.at = Date.now(); RLN.msg = ''; RLN.quit = null; RLN.spec = false;
  rlnSendLobby(); rlnRender();
}
function rlnJoin(code) {
  if (!rlnOnline() || !code || rlnInMatch()) return;
  if (rlnPeers(code).length >= rlnMax(code)) { RLN.msg = rlnMax(code) > 2 ? 'That match already has three keepers.' : 'That duel already has two keepers.'; rlnRender(); return; }
  RLN.n3 = false; RLN.code = code; RLN.at = Date.now(); RLN.msg = ''; RLN.quit = null; RLN.spec = false;
  rlnSendLobby(); rlnRender();
}
// watch a duel, waiting or under way: in its room, as neither keeper (the duel itself starts in rlNetPeers)
function rlnWatch(code) {
  if (!rlnOnline() || !code || rlnInMatch()) return;
  if (!rlnPeers(code).length) { RLN.msg = 'That duel has closed.'; rlnRender(); return; }
  if (rlnSpecs(code).length >= RLN_WATCH) { RLN.msg = `That duel already has ${RLN_WATCH} watching.`; rlnRender(); return; }
  RLN.n3 = false; RLN.code = code; RLN.at = Date.now(); RLN.msg = ''; RLN.quit = null; RLN.spec = true; RLN.doneG = null;
  rlnSendLobby(); rlnRender(); rlNetPeers();
}
function rlnLeave() { rlnDraftOff(); RLN.spec = false; RLN.code = null; RLN.st = null; RLN.g = null; RLN.role = null; RLN.quit = null; if (NET.room) NET.room.presence({ rl: null }).catch(() => {}); rlnRender(); }
// the duels being hosted here
function rlnOpen() {
  const rooms = new Map();
  for (const p of NET.peers) { const z = rlnOf(p); if (!z || !fresh(p) || rlnMine(p)) continue; if (!rooms.has(z.room)) rooms.set(z.room, []); rooms.get(z.room).push(p); }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === RLN.code) continue;
    const keep = list.filter(p => !rlnOf(p).spec).sort((a, b) => (rlnOf(a).at || 0) - (rlnOf(b).at || 0)); if (!keep.length) continue;
    const h = rlnOf(keep[0]); out.push({ code, host: rlnClean(h.nick, 16) || 'Someone', mr: rlnMr(h), n: keep.length, w: list.length - keep.length, started: !!(h.st && h.st.g), dr: !!h.dr, n3: !!(h.lob && h.lob.n3), max: h.lob && h.lob.n3 ? 3 : RLN_MAX });
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
      // (the row joins; beside it, Watch, for any duel with room for another watcher)
      const row = document.createElement('div'); row.className = 'rlrow';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = n.n3 ? `${n.host}’s three keepers${n.mr} · ${n.n} of 3` : `${n.host}’s duel${n.mr}${n.dr ? ' · triple draft' : ''}`;
      const sm = document.createElement('small'); sm.textContent = (n.started ? 'under way' : n.n >= n.max ? 'full' : 'tap to join') + (n.w ? ` · watching: ${n.w}` : '');
      b.append(nm, sm); b.disabled = n.started || n.n >= n.max; b.addEventListener('click', () => rlnJoin(n.code)); row.append(b);
      const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'tool rlwatch'; wb.textContent = 'Watch'; wb.dataset.code = n.code;
      wb.disabled = n.w >= RLN_WATCH; wb.title = wb.disabled ? 'As many as can are watching already' : `Watch ${n.host}’s duel`; wb.addEventListener('click', () => rlnWatch(n.code)); row.append(wb);
      el.append(row);
    }
    return;
  }
  const m = rlnMembers(), host = rlnAmHost(), hz = m.length ? rlnOf(m[0]) : null, o = rlnOther(), oz = o ? rlnOf(o) : null;
  const away = m.some(p => !rlnMine(p) && rlnOf(p).g), W = rlnSpecs(RLN.code), n3 = host ? RLN.n3 : !!(hz && hz.lob && hz.lob.n3);   // (away: the other one still has the last duel's end card up)
  const dr = !n3 && (host ? RLN.draft : !!(hz && hz.dr));
  const key = m.map(p => rlnOf(p).sid + rlnOf(p).nick + rlnOf(p).mr).join('|') + '/' + W.map(p => rlnOf(p).sid + rlnOf(p).nick).join('|') + host + away + dr + n3 + RLN.spec + RLN.msg;
  if (q('MpStart')) { q('MpStart').hidden = !host; q('MpStart').disabled = m.length < 2 || away || !!RLN.dst; }
  if (q('MpDraft')) { q('MpDraft').checked = dr; q('MpDraft').disabled = !host || n3; }
  if (q('MpN3')) { q('MpN3').checked = n3; q('MpN3').disabled = !host; }
  const L = q('Lobby'); if (L.dataset.k === key) return; L.dataset.k = key;
  if (q('LobbyHead')) q('LobbyHead').textContent = host ? (n3 ? 'Your match for three' : 'Your duel') : `${rlnClean(hz && hz.nick, 16) || 'Someone'}’s ${n3 ? 'match for three' : 'duel'}`;
  const ol = q('LobbyList');
  if (ol) {
    ol.textContent = ''; m.forEach((p, k) => { const li = document.createElement('li'), z = rlnOf(p); li.textContent = (rlnClean(z.nick, 16) || 'A keeper') + (rlnMine(p) ? ' (you)' : '') + rlnMr(z) + (k === 0 ? ' · hosting' : ''); if (rlnMine(p)) li.className = 'me'; ol.append(li); });
    if (W.length) { const li = document.createElement('li'); li.className = 'rlwatchers' + (RLN.spec ? ' me' : ''); li.textContent = `watching: ${W.length} (` + W.map(p => (rlnClean(rlnOf(p).nick, 16) || 'someone') + (rlnMine(p) ? ', you' : '')).join('; ') + ')'; ol.append(li); }
  }
  if (q('LobbyMsg')) q('LobbyMsg').textContent = RLN.msg || (RLN.spec ? (m.length < 2 ? 'You’re watching. The duel shows here once a rival has joined and the host starts it.' : 'You’re watching. The duel shows here when the host starts it.') : host ? (m.length < 2 ? 'Waiting for a rival to join. Share an invite, or wait for someone to tap your duel in their list.' : away ? `Waiting for ${rlnClean(oz.nick, 16) || 'your rival'} to come back from the last duel.` : 'Both keepers are here. Start when you’re ready.') : 'Waiting for the host to start the duel.') + (dr && !RLN.msg ? ' It’s a triple draft: you’ll both build a deck on the spot.' : '') + (n3 && !RLN.msg ? (m.length < 3 ? ` Three keepers: ${m.length < 2 ? 'start with one more and a bot takes the empty seat' : 'a bot takes the empty seat if you start now'}.` : ' Three keepers: every keeper for themselves.') : '');
}
// the host starts, with both decks and skins as each put them in their lobby presence
function rlnStart() {
  if (!rlnAmHost() || rlnInMatch() || typeof rlStart !== 'function') return;
  const m = rlnMembers(); if (m.length < 2) return;
  const z = m.map(rlnOf); if (z.some((x, i) => i && x.g) || RLN.dst) return;
  if (RLN.n3) {
    // (three keepers: the members in order, a bot in any empty seat, on the host's screen)
    const lvl = 'normal', bn = typeof RL3_BOTNM !== 'undefined' ? RL3_BOTNM[lvl] : ['Keeper Morrow', 'Keeper Haldane'], bots = [], bd = () => typeof rlBotDeck === 'function' ? rlBotDeck(lvl) : rlnDeck(null);
    const st = { g: Math.random().toString(36).slice(2, 9), sids: [], names: [], decks: [], skins: [], seed: (Math.random() * 4294967295) >>> 0, n3: 1, bots };
    for (let i = 0; i < 3; i++) {
      const x = z[i];
      if (!i) { st.sids.push(x.sid); st.names.push(rlnNick()); st.decks.push(rlnMyDeck()); st.skins.push(rlnMySkin()); }
      else if (x) { st.sids.push(x.sid); st.names.push(rlnClean(x.nick, 16) || 'A keeper'); st.decks.push(rlnDeck(x.dk)); st.skins.push(rlnSkin(x.sk)); }
      else { bots.push(i); st.sids.push(''); st.names.push(bn[bots.length - 1] || 'Keeper Morrow'); st.decks.push(bd()); st.skins.push(''); }
    }
    rlnBegin(st, 'host'); return;
  }
  if (RLN.draft && typeof rldOpen === 'function') {
    rlnDraftGo({ g: Math.random().toString(36).slice(2, 9), sids: z.map(x => x.sid), names: [rlnNick(), rlnClean(z[1].nick, 16) || 'A keeper'], skins: [rlnMySkin(), rlnSkin(z[1].sk)], seed: (Math.random() * 4294967295) >>> 0, dr: 1 }, 'dhost');
    return;
  }
  const st = { g: Math.random().toString(36).slice(2, 9), sids: z.map(x => x.sid), names: [rlnNick(), rlnClean(z[1].nick, 16) || 'A keeper'], decks: [rlnMyDeck(), rlnDeck(z[1].dk)], skins: [rlnMySkin(), rlnSkin(z[1].sk)], seed: (Math.random() * 4294967295) >>> 0 };
  rlnBegin(st, 'host');
}
// ---------- the triple draft (src/rldraft.js) ----------
function rlnDraftGo(st, role) {
  RLN.dst = st; RLN.ddk = null; RLN.role = role; RLN.doneG = st.g; RLN.dlost = 0; RLN.msg = '';
  const me = role === 'dhost' ? 0 : 1;
  rldOpen({ seed: st.seed, net: true, vs: st.names[1 - me], me, names: st.names.slice(), skins: st.skins.slice(), done: d => { RLN.ddk = d.slice(); rlnSendLobby(); rlnDraftCheck(); } });
  rlnSendLobby(); rlnRender();
}
function rlnDraftOff(msg) {
  if (!RLN.dst) return;
  RLN.dst = null; RLN.ddk = null; if (RLN.role === 'dhost' || RLN.role === 'dguest') RLN.role = null;
  if (typeof rldClose === 'function') rldClose();
  if (msg) RLN.msg = msg;
  if (RLN.code) rlnSendLobby(); rlnRender();
}
// while drafting: the rival's progress; the host starts once both are done; called off if the other has gone
function rlnDraftCheck() {
  if (!RLN.dst) return;
  const o = rlnOther(), z = o ? rlnOf(o) : null, want = RLN.dst.sids[RLN.role === 'dhost' ? 1 : 0];
  const dd = z && z.sid === want && z.dd && z.dd.g === RLN.dst.g ? z.dd : null;
  if (!z || z.sid !== want) { if (!RLN.dlost) RLN.dlost = performance.now(); else if (performance.now() - RLN.dlost > 8000) rlnDraftOff('Your rival left the draft.'); return; }
  RLN.dlost = 0;
  if (RLN.role === 'dguest' && z.g) return;   // (the host has started the duel: rlNetPeers begins it here)
  if (RLN.role === 'dguest' && !(z.st && z.st.g === RLN.dst.g)) { rlnDraftOff('The host called off the draft.'); return; }
  if (typeof rldRival === 'function') rldRival(dd ? Math.min(8, dd.n | 0) : 0);
  if (RLN.role !== 'dhost' || !RLN.ddk || !dd || !Array.isArray(dd.dk)) return;
  const theirs = rlnDeck(dd.dk), st = RLN.dst;
  if (!rldValid(st.seed, dd.dk) || theirs.join() !== dd.dk.join()) { rlnDraftOff('Your rival’s drafted deck didn’t match the offers, so the draft was called off.'); return; }
  const go = { g: Math.random().toString(36).slice(2, 9), sids: st.sids.slice(), names: st.names.slice(), decks: [RLN.ddk.slice(), theirs], skins: st.skins.slice(), seed: (Math.random() * 4294967295) >>> 0, dr: 2 };
  RLN.dst = null; RLN.ddk = null; if (typeof rldClose === 'function') rldClose(true);
  rlnBegin(go, 'host');
}
function rlnBegin(st, role) {
  if (RLN.dst) { RLN.dst = null; RLN.ddk = null; if (typeof rldClose === 'function') rldClose(true); }
  const now = performance.now(), oz = rlnOther() && rlnOf(rlnOther());
  RLN.omr = oz && Number.isFinite(oz.mr) ? oz.mr : null;   // (the other's rating as their lobby gave it, for the rating's sums)
  RLN.side = role === 'host' ? 0 : Math.max(0, st.sids.indexOf(NET.sid)); RLN.gS = {}; RLN.gB = {}; RLN.gQ = {}; RLN.gOut = {};
  Object.assign(RLN, { st, g: st.g, doneG: st.g, role, seq: 0, q: [], lastQ: 0, ws: 0, wsSeen: -1, wsSeenAny: -1, sendT: 0, sentAt: 0, seen: now, lastB: null, chunks: null, quit: null, ended: false, acked: false, msg: '' });
  if (role === 'spec') { RLN.specSk = st.skins.join('|'); rlStart({ mode: 'net', me: 0, n3: !!st.n3, names: st.names.slice(), skins: st.skins.slice(), seed: st.seed, net: { host: false, spec: true } }); return; }
  if (st.n3) { const now2 = performance.now(); st.sids.forEach((sid, i) => { if (i && sid) RLN.gS[i] = now2; }); }
  rlStart({ mode: 'net', me: role === 'host' ? 0 : st.n3 ? RLN.side : 1, n3: !!st.n3, bots: st.bots, names: st.names.slice(), decks: st.decks.map(d => d.slice()), skins: st.skins.slice(), seed: st.seed, net: { host: role === 'host' }, draft: st.dr === 2 });
  rlnSendNow();
}
// a watcher: the duel the host has started (or is in the middle of), from the host's presence
function rlnSpecPeers() {
  const m = rlnMembers(), h = m[0], hz = h ? rlnOf(h) : null;
  if (!hz) { RLN.msg = 'The host has left, so that duel is closed.'; rlnLeave(); return; }
  const g = typeof hz.g === 'string' ? hz.g.slice(0, 12) : null;
  if (!g || g === RLN.doneG || hz.quit === g || (typeof RL !== 'undefined' && RL.on)) return;
  if (hz.w && hz.w.ph === 'over') { RLN.doneG = g; return; }   // (come in just as it ended: wait for the next)
  const s = hz.st && typeof hz.st === 'object' ? hz.st : {}, nm = Array.isArray(s.names) ? s.names : [], sk = Array.isArray(s.skins) ? s.skins : [];
  const gz = m[1] ? rlnOf(m[1]) : null, sids = Array.isArray(s.sids) ? s.sids : [hz.sid, gz ? gz.sid : ''];
  if (s.n3) { const n = [0, 1, 2].map(i => rlnClean(nm[i] || (m[i] && rlnOf(m[i]).nick), 16) || 'A keeper'); rlnBegin({ g, sids: [String(hz.sid), String(sids[1] || ''), String(sids[2] || '')], names: n, decks: [[], [], []], skins: [0, 1, 2].map(i => rlnSkin(sk[i])), seed: s.seed >>> 0, n3: 1 }, 'spec'); return; }
  rlnBegin({ g, sids: [String(hz.sid), String(sids[1] || '')], names: [rlnClean(nm[0] || hz.nick, 16) || 'A keeper', rlnClean(nm[1] || (gz && gz.nick), 16) || 'A keeper'], decks: [[], []], skins: [rlnSkin(sk[0]), rlnSkin(sk[1])], seed: s.seed >>> 0 }, 'spec');
}
// every change in the room (src/net.js): keep the lobby current, start when the host does, and the duel's traffic
function rlNetPeers() {
  if (rlnInMatch() && RLN.g) { rlnRead(); return; }
  if (RLN.code && typeof RL !== 'undefined' && RL.on && RL.mode !== 'net') rlnLeave();   // (gone off to duel the bot)
  if (RLN.code && RLN.spec) rlnSpecPeers();
  else if (RLN.code) {
    const m = rlnMembers();
    if (!m.some(rlnMine)) { RLN.msg = 'That duel filled up before you got in.'; rlnLeave(); return; }
    const h = m[0], hz = h ? rlnOf(h) : null, s = hz && hz.st;
    if (h && !rlnMine(h) && s && typeof s.g === 'string' && s.g !== RLN.doneG && Array.isArray(s.sids) && !(typeof RL !== 'undefined' && RL.on)) {
      if (s.sids[1] === NET.sid && s.dr === 1 && typeof rldOpen === 'function') {
        const nm = Array.isArray(s.names) ? s.names : [], sk = Array.isArray(s.skins) ? s.skins : [];
        rlnDraftGo({ g: s.g.slice(0, 12), sids: [String(s.sids[0]), NET.sid], names: [rlnClean(nm[0], 16) || 'A keeper', rlnClean(nm[1], 16) || rlnNick()], skins: [rlnSkin(sk[0]), rlnSkin(sk[1])], seed: s.seed >>> 0, dr: 1 }, 'dguest');
        return;
      }
      if (s.n3 && s.sids.indexOf(NET.sid) >= 1 && typeof rlStart === 'function') {
        const nm = Array.isArray(s.names) ? s.names : [], dk = Array.isArray(s.decks) ? s.decks : [], sk = Array.isArray(s.skins) ? s.skins : [], I = [0, 1, 2];
        rlnBegin({ g: s.g.slice(0, 12), sids: I.map(i => String(s.sids[i] || '')), names: I.map(i => rlnClean(nm[i], 16) || (s.sids[i] === NET.sid ? rlnNick() : 'A keeper')), decks: I.map(i => rlnDeck(dk[i])), skins: I.map(i => rlnSkin(sk[i])), seed: s.seed >>> 0, n3: 1, bots: Array.isArray(s.bots) ? s.bots.filter(i => i === 1 || i === 2) : [] }, 'guest');
        return;
      }
      if (s.sids[1] === NET.sid && typeof rlStart === 'function') {
        const nm = Array.isArray(s.names) ? s.names : [], dk = Array.isArray(s.decks) ? s.decks : [], sk = Array.isArray(s.skins) ? s.skins : [];
        rlnBegin({ g: s.g.slice(0, 12), sids: [String(s.sids[0]), NET.sid], names: [rlnClean(nm[0], 16) || 'A keeper', rlnClean(nm[1], 16) || rlnNick()], decks: [rlnDeck(dk[0]), rlnDeck(dk[1])], skins: [rlnSkin(sk[0]), rlnSkin(sk[1])], seed: s.seed >>> 0, dr: s.dr === 2 ? 2 : 0 }, 'guest');
        return;
      }
      RLN.doneG = s.g; RLN.msg = 'They started without you. Host your own duel, or wait for the next.';
    }
    if (RLN.dst) rlnDraftCheck();
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
    z.st = RLN.acked ? (RLN.st.n3 ? { g: RLN.g, n3: 1 } : { g: RLN.g }) : RLN.st; z.ak = RLN.st.n3 ? [0, RLN.gQ[1] || 0, RLN.gQ[2] || 0] : RLN.lastQ;   // (the whole of st only until the guest has started)
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
  if (RLN.role === 'spec') {
    // (a watcher: the host has gone, on purpose or not; the guest's screen has the win, and nothing is recorded here)
    const nm = RLN.st ? RLN.st.names[0] : 'The host';
    if (typeof toast === 'function') toast(`${nm} ${why === 'quit' ? 'has left the duel' : 'has lost the connection'}.`, 'Duel over');
    if (RL.net) RL.net.gone = true; RLN.specWhy = why;
    if (typeof rlEnd === 'function') rlEnd(RL.n3 ? 3 : why === 'quit' ? 1 : 2, { norec: true });
    return;
  }
  if (RLN.st && RLN.st.n3) {
    // (three keepers: only the host going ends it, for the others, unrecorded)
    if (typeof toast === 'function') toast(`${RLN.st.names[0]} ${why === 'quit' ? 'has left' : 'has lost the connection'}, so the match is over.`, 'Host gone');
    if (RL.net) RL.net.gone = true; if (typeof rlEnd === 'function') rlEnd(3, { norec: true });
    return;
  }
  const host = RLN.role === 'host', nm = RLN.st ? RLN.st.names[host ? 1 : 0] : 'Your rival';
  if (typeof toast === 'function') toast(`${nm} ${why === 'quit' ? 'has left' : 'has lost the connection'}, so the duel is yours.`, 'Rival gone');
  if (!host && RL.net) RL.net.gone = true;
  // (the host left on purpose: the guest's win is rated, as the host's screen reports the loss; a lost connection isn't)
  const info = !host && why === 'quit' ? rlnMmrInfo() : null;
  if (typeof rlEnd === 'function') rlEnd(host ? 0 : 1);
  if (info && typeof rlmReport === 'function') { try { rlmReport({ win: true }, info); } catch (e) { console.error(e); } }
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
  } else if (RLN.role === 'guest' && now - RLN.sentAt > 1000) { RLN.beat++; rlnSendNow(); }   // (a watcher sends nothing)
  if (RLN.role === 'host' && RLN.st.n3) { for (const i of [1, 2]) if (RLN.gS[i] && !RLN.gOut[i] && now - RLN.gS[i] > RLN_GONE) rlnOut3(i, 'lost'); return; }
  if (RL.ph !== 'over' && now - RLN.seen > RLN_GONE) rlnGone('lost');
}
// the room changed during the duel: the host reads the guest's beat and taps; the guest reads the host's snapshot
function rlnRead() {
  if (!RLN.g || !rlnInMatch()) return;
  if (RLN.st.n3) { rlnRead3(); return; }
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
      if (typeof r[1] === 'string' && r[1].startsWith('e:')) { if (typeof rlEmote === 'function') rlEmote(1, r[1].slice(2)); continue; }   // (an emote: src/rlemote.js)
      if (typeof r[1] === 'string' && Number.isFinite(r[2]) && Number.isFinite(r[3])) { try { rlPlay(1, r[1], r[2], r[3]); } catch (e) { console.error(e); } }
    }
    if (took) RLN.sendT = Math.min(RLN.sendT, 0.02);   // (the ack and the new unit out with the next frame)
    return;
  }
  if (RLN.role === 'spec') {
    // (a watcher hears the host straight, and reads its snapshots as the guest does; its quit or its going ends it)
    const h = rlnMembers().find(p => rlnOf(p).sid === RLN.st.sids[0]), hz = h ? rlnOf(h) : null;
    if (hz && hz.quit === RLN.g) { rlnGone('quit'); return; }
    rlnSnapIn(hz, now);
    const sk = RL.skins.join('|'); if (sk !== RLN.specSk) { RLN.specSk = sk; if (typeof rl3dReset === 'function') rl3dReset(); }   // (the towers as the keepers raised them)
    return;
  }
  rlnSnapIn(z, now);
}
// a match for three: the host reads each guest's beat and taps (by its place in sids) and puts out anyone who has
// quit; a guest or a watcher reads the host's snapshot, and ends if the host has quit
function rlnRead3() {
  const now = performance.now(), st = RLN.st;
  if (RLN.role === 'host') {
    let all = true;
    for (const i of [1, 2]) {
      const sid = st.sids[i]; if (!sid || RLN.gOut[i]) continue;
      const p = rlnMembers().find(q => rlnOf(q).sid === sid), z = p ? rlnOf(p) : null;
      if (z && z.quit === RLN.g) { rlnOut3(i, 'quit'); continue; }
      if (!z || z.g !== RLN.g) { all = false; continue; }
      if (z.b !== RLN.gB[i]) { RLN.gB[i] = z.b; RLN.gS[i] = now; }
      if (!Array.isArray(z.q) || RL.ph === 'over') continue;
      let took = false;
      for (const r of z.q) {
        if (!Array.isArray(r) || !Number.isInteger(r[0]) || r[0] <= (RLN.gQ[i] || 0)) continue;
        RLN.gQ[i] = r[0]; took = true; RLN.gS[i] = now;
        if (typeof r[1] === 'string' && r[1].startsWith('e:')) { if (typeof rlEmote === 'function') rlEmote(i, r[1].slice(2)); continue; }   // (an emote: src/rlemote.js)
        if (typeof r[1] === 'string' && Number.isFinite(r[2]) && Number.isFinite(r[3])) { try { rlPlay(i, r[1], r[2], r[3]); } catch (e) { console.error(e); } }
      }
      if (took) RLN.sendT = Math.min(RLN.sendT, 0.02);
    }
    if (all) RLN.acked = true;
    return;
  }
  const h = rlnHostP(), hz = h ? rlnOf(h) : null;
  if (hz && hz.quit === RLN.g) { rlnGone('quit'); return; }
  rlnSnapIn(hz, now);
  if (RLN.role === 'spec') { const sk = RL.skins.join('|'); if (sk !== RLN.specSk) { RLN.specSk = sk; if (typeof rl3dReset === 'function') rl3dReset(); } }
}
// a guest has quit or gone quiet: out of the match for three, which goes on without them
function rlnOut3(i, why) {
  if (RLN.gOut[i]) return; RLN.gOut[i] = 1;
  if (typeof rl3Leave === 'function') rl3Leave(i);
  if (typeof toast === 'function' && RL.ph !== 'over') toast(`${RLN.st.names[i]} ${why === 'quit' ? 'has left' : 'has lost the connection'}, so their light goes out.`, 'Keeper gone');
}
// a snapshot from the host's presence z, whole (w) or in pieces (wc), put into RL once each (the guest and watchers)
function rlnSnapIn(z, now) {
  if (!z || z.g !== RLN.g || z.sid !== RLN.st.sids[0]) return;
  const ak = Array.isArray(z.ak) ? z.ak[RLN.side] : z.ak;
  if (Number.isInteger(ak) && RLN.q.length && RLN.q[0][0] <= ak) RLN.q = RLN.q.filter(r => r[0] > ak);
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
  if (RLN.role === 'spec' || (RLN.spec && RLN.code)) {
    // (a watcher: back to the list of duels if it left part way or the host has gone; else it stays, for the next)
    const mid = !!RLN.g && typeof RL !== 'undefined' && RL.win === -1 && !RLN.ended, hostGone = !rlnMembers().some(p => RLN.st && rlnOf(p).sid === RLN.st.sids[0]);
    RLN.g = null; RLN.role = null; RLN.chunks = null; RLN.specWhy = null;
    setTimeout(() => { if (mid || hostGone || RLN.ended) { const was = RLN.ended && !mid; rlnLeave(); if (was) RLN.msg = 'The host has left, so that duel is closed.'; } else rlnSendLobby(); rlnRender(); }, 50);
    return;
  }
  const was = RLN.g, mid = !!was && typeof RL !== 'undefined' && RL.ph !== 'over' && !RLN.ended;
  const hostGone = RLN.role === 'guest' && !rlnPeers(RLN.code).some(p => !rlnMine(p) && rlnOf(p).sid === (RLN.st && RLN.st.sids[0]));
  // (left before the end: a loss for the rating, so the other keeper's win counts; src/rlmmr.js)
  if (mid && !(RLN.st && RLN.st.n3) && typeof rlmReport === 'function') { try { rlmReport({ win: false }, rlnMmrInfo()); } catch (e) { console.error(e); } }
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
  if ($('rlMpHost')) $('rlMpHost').addEventListener('click', () => { RLN.draft = false; rlnHost(); });
  if ($('rlMpHostDr')) $('rlMpHostDr').addEventListener('click', () => { RLN.draft = true; rlnHost(); });   // (a triple draft from the start; the host can still change it in the lobby)
  if ($('rlMpStart')) $('rlMpStart').addEventListener('click', rlnStart);
  if ($('rlMpLeave')) $('rlMpLeave').addEventListener('click', rlnLeave);
  if ($('rlMpDraft')) $('rlMpDraft').addEventListener('change', e => { if (!rlnAmHost()) return; RLN.draft = !!e.target.checked; rlnSendLobby(); rlnRender(); });
  if ($('rlMpN3')) $('rlMpN3').addEventListener('change', e => { if (!rlnAmHost()) return; RLN.n3 = !!e.target.checked; if (RLN.n3) RLN.draft = false; rlnSendLobby(); rlnRender(); });
  setInterval(() => { if (RLN.dst) { rlnDraftCheck(); if (RLN.dst) rlnSendLobby(); } }, 1000);   // (the draft: progress out, and anyone gone)
  setInterval(() => { if (typeof state === 'undefined' || state === 'title') rlnRender(); }, 1500);
  // (in the lobby, both say they're still here every few seconds, so a long wait doesn't look like leaving)
  setInterval(() => { if (RLN.code && (!RLN.g || RLN.spec)) rlnSendLobby(); }, 4000);   // (a watcher, all along)
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
