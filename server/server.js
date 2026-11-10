// Skerry Light crew server.
//
// Serves the built game (dist/skerry-light.html) and relays crew traffic over a WebSocket at /ws.
// Each connected player keeps one small presence object (their crew, status, ship position).
// The server stores the latest one per player and passes it on: straight away to that player's
// crewmates, and at most once a second to everyone else in the lobby, who only need the crew lists.
// Nothing is saved to disk; restarting the server empties the lobby.
//
// No npm packages are needed.
//   npm run build
//   npm start            (PORT defaults to 8080)

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { attachWebSocket } from './ws-lite.js';
import { scoresRoute, SCORE_STORE } from './scores.js';
import { savesRoute, SAVE_STORE } from './saves.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 300;
const MAX_PRESENCE_BYTES = 4096;
const LOBBY_INTERVAL_MS = 1000;

const pagePath = join(root, 'dist', 'skerry-light.html');
function page() {
  if (!existsSync(pagePath)) return null;
  return readFileSync(pagePath);
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok ' + clients.size + ' connected\n');
    return;
  }
  if (scoresRoute(req, res)) return;
  if (savesRoute(req, res)) return;
  if (url === '/' || url === '/index.html') {
    const body = page();
    if (!body) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('The game has not been built yet. Run: npm run build\n');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found\n');
});

const clients = new Map(); // id -> client

function send(c, msg) {
  if (c.ws.readyState === 1) c.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

// keep only a plain, small JSON object
function cleanPresence(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const keys = Object.keys(p);
  if (keys.length > 48) return null;
  for (const k of keys) if (!/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(k)) return null;
  const text = JSON.stringify(p);
  if (Buffer.byteLength(text) > MAX_PRESENCE_BYTES) return null;
  return JSON.parse(text);
}

const onIsland = c => !!(c.presence && c.presence.fps);
// The Drowned Reach played together: everyone in one war hears everyone else in it at full rate
const warRoom = c => (c.presence && c.presence.war && typeof c.presence.war.room === 'string' ? c.presence.war.room : null);
// ...and everyone else only hears enough of a war to list it in the lobby, not the host's stream of the map
function warLite(p) {
  const w = p.war; if (!w || typeof w !== 'object') return p;
  const lite = { room: w.room, sid: w.sid, nick: w.nick, at: w.at };
  if (w.lob) lite.lob = w.lob; if (w.st && typeof w.st === 'object') lite.st = { g: w.st.g };
  return Object.assign({}, p, { war: lite });
}
// The Lighthouse played together: the same, for the four (at most) in one night
const zmRoom = c => (c.presence && c.presence.zm && typeof c.presence.zm.room === 'string' ? c.presence.zm.room : null);
function zmLite(p) {
  const z = p.zm; if (!z || typeof z !== 'object') return p;
  const lite = { room: z.room, sid: z.sid, nick: z.nick, at: z.at };
  if (z.lob) lite.lob = z.lob; if (z.st && typeof z.st === 'object') lite.st = { g: z.st.g };
  return Object.assign({}, p, { zm: lite });
}
// what someone in another war, another night or the lobby hears of this player
const liteFor = (from, c) => {
  let p = from.presence;
  if (warRoom(from) && warRoom(from) !== warRoom(c)) p = warLite(p);
  if (zmRoom(from) && zmRoom(from) !== zmRoom(c)) p = zmLite(p);
  return p;
};
const crewOf = c => (c.presence && typeof c.presence.crew === 'string' ? c.presence.crew : null);

function relay(from) {
  const msg = JSON.stringify({ t: 'state', peer: from.id, presence: from.presence });
  const room = warRoom(from), night = zmRoom(from);
  const crew = crewOf(from);
  const now = Date.now();
  for (const c of clients.values()) {
    if (c === from) continue;
    const mate = (crew && (crewOf(c) === crew || c.lastCrewSeen.get(from.id) === crew)) ||
      // Wreckers' Night: everyone on the island hears everyone else at full rate
      (onIsland(from) && onIsland(c)) ||
      (room && warRoom(c) === room) ||
      (night && zmRoom(c) === night);
    if (mate || now - (c.lastLobbySend.get(from.id) || 0) >= LOBBY_INTERVAL_MS) {
      if (mate || (!room && !night)) send(c, msg);
      else send(c, { t: 'state', peer: from.id, presence: liteFor(from, c) });
      c.lastLobbySend.set(from.id, now);
      c.lastCrewSeen.set(from.id, crew);
      c.pending.delete(from.id);
    } else {
      c.pending.add(from.id);
    }
  }
}

// catch up lobby players on anyone whose latest state they haven't had yet
setInterval(() => {
  const now = Date.now();
  for (const c of clients.values()) {
    for (const id of c.pending) {
      const from = clients.get(id);
      if (!from) { c.pending.delete(id); continue; }
      if (now - (c.lastLobbySend.get(id) || 0) < LOBBY_INTERVAL_MS) continue;
      send(c, { t: 'state', peer: id, presence: liteFor(from, c) });
      c.lastLobbySend.set(id, now);
      c.lastCrewSeen.set(id, crewOf(from));
      c.pending.delete(id);
    }
  }
}, 250);

attachWebSocket(server, '/ws', 8 * 1024, ws => {
  if (clients.size >= MAX_PLAYERS) { ws.close(1013, 'The harbour is full. Try again later.'); return; }
  const id = randomBytes(8).toString('hex');
  const c = { id, ws, presence: {}, alive: true, lastMsg: Date.now(), tokens: 80, last: Date.now(), lastLobbySend: new Map(), lastCrewSeen: new Map(), pending: new Set() };
  clients.set(id, c);
  send(c, { t: 'hello', peer: id, peers: [...clients.values()].filter(o => o !== c).map(o => ({ peer: o.id, presence: o.presence })) });

  ws.on('pong', () => { c.alive = true; });
  ws.on('message', data => {
    // about 40 messages a second, bursts of 80
    const now = Date.now();
    c.tokens = Math.min(80, c.tokens + (now - c.last) * 0.04); c.last = now;
    if (c.tokens < 1) return;
    c.tokens -= 1;
    let m;
    try { m = JSON.parse(data.toString()); } catch (e) { return; }
    if (!m || m.t !== 'presence') return;
    const p = cleanPresence(m.presence);
    if (!p) return;
    c.presence = p;
    c.lastMsg = now;
    // the same browser tab on a new connection (a phone that slept or lost signal): drop the old one now
    // rather than letting it linger as a stale copy until its heartbeat times out
    if (typeof p.sid === 'string') {
      for (const o of clients.values()) if (o !== c && o.presence && o.presence.sid === p.sid && now - o.lastMsg > 9000) o.ws.terminate();
    }
    relay(c);
  });
  ws.on('close', () => {
    clients.delete(id);
    const msg = JSON.stringify({ t: 'leave', peer: id });
    for (const o of clients.values()) { send(o, msg); o.lastLobbySend.delete(id); o.lastCrewSeen.delete(id); o.pending.delete(id); }
  });
  ws.on('error', () => {});
});

// drop connections that stopped answering
setInterval(() => {
  for (const c of clients.values()) {
    if (!c.alive) { c.ws.terminate(); continue; }
    c.alive = false;
    c.ws.ping();
  }
}, 10000);

server.listen(PORT, () => {
  console.log('Skerry Light is running at http://localhost:' + PORT);
  console.log('Cloud saves: ' + (SAVE_STORE === 'upstash' ? 'kept in Upstash Redis' : 'in memory only (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep them)'));
  console.log('Scoreboard: ' + (SCORE_STORE === 'upstash' ? 'kept in Upstash Redis' : 'in memory only (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep it)'));
  if (!page()) console.log('Warning: dist/skerry-light.html is missing. Run: npm run build');
});
