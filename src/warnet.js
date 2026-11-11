// The Drowned Reach, played together: up to ten people in one war, with up to fifty bot nations.
//
// One player hosts. Their browser runs the whole war (war.js, exactly as in a game alone) and streams it to the
// others through the same room the crews sail in (net.js: a presence object of at most 4 KiB, a few times a
// second). Everyone starts from the same seed and settings, so the map, the islands, the names and the bots'
// landings come out the same on every browser and never need sending; what is streamed is what changes:
//   h  the clock, the tide, the beam, the phase, the pact offers waiting on players, and the end
//   n  the nations (people, gold, land, cooldowns, pacts, tempers), a chunk at a time
//   m  the map's owners, row by row, run-length coded: changed rows first, then a slow sweep of the rest
//   s  the buildings, a stretch of the map at a time
//   a  attacks, boats, flares and fire-ship bursts
//   l  the war's log, each line marked for everyone or for one player
// The others don't run the war: they draw what the host sends and send their orders back in their own presence
// (`q`, the last few, numbered, so none is applied twice). Speed and pause are the host's alone, and stay at 1x.
// Dropping out and coming back (src/rejoin.js): a joined player who reloads or loses the connection keeps their id,
// finds the war still in the host's presence (its `st` names them) and takes their nation back. Each time they begin
// they pick a fresh mark (`j`); when the host sees it change it counts their orders from nought again, hands their
// nation back to them if it had been left to fight on alone, and sends the whole map again so they have all of it.
// The host's browser is the war, so if the host drops out the war ends as before.

const WN = {
  code: null, at: 0, role: null, g: null, st: null, hum: [], doneG: null, msg: '',
  // host
  sendT: 0, tick: 0, hseq: 0, sent: null, rowPtr: 0, sweepPtr: 0, nPtr: 0, sPtr: 0, lastSeq: [], seenT: [], logSentId: 0,
  // client
  seq: 0, q: [], lastH: -1, lastHostT: 0, logId: 0, relT: 0, survT: 0, ready: false, gone: false,
  j: '', jSeen: [], lost: [], rjWant: null,
};
const WN_MAX = 10;
const WN_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;=?@^_{|}~';
const WN_DEC = (() => { const t = new Int16Array(128).fill(-99); for (let k = 0; k < WN_ALPHA.length; k++) t[WN_ALPHA.charCodeAt(k)] = k - 2; return t; })();
const WN_TYPES = { harbour: 'h', tower: 't', beacon: 'b', city: 'c', factory: 'f' };
const WN_TYPE_OF = { h: 'harbour', t: 'tower', b: 'beacon', c: 'city', f: 'factory' };
const wnClean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f<>&"]/g, '').trim().slice(0, n);
const WN_ENC = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const wnBytes = v => { const t = JSON.stringify(v); return WN_ENC ? WN_ENC.encode(t).length : t.length * 3; };
const b36 = v => Math.round(v || 0).toString(36);
const p36 = s => parseInt(s, 36) || 0;

// ---------- the lobby ----------
function wnOnline() { return !!(NET.room && NET.status === 'ready'); }
function wnNick() { return wnClean((($('warNick') && $('warNick').value) || '').trim()).slice(0, 18) || (NET.nick ? wnClean(NET.nick, 18) : '') || 'House ' + WAR_HOUSES[[...String(NET.sid)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % WAR_HOUSES.length]; }
function wnWar(p) { const w = p && p.presence && p.presence.war; return w && typeof w === 'object' && typeof w.room === 'string' ? w : null; }
function wnPeers(code) {
  const out = NET.peers.filter(p => { const w = wnWar(p); return w && w.room === code && fresh(p) && !(p.isMe && p.sameTab); });
  if (WN.code === code) out.push({ peer: NET.myPeer, isMe: true, sameTab: true, presence: { war: wnBase() } });
  const seen = new Set();
  return out.filter(p => { const s = wnWar(p).sid; if (seen.has(s)) return false; seen.add(s); return true; })
    .sort((a, b) => (wnWar(a).at || 0) - (wnWar(b).at || 0) || (String(wnWar(a).sid) < String(wnWar(b).sid) ? -1 : 1));
}
function wnMembers() { return WN.code ? wnPeers(WN.code).slice(0, WN_MAX) : []; }
function wnAmHost() { const m = wnMembers(); return !!m.length && m[0].isMe && m[0].sameTab; }
function wnBase() { return { room: WN.code, sid: NET.sid, nick: wnNick(), at: WN.at, sk: typeof rcEquippedId === 'function' ? rcEquippedId() : '' }; }
function wnSend(w) { if (NET.room) NET.room.presence({ war: w }).catch(() => {}); }
function wnSendLobby() {
  if (!WN.code) return;
  const w = wnBase();
  if (wnAmHost()) w.lob = { b: +$('warMpBots').value, d: $('warDiff').value, n: wnMembers().length };
  wnSend(w);
}
function wnHost() {
  if (!wnOnline()) return;
  WN.code = 'w' + Math.random().toString(36).slice(2, 8); WN.at = Date.now(); WN.msg = '';
  wnSendLobby(); wnRender();
}
function wnJoin(code) {
  if (!wnOnline() || !code) return;
  if (wnPeers(code).length >= WN_MAX) { WN.msg = 'That war is full (ten players).'; wnRender(); return; }
  WN.code = code; WN.at = Date.now(); WN.msg = '';
  wnSendLobby(); wnRender();
}
function wnLeave() {
  WN.code = null; WN.role = null; WN.g = null; WN.st = null;
  if (NET.room) NET.room.presence({ war: null }).catch(() => {});
  wnRender();
}
// the open wars anyone here can join: each room's host, while it is still in its lobby
function wnOpenWars() {
  const rooms = new Map();
  for (const p of NET.peers) {
    const w = wnWar(p); if (!w || !fresh(p) || (p.isMe && p.sameTab)) continue;
    if (!rooms.has(w.room)) rooms.set(w.room, []);
    rooms.get(w.room).push(p);
  }
  const out = [];
  for (const [code, list] of rooms) {
    if (code === WN.code) continue;
    list.sort((a, b) => (wnWar(a).at || 0) - (wnWar(b).at || 0));
    const h = wnWar(list[0]);
    out.push({ code, host: wnClean(h.nick || '').slice(0, 18) || 'Someone', n: list.length, b: h.lob ? h.lob.b : '?', d: h.lob ? h.lob.d : '', started: !!h.st, g: h.st && h.st.g });
  }
  return out;
}
function wnRender() {
  const box = $('warMp'); if (!box) return;
  const on = wnOnline();
  $('warMpNote').textContent = on ? 'Up to ten people in one war, with as many bot nations as you like (none to fifty). One of you hosts and starts it whenever you are ready.' : (NET.status === 'connecting' ? 'Looking for other players…' : (NET.offReason || 'Playing together isn’t available here.'));
  $('warMpOpen').hidden = !on || !!WN.code;
  $('warLobby').hidden = !WN.code;
  if (!on) return;
  if (!WN.code) {
    const wars = wnOpenWars(), el = $('warLobbies');
    const key = JSON.stringify(wars) + WN.msg;
    if (el.dataset.k === key) return; el.dataset.k = key;
    el.innerHTML = '';
    if (WN.msg) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = WN.msg; el.append(p); }
    if (!wars.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No one is hosting a war right now. Host one, and send the people you want to play with to this page.'; el.append(p); return; }
    for (const w of wars) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'warlobbyrow';
      const diff = WAR_DIFF[w.d] ? WAR_DIFF[w.d].name : '';
      b.innerHTML = '<span class="nm"></span><small></small>';
      b.querySelector('.nm').textContent = `${w.host}’s war`;
      const back = w.started && wnRjFor(w.code);   // (one I dropped out of: back into it)
      b.querySelector('small').textContent = back ? 'under way · tap to rejoin' : w.started ? 'under way' : `${w.n}/${WN_MAX} players · ${w.b} bots${diff ? ' · ' + diff : ''} · tap to join`;
      b.disabled = back ? false : w.started || w.n >= WN_MAX;
      b.addEventListener('click', () => back ? wnRejoin(back) : wnJoin(w.code));
      el.append(b);
    }
    return;
  }
  const m = wnMembers(), host = wnAmHost(), hw = m.length ? wnWar(m[0]) : null;
  const key = m.map(p => wnWar(p).sid + wnWar(p).nick).join('|') + host + (hw && hw.lob ? JSON.stringify(hw.lob) : '') + WN.msg;
  $('warMpBotsRow').hidden = !host; $('warMpStart').hidden = !host;
  $('warMpBotsOut').textContent = $('warMpBots').value;
  if ($('warLobby').dataset.k === key) return; $('warLobby').dataset.k = key;
  $('warLobbyHead').textContent = host ? 'Your war' : `${wnClean(hw && hw.nick || '').slice(0, 18) || 'Someone'}’s war`;
  const ol = $('warLobbyList'); ol.innerHTML = '';
  m.forEach((p, k) => {
    const li = document.createElement('li'), w = wnWar(p);
    li.textContent = (wnClean(w.nick || '').slice(0, 18) || 'A house') + (p.isMe && p.sameTab ? ' (you)' : '') + (k === 0 ? ' · hosting' : '');
    if (p.isMe && p.sameTab) li.className = 'me';
    ol.append(li);
  });
  const lob = hw && hw.lob;
  $('warLobbyMsg').textContent = WN.msg || (host
    ? `${m.length} of ${WN_MAX} players. Start whenever you like: with just you, or with everyone here. The map word and how the bots play are taken from above.`
    : `Waiting for the host to start${lob ? ` · ${lob.b} bot nations · ${WAR_DIFF[lob.d] ? WAR_DIFF[lob.d].name : 'Normal'}` : ''}. Your house name is taken from above.`);
}

// the host starts the war; everyone in the lobby (up to ten) plays a nation
function wnStart() {
  if (!wnAmHost() || WAR.on) return;
  const m = wnMembers();
  const seedIn = ($('warSeed').value || '').trim();
  let seed = 0; if (seedIn) { for (let i = 0; i < seedIn.length; i++) seed = (seed * 31 + seedIn.charCodeAt(i)) >>> 0; } else seed = (Math.random() * 4294967295) >>> 0;
  const st = { g: Math.random().toString(36).slice(2, 9), seed, b: clamp(+$('warMpBots').value | 0, 0, 50), d: WAR_DIFF[$('warDiff').value] ? $('warDiff').value : 'normal', hum: m.map(p => [String(wnWar(p).sid), wnClean(wnWar(p).nick || '').slice(0, 18) || 'A house', typeof rcSkin === 'function' && rcSkin(wnWar(p).sk) ? wnWar(p).sk : '']) };
  if (st.b + st.hum.length < 2) st.b = 1;   // someone to fight
  wnBegin(st, 0, 'host');
}
function wnBegin(st, me, role) {
  WN.role = role; WN.g = st.g; WN.st = st; WN.hum = st.hum.map(h => h[0]); WN.doneG = st.g;
  WN.sendT = 0; WN.tick = 0; WN.hseq = 0; WN.sent = null; WN.rowPtr = 0; WN.sweepPtr = 0; WN.nPtr = 0; WN.sPtr = 0; WN.logSentId = 0;
  WN.lastSeq = st.hum.map(() => 0); WN.seenT = st.hum.map(() => performance.now());
  WN.seq = 0; WN.q = []; WN.lastH = -1; WN.lastHostT = performance.now(); WN.logId = 0; WN.ready = false; WN.gone = false; WN.relT = 0; WN.survT = 0;
  WN.j = Math.random().toString(36).slice(2, 6); WN.jSeen = st.hum.map(() => ''); WN.lost = st.hum.map(() => false); WN.rjWant = null;
  warEnter();
  warStart(st.b, st.seed, st.d, { humans: st.hum.map(h => h[1]), skins: st.hum.map(h => h[2] || ''), me, net: role });
  warViewStart();
  if (role === 'client') wnSendClient();
}

// every change in the room: keep the lobby current, start when the host does, and (playing) take the host's state
function warNetPeers() {
  if (WAR.on && WAR.net === 'client') { wnApply(); return; }
  if (WAR.on) return;
  if (WN.code) {
    const m = wnMembers();
    if (!m.some(p => p.isMe && p.sameTab)) { WN.msg = 'That war filled up before you got in.'; wnLeave(); return; }
    const h = m[0], hw = h ? wnWar(h) : null;
    if (h && !(h.isMe && h.sameTab) && hw.st && hw.st.g && hw.st.g !== WN.doneG && Array.isArray(hw.st.hum)) {
      const k = hw.st.hum.findIndex(x => Array.isArray(x) && x[0] === NET.sid);
      if (k >= 0) {
        const st = { g: String(hw.st.g), seed: hw.st.seed >>> 0, b: clamp(hw.st.b | 0, 0, 50), d: WAR_DIFF[hw.st.d] ? hw.st.d : 'normal', hum: hw.st.hum.slice(0, WN_MAX).map(x => [String(x[0]), wnClean(String(x[1] || '')).slice(0, 18) || 'A house', typeof rcSkin === 'function' && rcSkin(x[2]) ? x[2] : '']) };
        wnBegin(st, k, 'client'); return;
      }
      WN.doneG = hw.st.g; WN.msg = 'The war started without you. Host your own, or wait for the next.'; WN.rjWant = null;
    }
    // the host's lobby settings follow the sliders; refresh what we publish now and then
    if (wnAmHost() && performance.now() - (WN.lobT || 0) > 3000) { WN.lobT = performance.now(); wnSendLobby(); }
  }
  wnRender();
}

// ---------- orders ----------
// every order goes through here: run at once alone or hosting, or sent to the host when joined
function warDo(kind, ...args) {
  const o = [0, kind, ...args];
  if (WAR.net === 'client') {
    o[0] = ++WN.seq; WN.q.push(o); if (WN.q.length > 12) WN.q.shift();
    if (kind === 'n') WN.ready = true;
    wnSendClient();
    return '';
  }
  if (WAR.net === 'host' && kind === 'n') { if (WAR.phase === 'spawn') WAR.spawnReady[WAR.me] = true; return ''; }
  return warApply(WAR.me, o);
}
function warApply(id, o) {
  const n = WAR.nations[id]; if (!n || !Array.isArray(o)) return '';
  const k = o[1], a = o[2], b = o[3], c = o[4];
  const tile = v => Number.isInteger(v) && v >= 0 && v < WAR.map.length;
  if (k === 's') { if (WAR.phase === 'spawn' && (a === -1 || (tile(a) && warGoodSpawn(a, WAR.spawnTaken)))) WAR.spawnPicks[id] = a; return ''; }
  if (k === 'n') { if (WAR.phase === 'spawn') WAR.spawnReady[id] = true; return ''; }
  if (WAR.phase !== 'play' || !n.alive) return '';
  const ratio = clamp(+b || 0, 0.01, 1);
  switch (k) {
    case 'a': if (!Number.isInteger(a) || a < -2 || a >= WAR.nations.length || a === id) return ''; warAttack(id, a, n.troops * ratio, null, tile(c) ? c : null); return '';
    case 'b': return tile(a) ? warSendBoat(id, a, n.troops * ratio) : '';
    case 'f': return tile(a) ? warSendBoat(id, a, 0, 'fire') : '';
    case 'u': return tile(b) && typeof a === 'string' && WN_TYPES[a] ? warBuild(n, a, b) : '';
    case 'l': return tile(a) ? warFlare(n, a) : '';
    case 'r': return warBell(n);
    case 'p': { const t = WAR.nations[a]; if (!t || a === id || !t.alive || n.allies.has(a)) return ''; const why = warPropose(id, a); if (why && why !== 'wait' && !t.human) t.reqCd = 45; return why === 'wait' ? `${t.name} has your offer already.` : why; }
    case 'x': if (Number.isInteger(a) && n.allies.has(a)) warBreakPact(id, a, true); return '';
    case 'y': { const p = WAR.prompts.find(q => q.from === a && q.to === id); if (p) warAnswerPrompt(p, !!b); return ''; }
  }
  return '';
}
function wnSendClient() {
  if (!WN.code || WAR.net !== 'client') return;
  const w = wnBase(); w.g = WN.g; w.j = WN.j; w.q = WN.q.slice(-12); wnSend(w);
}

// ---------- the host ----------
function wnPeerBySid(sid) {
  for (const p of NET.peers) { const w = wnWar(p); if (w && w.sid === sid && w.room === WN.code && !(p.isMe && p.sameTab)) return p; }
  return null;
}
function warNetHostTick(dt) {
  const now = performance.now();
  // the others' orders, each applied once, in order
  for (let h = 0; h < WN.hum.length; h++) {
    if (h === WAR.me) continue;
    const n = WAR.nations[h], p = wnPeerBySid(WN.hum[h]), w = p ? wnWar(p) : null;
    if (w && w.g === WN.g && fresh(p)) {
      WN.seenT[h] = now;
      // (a new mark: they've dropped out and come back. Their orders count from nought again, the map goes again
      //  whole, and a nation left to fight on alone is theirs again)
      if (typeof w.j === 'string' && w.j !== WN.jSeen[h]) {
        if (WN.jSeen[h] || WN.lost[h]) { WN.lastSeq[h] = 0; WN.sent = null; WN.sweepPtr = 0; if (!WN.lost[h]) warLog(`${n.name}'s player is back.`); }
        WN.jSeen[h] = w.j;
      }
      if (WN.lost[h]) { WN.lost[h] = false; if (n.alive) { n.human = true; delete n.bot; warLog(`${n.name}'s player is back, and has the helm again.`); } }
      if (Array.isArray(w.q)) {
        const qs = w.q.filter(o => Array.isArray(o) && Number.isInteger(o[0]) && o[0] > WN.lastSeq[h]).sort((x, y) => x[0] - y[0]);
        for (const o of qs) { WN.lastSeq[h] = o[0]; if (!n.human) continue; const why = warApply(h, o); if (why) warSay(n, why); }
      }
    } else if (n.human && now - WN.seenT[h] > 25000) {
      // gone for good: their nation carries on under its own steam
      n.human = false; n.bot = { aggr: 0.45, naval: 0.5, loyal: 0.6, greed: 0.5, next: 1, pactCd: 60 }; WN.lost[h] = true;
      for (let k = WAR.prompts.length - 1; k >= 0; k--) if (WAR.prompts[k].to === h) WAR.prompts.splice(k, 1);
      warLog(`${n.name} ${n.alive ? 'has lost its player; its people fight on alone' : 'has gone'}.`);
    }
  }
  // everyone ready to land: land now, without waiting out the clock
  if (WAR.phase === 'spawn' && WAR.nations.slice(0, WAR.nHumans).every(n => !n.human || WAR.spawnReady[n.id])) warBeginPlay();
  WN.sendT -= dt;
  if (WN.sendT > 0) return;
  WN.sendT = 0.1;
  wnSendHost();
}
// one send: the header, then what's due, then as many changed map rows as fit
function wnSendHost() {
  const W = WARC.W, Hh = WARC.H, own = WAR.owner;
  WN.tick++; WN.hseq++;
  const w = wnBase(); w.g = WN.g; w.st = WN.st;
  // the header
  const prompts = WAR.prompts.filter(p => p.to != null).map(p => `${b36(p.from)}.${b36(p.to)}.${b36(p.t)}`).join('!');
  w.h = [WN.hseq, WAR.t * 10, WAR.phase === 'spawn' ? 0 : 1, WAR.spawnT * 10, WAR.tideHigh ? 1 : 0, WAR.tideT * 10, (WAR.beam % 6.2832) * 1000, WAR.day, WAR.over == null ? -1 : WAR.over].map(b36).join(',') + '|' + prompts;
  // (the room counts UTF-8 bytes, 4 KiB for everything in our presence: keep well inside it)
  let size = wnBytes(w);
  const base = typeof myPresence === 'function' ? wnBytes(myPresence()) : 400;
  const budget = 3800 - base;
  const fits = (key, v) => { const add = wnBytes(v) + key.length + 4; if (size + add > budget) return false; w[key] = v; size += add; return true; };
  // the log: lines not yet sent (the host's own lines stay home)
  const lines = WAR.netLog.filter(l => l[0] > WN.logSentId && l[1] !== WAR.me).slice(-8);
  if (lines.length && fits('l', lines)) WN.logSentId = WAR.netLog.length ? WAR.netLog[WAR.netLog.length - 1][0] : WN.logSentId;
  else if (!lines.length && WAR.netLog.length) WN.logSentId = WAR.netLog[WAR.netLog.length - 1][0];
  // attacks, boats, flares (every other send)
  if (WN.tick % 2 === 0) fits('a', wnPackMoves());
  // a chunk of the nations, round the list
  const chunks = wnNationChunks();
  if (chunks.length) { const take = []; for (let k = 0; k < Math.min(2, chunks.length); k++) take.push(chunks[(WN.nPtr + k) % chunks.length]); if (fits('n', take)) WN.nPtr = (WN.nPtr + take.length) % chunks.length; else if (fits('n', [chunks[WN.nPtr % chunks.length]])) WN.nPtr = (WN.nPtr + 1) % chunks.length; }
  // a stretch of the buildings (every third send)
  if (WN.tick % 3 === 0) { const s = wnStructChunk(WN.sPtr); if (fits('s', s.v)) WN.sPtr = (WN.sPtr + 1) % s.K; }
  // map rows: changed ones first (from where we left off), then a slow sweep, so a late or missed row is put right
  if (!WN.sent || WN.sent.length !== own.length) WN.sent = new Int16Array(own.length).fill(-9);
  const rows = []; let room = budget - size - 10;
  const rowSame = y => { const o = y * W; for (let x = 0; x < W; x++) if (WN.sent[o + x] !== own[o + x]) return false; return true; };
  const addRow = y => {
    const parts = wnRowParts(y); let len = 0; for (const s of parts) len += s.length + 3;
    if (len > room) return false;
    for (const s of parts) rows.push(s); room -= len;
    WN.sent.set(own.subarray(y * W, y * W + W), y * W); return true;
  };
  let full = false;
  for (let k = 0; k < Hh && !full; k++) { const y = (WN.rowPtr + k) % Hh; if (rowSame(y)) continue; if (!addRow(y)) { WN.rowPtr = y; full = true; } }
  if (!full) for (let k = 0; k < 2; k++) { const y = WN.sweepPtr; if (!addRow(y)) break; WN.sweepPtr = (WN.sweepPtr + 1) % Hh; }
  if (rows.length) w.m = rows.slice(0, 60);
  wnSend(w);
}
function wnRowParts(y) {
  const W = WARC.W, own = WAR.owner, base = y * W, out = [];
  const enc = (x0, x1) => { let s = ''; let x = x0; while (x < x1) { const v = own[base + x]; let r = 1; while (x + r < x1 && own[base + x + r] === v) r++; s += WN_ALPHA[clamp(v + 2, 0, WN_ALPHA.length - 1)] + (r > 1 ? r : ''); x += r; } return s; };
  const split = (x0, x1) => { const s = enc(x0, x1); if (s.length <= 900 || x1 - x0 < 8) out.push(`${b36(y)}.${b36(x0)}:${s.slice(0, 990)}`); else { const m = (x0 + x1) >> 1; split(x0, m); split(m, x1); } };
  split(0, W);
  return out;
}
function wnNationChunks() {
  const H0 = WAR.nHumans, out = []; let cur = '';
  for (const n of WAR.nations) {
    const flags = (n.alive ? 1 : 0) | (n.light ? 2 : 0) | (n.human ? 4 : 0);
    const al = [...n.allies].map(([k, u]) => `${b36(k)}:${b36(u)}`).join('.');
    let rel = ''; for (let h = 0; h < H0; h++) rel += b36(clamp(Math.round((n.rel[h] + 1) * 17), 0, 34));
    const s = [n.id, n.troops, n.maxTroops, n.gold, n.tiles, flags, n.bell * 10, n.bellCd, n.flareCd, n.fireCd, n.reqCd, n.cx * 10, n.cy * 10, n.taken, n.kills, n.betrayed, n.regionsHeld].map(b36).join(',') + ',' + al + ',' + rel;
    if (cur && cur.length + s.length + 1 > 700) { out.push(cur); cur = ''; }
    cur += (cur ? ';' : '') + s;
  }
  if (cur) out.push(cur);
  return out;
}
function wnStructChunk(k) {
  const L = WAR.map.length, all = [...WAR.structs].sort((a, b) => a[0] - b[0]);
  const enc = ([i, s]) => `${b36(i)}.${WN_TYPES[s.type] || 'h'}.${b36(s.owner)}`;
  const total = all.reduce((t, e) => t + enc(e).length + 1, 0), K = Math.max(1, Math.ceil(total / 650));
  k = k % K; const lo = Math.floor(k * L / K), hi = Math.floor((k + 1) * L / K);
  let s = all.filter(([i]) => i >= lo && i < hi).map(enc).join('!');
  if (s.length > 980) s = s.slice(0, s.lastIndexOf('!', 980));
  return { K, v: [k, K, s] };
}
function wnPackMoves() {
  const at = WAR.attacks.slice(-40).map(a => `${b36(a.from)}.${b36(a.target)}.${b36(a.troops)}`).join('!');
  const bo = WAR.boats.slice(-30).map(b => { const nx = b.i < b.path.length - 1 ? warX(b.path[b.i + 1]) : b.x, ny = b.i < b.path.length - 1 ? warY(b.path[b.i + 1]) : b.y; return `${b36(b.from)}.${b36(b.x * 10)}.${b36(b.y * 10)}.${b36(Math.atan2(ny - b.y, nx - b.x) * 100)}.${b.kind === 'fire' ? 'f' : 't'}.${b36(b.troops)}.${b.hit > 0 ? 1 : 0}`; }).join('!');
  const fl = WAR.flares.slice(-15).map(f => `${b36(f.x)}.${b36(f.y)}.${b36(f.t * 10)}.${f.fire ? 1 : 0}.${b36(f.r || 0)}`).join('!');
  const ev = WAR.events.slice(-6).map(e => `${b36(e.x)}.${b36(e.y)}.${b36(e.t * 10)}`).join('!');
  let s = `${at}|${bo}|${fl}|${ev}`; if (s.length > 990) s = `${at.slice(0, 420)}|${bo.slice(0, 400)}|${fl.slice(0, 150)}|`;
  return s;
}

// ---------- the others: draw what the host sends ----------
function wnApply() {
  const p = wnPeerBySid(WN.hum[0]), w = p ? wnWar(p) : null;
  if (!w || w.g !== WN.g || typeof w.h !== 'string') return;
  const hd = w.h.split('|'), f = hd[0].split(',').map(p36);
  if (f[0] === WN.lastH) return;
  WN.lastH = f[0]; WN.lastHostT = performance.now();
  // the header
  const wasSpawn = WAR.phase === 'spawn';
  WAR.t = f[1] / 10; WAR.phase = f[2] ? 'play' : 'spawn'; WAR.spawnT = f[3] / 10;
  WAR.tideHigh = !!f[4]; WAR.tideT = f[5] / 10; WAR.beam = f[6] / 1000; WAR.day = f[7]; WAR.over = f[8] >= 0 ? f[8] : null;
  if (wasSpawn && WAR.phase === 'play') WN.ready = true;
  const me = WAR.me, prompts = [];
  for (const s of (hd[1] || '').split('!')) { if (!s) continue; const [fr, to, t] = s.split('.').map(p36); if (to !== me || !WAR.nations[fr]) continue; const old = WAR.prompts.find(q => q.from === fr); prompts.push(old ? Object.assign(old, { t }) : { from: fr, to, t, text: `${WAR.nations[fr].name} offers a pact: no war between you for four minutes.` }); }
  WAR.prompts = prompts;
  // the log
  if (Array.isArray(w.l)) for (const l of w.l) {
    if (!Array.isArray(l) || !(l[0] > WN.logId)) continue; WN.logId = l[0];
    if ((l[1] !== -1 && l[1] !== me) || l[2] === me) continue;
    WAR.log.push({ text: wnClean(l[4], 200), t: WAR.t, kind: ['good', 'bad'].includes(l[3]) ? l[3] : '' }); if (WAR.log.length > 60) WAR.log.shift(); WAR.logDirty = true;
  }
  // the nations
  if (Array.isArray(w.n)) for (const chunk of w.n) for (const s of String(chunk).split(';')) {
    const v = s.split(','), n = WAR.nations[p36(v[0])]; if (!n || v.length < 19) continue;
    const x = v.slice(0, 17).map(p36);
    n.troops = x[1]; n.maxTroops = x[2]; n.gold = x[3]; n.tiles = x[4]; n.alive = !!(x[5] & 1); n.light = !!(x[5] & 2); n.human = !!(x[5] & 4);
    n.bell = x[6] / 10; n.bellCd = x[7]; n.flareCd = x[8]; n.fireCd = x[9]; n.reqCd = x[10]; n.cx = x[11] / 10; n.cy = x[12] / 10; n.taken = x[13]; n.kills = x[14]; n.betrayed = x[15]; n.regionsHeld = x[16];
    n.allies = new Map(v[17] ? v[17].split('.').map(e => e.split(':').map(p36)) : []);
    const rel = v[18] || ''; for (let h = 0; h < rel.length && h < n.rel.length; h++) n.rel[h] = p36(rel[h]) / 17 - 1;
  }
  // the map
  if (Array.isArray(w.m)) {
    const W = WARC.W, own = WAR.owner;
    for (const s of w.m) {
      const str = String(s), c = str.indexOf(':'); if (c < 0) continue;
      const [ys, xs] = str.slice(0, c).split('.'), y = p36(ys); let x = p36(xs); if (y < 0 || y >= WARC.H) continue;
      const base = y * W; let k = c + 1;
      while (k < str.length && x < W) {
        const v = WN_DEC[str.charCodeAt(k)] ?? -99; k++; let r = 0;
        while (k < str.length && str.charCodeAt(k) >= 48 && str.charCodeAt(k) <= 57) { r = r * 10 + str.charCodeAt(k) - 48; k++; }
        if (v === -99) break; r = r || 1;
        for (let q = 0; q < r && x < W; q++, x++) own[base + x] = v;
      }
    }
    WAR.tickNo++;
  }
  // the buildings
  if (Array.isArray(w.s) && w.s.length === 3) {
    const L = WAR.map.length, K = Math.max(1, w.s[1] | 0), k = (w.s[0] | 0) % K, lo = Math.floor(k * L / K), hi = Math.floor((k + 1) * L / K);
    let changed = false;
    for (const i of [...WAR.structs.keys()]) if (i >= lo && i < hi) { WAR.structs.delete(i); changed = true; }
    for (const e of String(w.s[2] || '').split('!')) { if (!e) continue; const [i, t, o] = e.split('.'); const ii = p36(i), oo = p36(o); if (ii < lo || ii >= hi || !WN_TYPE_OF[t] || !WAR.nations[oo]) continue; WAR.structs.set(ii, { type: WN_TYPE_OF[t], owner: oo, hp: 1, t: WAR.t }); changed = true; }
    if (changed) {
      for (const n of WAR.nations) for (const key of Object.values(WAR_COUNT)) n[key] = 0;
      for (const [, s] of WAR.structs) WAR.nations[s.owner][WAR_COUNT[s.type]]++;
      warRails();
    }
  }
  // attacks, boats, flares
  if (typeof w.a === 'string') {
    const [at, bo, fl, ev] = w.a.split('|');
    const old = WAR.attacks;
    WAR.attacks = (at || '').split('!').filter(Boolean).map(s => { const [fr, tg, tr] = s.split('.').map(p36); const prev = old.find(a => a.from === fr && a.target === tg); return Object.assign(prev || { from: fr, target: tg, prog: 0, taken: 0 }, { troops: tr }); }).filter(a => WAR.nations[a.from]);
    WAR.boats = (bo || '').split('!').filter(Boolean).map(s => { const v = s.split('.'); return { from: p36(v[0]), x: p36(v[1]) / 10, y: p36(v[2]) / 10, ang: p36(v[3]) / 100, kind: v[4] === 'f' ? 'fire' : 'troops', troops: p36(v[5]), hit: v[6] === '1' ? 0.3 : 0, t: WAR.t, path: [], i: 0 }; }).filter(b => WAR.nations[b.from]);
    WAR.flares = (fl || '').split('!').filter(Boolean).map(s => { const v = s.split('.').map(p36); return { x: v[0], y: v[1], t: v[2] / 10, fire: !!v[3], r: v[4] || undefined }; });
    WAR.events = (ev || '').split('!').filter(Boolean).map(s => { const v = s.split('.').map(p36); return { kind: 'boom', x: v[0], y: v[1], t: v[2] / 10 }; });
  }
}
function warNetClientTick(dt) {
  if (WAR.phase === 'play') WAR.t += dt; else WAR.spawnT = Math.max(0, WAR.spawnT - dt);
  WAR.beam += dt * 6.283 / WARC.BEAM_TURN;
  for (const f of WAR.flares) f.t -= dt; for (const e of WAR.events) e.t = Math.max(0, e.t - dt);
  WN.relT += dt; if (WN.relT > 0.2) { WN.relT = 0; warRelight(); }
  WN.survT += dt; if (WN.survT > 2) { WN.survT = 0; wnRegions(); }
  const me = WAR.nations[WAR.me];
  if (WAR.phase === 'play' && !me.alive && !WAR.result && me.tiles <= 0 && WN.lastH > 0) warFinish('lost', null);
  warNetEnd();
  // the host has gone quiet: the war can't go on without them
  if (!WN.gone && performance.now() - WN.lastHostT > 15000) {
    WN.gone = true; WAR.spectate = true;
    if (!WAR.result) { WAR.result = { how: 'gone', days: WAR.day }; if (typeof warShowResult === 'function') warShowResult(WAR.result); }
    warLog('The host has gone. The war cannot go on without them.', 'bad');
  }
}
// which great isles are held whole (for their ✦), worked out from the map
function wnRegions() {
  const N = WAR.nations.length, cnt = new Int32Array(WAR.regions.length * N);
  for (let i = 0; i < WAR.map.length; i++) { const o = WAR.owner[i]; if (o >= 0 && o < N && WAR.region[i] >= 0) cnt[WAR.region[i] * N + o]++; }
  for (const r of WAR.regions) { r.owner = -1; if (!r.bonus) continue; for (let o = 0; o < N; o++) if (cnt[r.id * N + o] >= r.tiles * 0.97) r.owner = o; }
}

// ---------- dropping out and coming back (src/rejoin.js) ----------
// the record src/rejoin.js keeps: a war I've joined (null: in none; false: hosting it, which can't be come back to)
function wnRjRecord() {
  if (!WAR.on || !WAR.net || !WN.code || !WN.g || WAR.result) return null;
  if (WAR.net !== 'client') return false;
  return { k: 'war', code: WN.code, at: WN.at, g: WN.g, label: `${wnClean((WN.st && WN.st.hum[0] && WN.st.hum[0][1]) || 'Someone').slice(0, 18)}’s war (Drowned Reach)` };
}
function wnRjLive(r) { return NET.peers.some(p => { const w = wnWar(p); return w && w.room === r.code && w.st && w.st.g === r.g && fresh(p) && !(p.isMe && p.sameTab); }); }
const wnRjFor = code => { const r = typeof rjGet === 'function' ? rjGet() : null; return r && r.k === 'war' && r.code === code && r.sid === NET.sid ? r : null; };
// back into the war's room, in the same place; warNetPeers takes it from there once the host's word arrives
function wnRejoin(r) {
  if (!wnOnline() || WAR.on || !r) return false;
  WN.code = r.code; WN.at = +r.at || Date.now(); WN.msg = ''; WN.doneG = null; WN.rjWant = r;
  wnSendLobby(); wnRender();
  setTimeout(() => { if (WN.rjWant === r && !WAR.on) { WN.rjWant = null; if (typeof rjClear === 'function') rjClear(); WN.msg = 'That war has ended.'; wnLeave(); } }, 10000);
  return true;
}

// leaving a war (or its end): out of the room as well
function wnAfterStop() { if (WN.code) wnLeave(); }

(() => {
  if (!$('warMp')) return;
  $('warMpHost').addEventListener('click', wnHost);
  $('warMpLeave').addEventListener('click', wnLeave);
  $('warMpStart').addEventListener('click', wnStart);
  $('warMpBots').addEventListener('input', () => { $('warMpBotsOut').textContent = $('warMpBots').value; try { localStorage.setItem('skerry-war-mpbots', $('warMpBots').value); } catch (e) {} wnSendLobby(); });
  $('warDiff').addEventListener('change', wnSendLobby);
  $('warNick').addEventListener('change', () => { if (WN.code) wnSendLobby(); });
  try { const b = localStorage.getItem('skerry-war-mpbots'); if (b) $('warMpBots').value = b; } catch (e) {}
  $('warMpBotsOut').textContent = $('warMpBots').value;
  setInterval(() => { if (!WAR.on && !$('warTitle').closest('[hidden]')) wnRender(); }, 1500);
  addEventListener('pagehide', () => { if (WN.code && NET.room) NET.room.presence({ war: null }).catch(() => {}); });
})();
