// Sailing together: crews of up to three ships on the same sea.
//
// Two ways to connect, with the same calls behind both:
//  - on claude.ai, the artifact `room` capability (signed-in viewers only);
//  - anywhere else, the WebSocket relay in server/server.js (see src/transport.js).
// Everyone connected shares one lobby, and all crew traffic travels in presence (each player's
// own state object). Each ship sails on its own screen; crewmates see each other's positions,
// hull and bells. The crew's host (whoever joined first) chooses when to set sail.
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
  lastSend: 0, lastUi: 0, lastNames: 0,
  st: null,                 // my status on this voyage: 'sail' | 'port' | 'sunk' | 'taken'
  results: null,            // results of the last finished voyage
  message: '',
};
const MAX_CREW = 3;
const SLOT_COLORS = ['#ffcf86', '#ff9fb0', '#9fe6c2'];
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
  room.presence({ app: 'skerry', crew: null, nick: NET.nick || null }).catch(() => {});
  renderTogether();
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
    bell: NET.bells,
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
  if (others.length >= MAX_CREW) { NET.message = 'That crew already has three ships.'; renderTogether(); return; }
  enterCrew(code);
}
function enterCrew(code) {
  NET.crew = code; NET.joinedAt = Date.now(); NET.ready = false; NET.st = null;
  NET.launch = null; NET.launchSeen = null; NET.results = null; NET.message = '';
  NET.myHostFlag = false;
  crewMode = true;
  send();
  // pick up the host's launch, if this crew is already at sea
  checkLaunch();
  showCrewCard();
}
function leaveCrew(silent) {
  NET.crew = null; NET.ready = false; NET.st = null; NET.launch = null; NET.results = null; NET.myHostFlag = false;
  crewMode = false;
  NET.mates.clear();
  if (NET.room && !silent) NET.room.presence({ app: 'skerry', crew: null, nick: NET.nick || null, joinedAt: null, ready: null, launch: null, voy: null, st: null, bell: null, x: null, y: null, h: null, hull: null, stage: null }).catch(() => {});
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
        m = { peer: p.peer, x: +pr.x || 0, y: +pr.y || 0, h: +pr.h || 0, tx: 0, ty: 0, th: 0, bell: +pr.bell || 0, bob: Math.random() * 6 };
        NET.mates.set(p.peer, m);
      }
      m.by = p.by; m.slot = slotOf(p.peer); m.name = nameOf(p, m.slot);
      m.st = pr.voy === NET.launch.voy ? pr.st : null;
      m.hull = Number.isFinite(pr.hull) ? pr.hull : SK.HULL;
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
  if (d < 160 && g.maren.active && g.maren.stage >= 1) {
    g.maren.stage = 0; placeMaren(0);
    addLog(m.name + ' rang the bell close by. She falls back.', 'p');
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
    m.bob += dt;
  }
  if (!NET.room || !NET.crew) return;
  const now = performance.now();
  if (state === 'play' && now - NET.lastSend > 66) {
    NET.lastSend = now;
    send({ x: Math.round(ship.x * 10) / 10, y: Math.round(ship.y * 10) / 10, h: Math.round(ship.h * 1000) / 1000, hull: ship.hull, stage: g.maren.stage });
  }
  if (now - NET.lastNames > 3000) { NET.lastNames = now; refreshNames(); }
  if (now - NET.lastUi > 250) {
    NET.lastUi = now;
    checkResults();
    renderCrewHud();
    if (!$('crewCard').hidden) renderCrewCard();
  }
}

function myStatus(st) {
  NET.st = st;
  send(st === 'sail' ? {} : { x: null, y: null });
}

// a voyage is over for the crew once nobody on it is still at sea
function checkResults() {
  if (!NET.launch || NET.results || state === 'play' || state === 'scare') return;
  const list = members();
  const voy = NET.launch.voy;
  const live = p => p.isMe || Date.now() - (p.updatedAt || 0) < 20000;
  const atSea = list.filter(p => p.peer !== NET.myPeer && live(p) && p.presence && p.presence.voy === voy && p.presence.st === 'sail');
  if (atSea.length) return;
  const outcome = p => p.peer === NET.myPeer ? NET.st : (p.presence && p.presence.voy === voy ? p.presence.st : null);
  const rows = list.map((p, i) => ({ name: nameOf(p, i), slot: i, st: outcome(p) })).filter(r => r.st);
  NET.results = { voy, rows, madeIt: rows.filter(r => r.st === 'port').length };
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
  const crews = new Map();
  for (const p of NET.peers) {
    const c = p.presence && p.presence.app === 'skerry' && p.presence.crew;
    if (typeof c === 'string' && /^[a-z]+-\d{1,4}$/.test(c)) crews.set(c, (crews.get(c) || 0) + 1);
  }
  const here = NET.peers.filter(p => !(p.isMe && p.sameTab)).length;
  status.textContent = NET.message || (here ? (here === 1 ? '1 other sailor has this page open.' : here + ' other sailors have this page open.') : 'Nobody else has this page open yet. Start a crew and send them the link.');
  for (const [code, n] of crews) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = 'Crew ' + code.toUpperCase() + ' · ' + Math.min(n, MAX_CREW) + ' of ' + MAX_CREW;
    li.appendChild(label);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool';
    b.textContent = n >= MAX_CREW ? 'Full' : 'Join';
    b.disabled = n >= MAX_CREW;
    b.addEventListener('click', () => joinCrew(code));
    li.appendChild(b);
    list.appendChild(li);
  }
}
setInterval(() => { if (state === 'title' && !$('titleCard').hidden) renderTogether(); }, 1000);

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
    const nm = document.createElement('b'); nm.textContent = nameOf(p, i) + (i === 0 ? ' · host' : ''); li.appendChild(nm);
    const st = document.createElement('span'); st.textContent = crewRowStatus(p, i, voy); li.appendChild(st);
    ul.appendChild(li);
  });
  for (let i = list.length; i < MAX_CREW; i++) {
    const li = document.createElement('li'); li.className = 'empty';
    const dot = document.createElement('i'); li.appendChild(dot);
    const nm = document.createElement('b'); nm.textContent = 'Open berth'; li.appendChild(nm);
    ul.appendChild(li);
  }

  const title = $('crewTitle'), text = $('crewText'), page = $('crewLog');
  page.hidden = true;
  if (!NET.launch) {
    title.textContent = 'Crew Forming';
    text.textContent = 'Send this page to up to two friends. They join from the title screen by picking crew ' + NET.crew.toUpperCase() + '. Everyone sails their own brig through the same skerries. Ships close together keep Maren back, and a bell rung near a crewmate drives her away from both of you.';
  } else if (!r) {
    title.textContent = statusWord(NET.st) === 'In harbour' ? 'Safe in Harbour' : 'Lost at Sea';
    text.textContent = 'Voyage ' + voy + '. Waiting for the rest of the crew to make harbour or go down.';
  } else if (r.madeIt > 0) {
    title.textContent = r.madeIt === r.rows.length ? 'The Whole Crew Made It' : r.madeIt + ' of ' + r.rows.length + ' Made Harbour';
    text.textContent = 'Voyage ' + voy + ' is done. The next voyage has more wreckage and a slower light.';
    const pg = SK.LOG[(voy - 1) % SK.LOG.length];
    $('crewLogDate').textContent = pg.date; $('crewLogText').textContent = pg.text;
    page.hidden = false;
  } else {
    title.textContent = 'The Crew Is Lost';
    text.textContent = 'No ship made harbour on voyage ' + voy + '. The host can take the crew out again from voyage 1.';
  }

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
    nm.textContent = m.name + ' · ' + (m.st === 'sail' ? 'hull ' + m.hull : statusWord(m.st)) + d;
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
$('crewSailBtn').addEventListener('click', setSail);
$('crewReadyBtn').addEventListener('click', toggleReady);
$('crewLeaveBtn').addEventListener('click', () => leaveCrew(false));
netInit();
