// Sailing together: crews of up to eight ships on the same sea.
//
// Two ways to connect, with the same calls behind both:
//  - on claude.ai, the artifact `room` capability (signed-in viewers only);
//  - anywhere else, the WebSocket relay in server/server.js (see src/transport.js).
// Everyone connected shares one lobby, and all crew traffic travels in presence (each player's
// own state object). Each ship sails on its own screen; crewmates see each other's positions and
// hull, hear each other's bells and shouts, share flares, and patch each other's hulls when they
// sail close together. Once your voyage is over you can watch a crewmate's from their deck.
// The crew's host (whoever joined first) chooses when to set sail.
// With no connection the game plays solo exactly as before.

const NET = {
  status: 'connecting',     // 'connecting' | 'ready' | 'off'
  via: null,                // 'claude' | 'server'
  offReason: '',
  nick: '',
  room: null, user: null,
  myPeer: null,
  peers: [],
  crew: null,               // crew name I'm in
  joinedAt: 0,
  ready: false,
  launch: null,             // the voyage my crew is on: {id, seed, voy, at}
  launchSeen: null,         // id of the last launch I started
  mates: new Map(),         // peer -> remote ship
  names: {},
  bells: 0,
  flares: 0, flare: null,   // flares I've fired, and the last one
  shouts: 0, shout: null,
  watch: null,              // the crewmate I'm watching, once my own voyage is over
  chats: 0, chat: null, chatLog: [], lastChat: 0,
  ghosts: 0, ghost: null, ghostUsed: false,   // the one bell a spectator may ring for a crewmate
  stats: null,              // my numbers for the voyage scoreboard
  connected: true,
  pendingJoin: null,        // crew name from an invite link
  lastSend: 0, lastUi: 0, lastNames: 0,
  st: null,                 // my status on this voyage: 'sail' | 'port' | 'sunk' | 'taken'
  results: null,            // results of the last finished voyage
  message: '',
};
const MAX_CREW = 8;
const SLOT_COLORS = ['#ffcf86', '#ff9fb0', '#9fe6c2', '#9fc4ff', '#d7a6ff', '#ffe066', '#7fe0e0', '#ff9a66'];
const CREW_WORDS = ['gannet', 'wren', 'solan', 'tern', 'kestrel', 'brae', 'skerry', 'gull', 'merle', 'selkie'];
let crewMode = false;

async function netInit() {
  const off = reason => { NET.status = 'off'; NET.offReason = reason; renderTogether(); };
  let room = null, user = null;
  if (window.claude && typeof window.claude.use === 'function') {
    try { [room, user] = await Promise.all([window.claude.use('room'), window.claude.use('user').catch(() => null)]); } catch (e) {}
    if (!room) { off('Sailing together on claude.ai needs everyone to open this page signed in. You can still sail on your own.'); return; }
    NET.via = 'claude';
  } else {
    const url = crewServerUrl();
    if (url) room = await wsTransport(url);
    if (!room) { off('No crew server answered, so this copy of the game is solo only. You can still sail on your own.'); return; }
    NET.via = 'server';
  }
  NET.room = room; NET.user = user;
  room.onPeers(onPeersChange, () => {
    const wasCrew = !!NET.crew && state !== 'play';
    NET.status = 'off';
    NET.offReason = 'Lost the connection to your crew. Reload the page to reconnect.';
    leaveCrew(true);
    if (wasCrew) toTitle(); else renderTogether();
  });
  NET.status = 'ready';
  if (typeof room.onConnection === 'function') room.onConnection(c => { NET.connected = c; renderNetBanner(); }, () => {});
  room.presence({ app: 'skerry', crew: null, nick: NET.nick || null }).catch(() => {});
  renderTogether();
  // an invite link opens straight into its crew, once we've heard who is here
  if (NET.pendingJoin) setTimeout(() => { if (NET.pendingJoin && !NET.crew && state === 'title') joinCrew(NET.pendingJoin); NET.pendingJoin = null; }, 1800);
}

function onPeersChange(change) {
  NET.peers = change.peers.filter(p => p.kind === 'viewer');
  const me = NET.peers.find(p => p.isMe && p.sameTab);
  if (me) NET.myPeer = me.peer;
  syncMates();
  checkLaunch();
}

// ---------- crew bookkeeping ----------
function crewOf(code) {
  return NET.peers
    .filter(p => p.presence && p.presence.app === 'skerry' && p.presence.crew === code)
    .sort((a, b) => (a.presence.joinedAt || 0) - (b.presence.joinedAt || 0) || (a.peer < b.peer ? -1 : 1));
}
function members() {
  if (!NET.crew) return [];
  const list = crewOf(NET.crew);
  // my own entry may lag behind a fresh join; include myself regardless
  if (!list.some(p => p.peer === NET.myPeer)) list.push({ peer: NET.myPeer, by: null, isMe: true, sameTab: true, presence: myPresence(), updatedAt: Date.now() });
  return list.slice(0, MAX_CREW);
}
function host() { return members()[0] || null; }
function amHost() { const h = host(); return !!h && h.peer === NET.myPeer; }
function mySlot() { const i = members().findIndex(p => p.peer === NET.myPeer); return i < 0 ? 0 : i; }
function slotOf(peer) { const i = members().findIndex(p => p.peer === peer); return i < 0 ? 0 : i; }

function cleanNick(v) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '').trim().slice(0, 16) : '';
}
function nameOf(p, slot) {
  if (p.isMe && p.sameTab) return 'You';
  const n = (p.by && NET.names[p.by]) || cleanNick(p.presence && p.presence.nick);
  return n || 'Sailor ' + (slot + 1);
}
function refreshNames() {
  if (!NET.user || typeof NET.user.profiles !== 'function') return;
  const ids = [...new Set(NET.peers.map(p => p.by).filter(Boolean))];
  if (!ids.length) return;
  NET.user.profiles(ids).then(ps => {
    for (const id of ids) if (ps[id]) NET.names[id] = ps[id].name || '';
  }).catch(() => {});
}

function myPresence() {
  return {
    app: 'skerry', crew: NET.crew, joinedAt: NET.joinedAt, ready: NET.ready, nick: NET.nick || null,
    launch: amHostSafe() ? NET.launch : null,
    voy: NET.launch ? NET.launch.voy : 0, st: NET.st,
    bell: NET.bells, flare: NET.flare, shout: NET.shout, chat: NET.chat, ghost: NET.ghost, stats: NET.stats,
    skin: mySkin().id, pennant: CRATES.pennant, boat: CRATES.boat, maxHull: myBoat().hull,
  };
}
function amHostSafe() { return NET.crew && NET.myHostFlag; }

function send(extra) {
  if (!NET.room) return;
  NET.room.presence(Object.assign(myPresence(), extra || {})).catch(() => {});
}

function newCrewName() {
  const used = new Set(NET.peers.map(p => p.presence && p.presence.crew).filter(Boolean));
  for (let i = 0; i < 40; i++) {
    const c = pickOne(CREW_WORDS) + '-' + (10 + Math.floor(Math.random() * 90));
    if (!used.has(c)) return c;
  }
  return 'crew-' + Date.now() % 1000;
}

function startCrew() {
  audioInit();
  enterCrew(newCrewName());
}
function joinCrew(code) {
  audioInit();
  const others = crewOf(code).filter(p => p.peer !== NET.myPeer);
  if (others.length >= MAX_CREW) { NET.message = 'That crew is full: it already has ' + MAX_CREW + ' ships.'; renderTogether(); return; }
  enterCrew(code);
}
// join the fullest crew that still has a berth, preferring one that hasn't sailed yet
function quickJoin() {
  const open = crewSummaries().filter(c => c.n < MAX_CREW).sort((a, b) => (a.atSea - b.atSea) || (b.n - a.n));
  if (open.length) joinCrew(open[0].code); else startCrew();
}
function crewSummaries() {
  const crews = new Map();
  for (const p of NET.peers) {
    const c = p.presence && p.presence.app === 'skerry' && p.presence.crew;
    if (typeof c !== 'string' || !/^[a-z]+-\d{1,4}$/.test(c) || (p.isMe && p.sameTab)) continue;
    if (!crews.has(c)) crews.set(c, { code: c, n: 0 });
    crews.get(c).n++;
  }
  for (const c of crews.values()) {
    const h = crewOf(c.code)[0];
    c.host = h ? nameOf(h, 0) : '';
    const L = h && h.presence && h.presence.launch;
    c.atSea = L && Number.isFinite(L.voy) ? 1 : 0;
    c.voy = c.atSea ? L.voy | 0 : 0;
  }
  return [...crews.values()];
}
function enterCrew(code) {
  NET.crew = code; NET.joinedAt = Date.now(); NET.ready = false; NET.st = null;
  NET.launch = null; NET.launchSeen = null; NET.results = null; NET.message = '';
  NET.myHostFlag = false;
  crewMode = true;
  NET.chatLog = [];
  send();
  try { history.replaceState(null, '', '#' + code); } catch (e) {}
  // pick up the host's launch, if this crew is already at sea
  checkLaunch();
  showCrewCard();
}
function leaveCrew(silent) {
  NET.crew = null; NET.ready = false; NET.st = null; NET.launch = null; NET.results = null; NET.myHostFlag = false;
  crewMode = false;
  NET.mates.clear();
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  if (NET.room && !silent) NET.room.presence({ app: 'skerry', crew: null, nick: NET.nick || null, joinedAt: null, ready: null, launch: null, voy: null, st: null, bell: null, flare: null, shout: null, x: null, y: null, h: null, v: null, hull: null, stage: null, mx: null, my: null, px: null, py: null, chat: null, ghost: null, stats: null }).catch(() => {});
  stopSpectating();
  if (!silent) toTitle();
}
function toggleReady() { NET.ready = !NET.ready; send(); renderCrewCard(); }

// the host sets sail: voyage 1 when forming, the next voyage after a harbour, or voyage 1 again after losing everyone
function setSail() {
  if (!amHost()) return;
  audioInit();
  const r = NET.results;
  const voy = !NET.launch ? 1 : (r && r.madeIt > 0 ? NET.launch.voy + 1 : 1);
  NET.launch = { id: Math.random().toString(36).slice(2, 10), seed: Math.floor(Math.random() * 2 ** 31), voy, at: Date.now() };
  NET.myHostFlag = true;
  send();
  checkLaunch();
}

// follow the host's launch
function checkLaunch() {
  if (!NET.crew) return;
  const h = host();
  NET.myHostFlag = !!h && h.peer === NET.myPeer && !!NET.launch;
  const L = h && (h.peer === NET.myPeer ? NET.launch : h.presence && h.presence.launch);
  if (!L || typeof L !== 'object' || !L.id || L.id === NET.launchSeen) return;
  if (!Number.isFinite(L.seed) || !Number.isFinite(L.voy) || !Number.isFinite(L.at)) return;
  NET.launchSeen = L.id;
  NET.launch = { id: String(L.id), seed: L.seed | 0, voy: Math.max(1, Math.min(99, L.voy | 0)), at: L.at };
  NET.results = null;
  NET.st = 'sail';
  NET.ghostUsed = false;
  NET.stats = null;
  beginCrewVoyage(NET.launch, mySlot());
  send();
}

// ---------- remote ships ----------
function syncMates() {
  const seen = new Set();
  if (NET.crew && NET.launch) {
    for (const p of members()) {
      if (p.peer === NET.myPeer) continue;
      const pr = p.presence || {};
      seen.add(p.peer);
      let m = NET.mates.get(p.peer);
      if (!m) {
        m = { peer: p.peer, x: +pr.x || 0, y: +pr.y || 0, h: +pr.h || 0, tx: 0, ty: 0, th: 0, bell: +pr.bell || 0, bob: Math.random() * 6,
          flareN: counter(pr.flare), shoutN: counter(pr.shout), shoutT: 0, shoutText: '', ghostN: counter(pr.ghost) };
        NET.mates.set(p.peer, m);
      }
      m.skin = SKIN_BY_ID[pr.skin] || SKINS[0];
      m.boat = BOAT_BY_ID[pr.boat] ? pr.boat : 'brig';
      m.maxHull = Number.isFinite(pr.maxHull) ? pr.maxHull : BOAT_BY_ID[m.boat].hull;
      m.pennant = PENNANT_BY_ID[pr.pennant] || null;
      // what a spectator needs to see from their deck
      m.v = Number.isFinite(pr.v) ? pr.v : 8;
      m.stage = Number.isFinite(pr.stage) ? clamp(pr.stage | 0, 0, SK.MAREN_STAGES.length - 1) : 0;
      if (Number.isFinite(pr.mx) && Number.isFinite(pr.my)) { if (!Number.isFinite(m.mx)) { m.mx = pr.mx; m.my = pr.my; } m.tmx = pr.mx; m.tmy = pr.my; } else { m.mx = m.my = m.tmx = m.tmy = undefined; }
      if (Number.isFinite(pr.px) && Number.isFinite(pr.py)) { if (!Number.isFinite(m.px)) { m.px = pr.px; m.py = pr.py; } m.tpx = pr.px; m.tpy = pr.py; }
      const fl = counter(pr.flare);
      if (fl > m.flareN) {
        m.flareN = fl;
        if (Number.isFinite(pr.flare.x) && Number.isFinite(pr.flare.y)) mateFlare(m, pr.flare.x, pr.flare.y, pr.flare.skin);
      } else m.flareN = fl;
      const gh = counter(pr.ghost);
      if (gh > m.ghostN) { m.ghostN = gh; if (pr.ghost.to === NET.myPeer) ghostBellFor(m); }
      else m.ghostN = gh;
      m.stats = cleanStats(pr.stats);
      const sh = counter(pr.shout);
      if (sh > m.shoutN) {
        m.shoutN = sh;
        const text = SHOUTS[pr.shout.k];
        if (text) mateShout(m, text);
      } else m.shoutN = sh;
      m.by = p.by; m.slot = slotOf(p.peer); m.name = nameOf(p, m.slot);
      m.st = pr.voy === NET.launch.voy ? pr.st : null;
      m.hull = Number.isFinite(pr.hull) ? pr.hull : (m.maxHull || SK.HULL);
      m.updatedAt = p.updatedAt;
      if (Number.isFinite(pr.x) && Number.isFinite(pr.y) && Number.isFinite(pr.h)) {
        if (!m.placed) { m.x = pr.x; m.y = pr.y; m.h = pr.h; m.placed = true; }
        m.tx = pr.x; m.ty = pr.y; m.th = pr.h;
      }
      const bell = Number.isFinite(pr.bell) ? pr.bell : 0;
      if (bell > m.bell) { m.bell = bell; if (m.st === 'sail') mateRangBell(m); }
      else m.bell = bell;
    }
  }
  for (const k of [...NET.mates.keys()]) if (!seen.has(k)) NET.mates.delete(k);
  syncChat();
}

// chat travels as each sailor's latest line; we keep the history as lines arrive
const chatSeen = new Map();
function syncChat() {
  if (!NET.crew) return;
  let changed = false;
  members().forEach((p, i) => {
    if (p.peer === NET.myPeer) return;
    const c = p.presence && p.presence.chat, n = counter(c);
    const key = p.peer, prev = chatSeen.get(key);
    if (prev === undefined) { chatSeen.set(key, n); return; }   // don't replay what was said before we arrived
    if (n > prev) {
      chatSeen.set(key, n);
      const text = cleanText(c.text);
      if (!text) return;
      const name = nameOf(p, i);
      NET.chatLog.push({ name, slot: i, text });
      if (NET.chatLog.length > 30) NET.chatLog.shift();
      changed = true;
      if (state === 'play' && g && !g.attract) addLog(name + ': ' + text, 'p');
      sfxHorn(0, 0.25);
    }
  });
  if (changed) renderCrewChat();
}
function cleanText(v) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '').trim().slice(0, 90) : '';
}
function sendChat(text) {
  text = cleanText(text);
  if (!text || !NET.crew || performance.now() - NET.lastChat < 800) return false;
  NET.lastChat = performance.now();
  NET.chats++; NET.chat = { n: NET.chats, text };
  send();
  NET.chatLog.push({ name: 'You', slot: mySlot(), text });
  if (NET.chatLog.length > 30) NET.chatLog.shift();
  if (state === 'play' && g && !g.attract) addLog('You: ' + text, 'p');
  renderCrewChat();
  return true;
}
function renderCrewChat() {
  const ul = $('chatLog'); if (!ul) return;
  ul.textContent = '';
  for (const c of NET.chatLog.slice(-8)) {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = c.name + ' '; b.style.color = SLOT_COLORS[c.slot] || SLOT_COLORS[1];
    li.appendChild(b); li.appendChild(document.createTextNode(c.text));
    ul.appendChild(li);
  }
  ul.hidden = !NET.chatLog.length;
}

// a spectator's one bell, rung for the crewmate they're watching
function ghostBell() {
  if (!NET.watch || NET.ghostUsed) return;
  NET.ghostUsed = true;
  NET.ghosts++; NET.ghost = { n: NET.ghosts, to: NET.watch };
  send();
  sfxBellFar(0, 0.6);
  renderSpecBar();
}
function ghostBellFor(m) {
  if (!g || state !== 'play' || !g.maren.active) return;
  sfxBellFar(0, 0.8);
  if (g.maren.stage > 0) { g.maren.stage--; placeMaren(g.maren.stage); }
  addLog(m.name + ' rang a bell for you from beyond the voyage. She draws back.', 'p');
}

function cleanStats(s) {
  if (!s || typeof s !== 'object') return null;
  const n = v => Number.isFinite(v) ? Math.max(0, Math.min(9999, Math.round(v))) : 0;
  return { secs: n(s.secs), hits: n(s.hits), bells: n(s.bells), flares: n(s.flares), patched: n(s.patched), eaten: n(s.eaten) };
}

function counter(o) { return o && typeof o === 'object' && Number.isFinite(o.n) ? o.n : 0; }

function mateFlare(m, x, y, skin) {
  if (!g || g.attract) return;
  addFlare(x, y, skin);
  const d = Math.hypot(x - ship.x, y - ship.y);
  if (state === 'play') addLog(m.name + ' fired a flare, ' + Math.round(d) + ' m off.', 'p');
  if (d < 900) sfxFlare();
}
function mateShout(m, text) {
  m.shoutText = text; m.shoutT = 4;
  if (!g || g.attract) return;
  const d = Math.hypot(m.x - ship.x, m.y - ship.y);
  const pan = clamp(angDiff(bearingOf(m.x - ship.x, m.y - ship.y), ship.h) / (fov / 2), -1, 1);
  sfxHorn(pan, Math.max(0.3, 1 - d / 800));
  if (state === 'play') addLog(m.name + ': ' + text + ' (' + Math.round(d) + ' m)', 'p');
}

function matesAtSea() { return [...NET.mates.values()].filter(m => m.st === 'sail' && m.placed); }
function mateNear(dist) {
  return matesAtSea().some(m => Math.hypot(m.x - ship.x, m.y - ship.y) < dist);
}

function mateRangBell(m) {
  if (!g || state !== 'play') return;
  const d = Math.hypot(m.x - ship.x, m.y - ship.y);
  const pan = clamp(angDiff(bearingOf(m.x - ship.x, m.y - ship.y), ship.h) / (fov / 2), -1, 1);
  sfxBellFar(pan, Math.max(0.15, 1 - d / 600));
  if (d < SK.CREW_BELL_RANGE && g.maren.active && g.maren.stage >= 1) {
    g.maren.stage = Math.max(0, g.maren.stage - 2); placeMaren(g.maren.stage);
    addLog(m.name + ' rang the bell close by. She draws back a little.', 'p');
  } else {
    addLog(m.name + ' rang the bell.');
  }
}

// called every frame
function netTick(dt) {
  for (const m of NET.mates.values()) {
    const k = Math.min(1, dt * 6);
    m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k;
    m.h += angDiff(m.th, m.h) * k;
    if (Number.isFinite(m.tmx)) { m.mx += (m.tmx - m.mx) * k; m.my += (m.tmy - m.my) * k; }
    if (Number.isFinite(m.tpx)) { m.px += (m.tpx - m.px) * k; m.py += (m.tpy - m.py) * k; }
    if (m.shoutT > 0) m.shoutT -= dt;
    m.bob += dt;
  }
  if (!NET.room || !NET.crew) return;
  const now = performance.now();
  if (state === 'play' && now - NET.lastSend > 66) {
    NET.lastSend = now;
    const r1 = v => Math.round(v * 10) / 10;
    send({
      x: r1(ship.x), y: r1(ship.y), h: Math.round(ship.h * 1000) / 1000, v: r1(ship.v), hull: ship.hull, stage: g.maren.stage,
      mx: g.maren.active ? r1(g.maren.x) : null, my: g.maren.active ? r1(g.maren.y) : null,
      px: r1(g.plim.x), py: r1(g.plim.y),
    });
  }
  if (now - NET.lastNames > 3000) { NET.lastNames = now; refreshNames(); }
  if (now - NET.lastUi > 250) {
    NET.lastUi = now;
    checkResults();
    if (NET.watch) {
      const w = NET.mates.get(NET.watch);
      if (!w || w.st !== 'sail') nextSpectate(); else renderSpecBar();
    }
    renderCrewHud();
    renderNetBanner();
    if (!$('crewCard').hidden) renderCrewCard();
  }
}

function myStatus(st) {
  NET.st = st;
  if (st !== 'sail' && g && g.stats) NET.stats = cleanStats(Object.assign({}, g.stats, { secs: g.t }));
  send(st === 'sail' ? {} : { x: null, y: null });
}

function renderNetBanner() {
  const b = $('netBanner'); if (!b) return;
  b.hidden = !(crewMode && NET.status === 'ready' && !NET.connected);
}

// a voyage is over for the crew once nobody on it is still at sea
function checkResults() {
  if (!NET.launch || NET.results || state === 'play' || state === 'scare') return;
  if (!NET.connected) return;   // don't call the voyage while we can't hear the crew
  const list = members();
  const voy = NET.launch.voy;
  const live = p => p.isMe || Date.now() - (p.updatedAt || 0) < 20000;
  const atSea = list.filter(p => p.peer !== NET.myPeer && live(p) && p.presence && p.presence.voy === voy && p.presence.st === 'sail');
  if (atSea.length) return;
  const outcome = p => p.peer === NET.myPeer ? NET.st : (p.presence && p.presence.voy === voy ? p.presence.st : null);
  const statsOf = p => p.peer === NET.myPeer ? NET.stats : (p.presence && p.presence.voy === voy ? cleanStats(p.presence.stats) : null);
  const rows = list.map((p, i) => ({ name: nameOf(p, i), slot: i, st: outcome(p), stats: statsOf(p) })).filter(r => r.st);
  NET.results = { voy, rows, madeIt: rows.filter(r => r.st === 'port').length };
  stopSpectating();
  if (NET.results.madeIt > 0) {
    run.voyages = Math.max(run.voyages, voy);
    if (voy > best) { best = voy; try { localStorage.setItem('skerry-helm-best', String(best)); } catch (e) {} }
    sfxChime();
  }
  showCrewCard();
}

// ---------- UI ----------
function renderTogether() {
  const box = $('together'); if (!box) return;
  const status = $('togetherStatus'), list = $('crewList'), startBtn = $('crewStartBtn');
  list.textContent = '';
  const nickRow = $('nickRow');
  if (NET.status === 'off') {
    status.textContent = NET.offReason;
    startBtn.hidden = true; nickRow.hidden = true; return;
  }
  if (NET.status === 'connecting') { status.textContent = 'Looking for other sailors…'; startBtn.hidden = true; nickRow.hidden = true; return; }
  startBtn.hidden = false;
  nickRow.hidden = NET.via !== 'server';
  const crews = crewSummaries();
  const here = NET.peers.filter(p => !(p.isMe && p.sameTab)).length;
  status.textContent = NET.message || (here ? (here === 1 ? '1 other sailor has this page open.' : here + ' other sailors have this page open.') : 'Nobody else has this page open yet. Start a crew and send them the invite link.');
  $('crewQuickBtn').hidden = !crews.some(c => c.n < MAX_CREW);
  for (const c of crews) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = 'Crew ' + c.code.toUpperCase() + ' · ' + Math.min(c.n, MAX_CREW) + ' of ' + MAX_CREW +
      (c.host ? ' · ' + c.host + "'s" : '') + (c.atSea ? ' · at sea, voyage ' + c.voy : ' · forming');
    li.appendChild(label);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool';
    b.textContent = c.n >= MAX_CREW ? 'Full' : 'Join';
    b.disabled = c.n >= MAX_CREW;
    b.addEventListener('click', () => joinCrew(c.code));
    li.appendChild(b);
    list.appendChild(li);
  }
}
setInterval(() => { if (state === 'title' && !$('titleCard').hidden) renderTogether(); }, 1000);

// ---------- watching a crewmate ----------
function startSpectating(peer) {
  if (!NET.mates.get(peer)) return;
  NET.watch = peer;
  $('crewCard').hidden = true;
  $('specBar').hidden = false;
  renderSpecBar();
}
function stopSpectating() {
  NET.watch = null;
  const bar = $('specBar'); if (bar) bar.hidden = true;
}
function nextSpectate() {
  const list = matesAtSea();
  if (!list.length) { stopSpectating(); if (crewMode && state !== 'play') showCrewCard(); return; }
  const i = list.findIndex(m => m.peer === NET.watch);
  startSpectating(list[(i + 1) % list.length].peer);
}
function renderSpecBar() {
  const m = NET.mates.get(NET.watch); if (!m) return;
  $('specName').textContent = 'Watching ' + m.name;
  const danger = ['', 'she is out there', 'she is getting closer', 'she is close', 'she is at the bow'][m.stage] || '';
  $('specInfo').textContent = 'Hull ' + m.hull + ' of ' + (m.maxHull || SK.HULL) + (danger ? ' · ' + danger : '');
  $('specNext').hidden = matesAtSea().length < 2;
  const gb = $('specGhost');
  gb.disabled = NET.ghostUsed;
  gb.textContent = NET.ghostUsed ? 'Bell rung' : 'Ring a bell for ' + m.name;
}
// draw the scene from the watched crewmate's deck, then put my own state back
function withSpectatorView(draw) {
  const m = NET.watch && NET.mates.get(NET.watch);
  if (!m || !g) { draw(); return; }
  const mine = { ship, maren: g.maren, plim: g.plim, glare: g.glare };
  ship = { x: m.x, y: m.y, h: m.h, bob: m.bob, rudder: 0, v: m.v, inv: 0, hull: m.hull, maxHull: m.maxHull || SK.HULL, boat: m.boat || 'brig', sail: 0.5, skin: m.skin, pennant: m.pennant };
  g.maren = { active: Number.isFinite(m.mx), following: true, stage: m.stage, x: m.mx, y: m.my, apparition: 0, relB: 0 };
  g.plim = Object.assign({}, mine.plim, Number.isFinite(m.px) ? { x: m.px, y: m.py } : {}, { walking: true, phase: g.t * 9, dirX: Math.sin(m.h), dirY: Math.cos(m.h) });
  g.glare = 0;
  try { draw(); } finally { ship = mine.ship; g.maren = mine.maren; g.plim = mine.plim; g.glare = mine.glare; }
}

function showCrewCard() {
  for (const id of ['titleCard', 'portCard', 'endCard']) $(id).hidden = true;
  $('crewCard').hidden = false;
  renderCrewCard();
}

function crewRowStatus(p, i, voy) {
  const pr = p.presence || {};
  if (p.peer === NET.myPeer) {
    if (!NET.launch) return NET.ready || amHost() ? 'Ready' : 'Not ready';
    return statusWord(NET.st);
  }
  if (!NET.launch) return i === 0 ? 'Ready' : (pr.ready ? 'Ready' : 'Not ready');
  return pr.voy === voy ? statusWord(pr.st) : 'Joining';
}
function statusWord(st) {
  return { sail: 'At sea', port: 'In harbour', sunk: 'Sunk', taken: 'Taken by Maren' }[st] || 'Waiting';
}

function renderCrewCard() {
  if (!NET.crew) return;
  const list = members(), voy = NET.launch ? NET.launch.voy : 0, r = NET.results;
  $('crewName').textContent = 'Crew ' + NET.crew.toUpperCase();
  const ul = $('crewMembers'); ul.textContent = '';
  list.forEach((p, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('i'); dot.style.background = SLOT_COLORS[i]; li.appendChild(dot);
    const skin = SKIN_BY_ID[p.peer === NET.myPeer ? mySkin().id : p.presence && p.presence.skin] || SKINS[0];
    const who = document.createElement('b');
    who.className = 'who';
    who.appendChild(skinPreview(skin, 42));
    const nmText = document.createElement('span');
    nmText.textContent = nameOf(p, i) + (i === 0 ? ' · host' : '');
    const sk = document.createElement('small');
    sk.textContent = (BOAT_BY_ID[skin.boat] || BOATS[0]).name + ' · ' + skin.name;
    const ra = rarityOf(skin); if (ra) sk.style.color = ra.color;
    nmText.appendChild(document.createElement('br')); nmText.appendChild(sk);
    who.appendChild(nmText);
    li.appendChild(who);
    const st = document.createElement('span'); st.textContent = crewRowStatus(p, i, voy); li.appendChild(st);
    ul.appendChild(li);
  });
  if (list.length < MAX_CREW) {
    const li = document.createElement('li'); li.className = 'empty';
    const dot = document.createElement('i'); li.appendChild(dot);
    const open = MAX_CREW - list.length;
    const nm = document.createElement('b'); nm.textContent = open + (open === 1 ? ' open berth' : ' open berths'); li.appendChild(nm);
    ul.appendChild(li);
  }

  const title = $('crewTitle'), text = $('crewText'), page = $('crewLog');
  page.hidden = true;
  $('crewScore').hidden = true;
  // invite: a link on our own site; on claude.ai friends pick the crew from the list
  const inv = $('inviteRow');
  inv.hidden = !(NET.via === 'server' && (!NET.launch || r));
  if (!inv.hidden) $('inviteLink').value = location.origin + location.pathname + '#' + NET.crew;
  if (!NET.launch) {
    title.textContent = 'Crew Forming';
    text.textContent = 'Send the invite to up to seven friends. They join from the title screen by picking crew ' + NET.crew.toUpperCase() + '. Everyone sails their own brig through the same skerries. Ships close together keep Maren back, and a bell rung near a crewmate drives her away from both of you.';
  } else if (!r) {
    title.textContent = statusWord(NET.st) === 'In harbour' ? 'Safe in Harbour' : 'Lost at Sea';
    text.textContent = 'Voyage ' + voy + '. Waiting for the rest of the crew to make harbour or go down. You can watch them from their deck while you wait.';
  } else if (r.madeIt > 0) {
    title.textContent = r.madeIt === r.rows.length ? 'The Whole Crew Made It' : r.madeIt + ' of ' + r.rows.length + ' Made Harbour';
    text.textContent = 'Voyage ' + voy + ' is done. The next voyage has more wreckage and a slower light.';
    renderScore(r);
    const pg = SK.LOG[(voy - 1) % SK.LOG.length];
    $('crewLogDate').textContent = pg.date; $('crewLogText').textContent = pg.text;
    page.hidden = false;
  } else {
    title.textContent = 'The Crew Is Lost';
    text.textContent = 'No ship made harbour on voyage ' + voy + '. The host can take the crew out again from voyage 1.';
    renderScore(r);
  }
  renderCrewChat();

  const watchBox = $('crewWatch'); watchBox.textContent = '';
  if (NET.launch && !r) {
    for (const m of matesAtSea()) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool';
      b.textContent = 'Watch ' + m.name;
      b.addEventListener('click', () => startSpectating(m.peer));
      watchBox.appendChild(b);
    }
  }
  watchBox.hidden = !watchBox.childElementCount;

  const sail = $('crewSailBtn'), ready = $('crewReadyBtn'), wait = $('crewWait');
  const between = !NET.launch || r;
  sail.hidden = !(amHost() && between);
  sail.textContent = !NET.launch ? 'Set sail with ' + list.length + (list.length === 1 ? ' ship' : ' ships') : (r && r.madeIt ? 'Sail voyage ' + (voy + 1) : 'Sail from voyage 1');
  ready.hidden = !( !amHost() && !NET.launch );
  ready.textContent = NET.ready ? 'Not ready' : 'Ready';
  const h = host();
  wait.hidden = amHost() || !between;
  wait.textContent = h ? 'Waiting for ' + (nameOf(h, 0) === 'You' ? 'the host' : nameOf(h, 0)) + ' to set sail.' : '';
}

// the voyage scoreboard
function renderScore(r) {
  const tb = $('crewScoreBody'); tb.textContent = '';
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  for (const row of r.rows) {
    const tr = document.createElement('tr');
    const s = row.stats || {};
    const cells = [row.name, statusWord(row.st), s.secs ? fmt(s.secs) : '–', s.hits ?? '–', s.bells ?? '–', s.flares ?? '–', s.patched ?? '–', s.eaten ?? '–'];
    cells.forEach((v, i) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      td.textContent = String(v);
      if (i === 0) { td.scope = 'row'; td.style.color = SLOT_COLORS[row.slot] || ''; }
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  }
  $('crewScore').hidden = !r.rows.length;
}

function renderCrewHud() {
  const box = $('crewHud'); if (!box) return;
  box.hidden = !(crewMode && state === 'play');
  if (box.hidden) return;
  box.textContent = '';
  for (const m of [...NET.mates.values()].sort((a, b) => a.slot - b.slot)) {
    const row = document.createElement('div');
    const dot = document.createElement('i'); dot.style.background = SLOT_COLORS[m.slot] || SLOT_COLORS[1]; row.appendChild(dot);
    const nm = document.createElement('span');
    const d = m.st === 'sail' && m.placed ? ' · ' + Math.round(Math.hypot(m.x - ship.x, m.y - ship.y)) + 'm' : '';
    nm.textContent = m.name + ' · ' + (m.skin ? m.skin.name + ' · ' : '') + (m.st === 'sail' ? 'hull ' + m.hull : statusWord(m.st)) + d;
    row.appendChild(nm);
    box.appendChild(row);
  }
}

try { NET.nick = cleanNick(localStorage.getItem('skerry-nick') || ''); } catch (e) {}
$('nick').value = NET.nick;
$('nick').addEventListener('input', e => {
  NET.nick = cleanNick(e.target.value);
  try { localStorage.setItem('skerry-nick', NET.nick); } catch (err) {}
  if (NET.room) send();
});
$('crewStartBtn').addEventListener('click', startCrew);
$('specNext').addEventListener('click', nextSpectate);
$('specGhost').addEventListener('click', ghostBell);
$('crewQuickBtn').addEventListener('click', quickJoin);
$('chatForm').addEventListener('submit', e => {
  e.preventDefault();
  if (sendChat($('chatInput').value)) $('chatInput').value = '';
});
$('inviteCopy').addEventListener('click', () => {
  const field = $('inviteLink'), btn = $('inviteCopy');
  const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy link'; }, 1600); };
  try {
    navigator.clipboard.writeText(field.value).then(done, () => { field.select(); btn.textContent = 'Press Ctrl+C'; });
  } catch (e) { field.select(); btn.textContent = 'Press Ctrl+C'; }
});
// an invite link carries the crew name after the #
try { const h = (location.hash || '').slice(1); if (/^[a-z]+-\d{1,4}$/.test(h)) NET.pendingJoin = h; } catch (e) {}
// sound can only start after the first tap or click anywhere
document.addEventListener('pointerdown', () => audioInit(), { once: true });
$('specBack').addEventListener('click', () => { stopSpectating(); showCrewCard(); });
$('crewSailBtn').addEventListener('click', setSail);
$('crewReadyBtn').addEventListener('click', toggleReady);
$('crewLeaveBtn').addEventListener('click', () => leaveCrew(false));
netInit();
