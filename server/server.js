// Skerry Light crew server.
//
// Serves the built game (dist/skerry-light.html) and relays crew traffic over a WebSocket at /ws.
// Each connected player keeps one small presence object (their crew, status, ship position).
// The server stores the latest one per player and passes it on: straight away to that player's
// crewmates, and at most once a second to everyone else in the lobby, who only need the crew lists.
// Nothing is saved to disk; restarting the server empties the lobby.
// A player whose game says so (v: 2 on its first copy) sends a patch of what changed rather than the whole object
// each time, and is sent patches in turn, for anyone whose every change it has been sent since a whole copy (who it
// heard of only now and then, in the lobby, gets a whole copy first). Everyone else hears whole copies, as before.
//
// No npm packages are needed.
//   npm run build
//   npm start            (PORT defaults to 8080)

import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants as Z } from 'node:zlib';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { attachWebSocket } from './ws-lite.js';
import { scoresRoute, SCORE_STORE } from './scores.js';
import { savesRoute, SAVE_STORE } from './saves.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 300;
const MAX_PRESENCE_BYTES = 12 * 1024;   // (a lighthouse night's host with forty drowned, bosses and a full feed comes to about 3 KB)
const LOBBY_INTERVAL_MS = 1000;

const pagePath = join(root, 'dist', 'skerry-light.html');
// The page, read once (and again only if the file changes), with its fingerprint (ETag) and its compressed copies,
// so a browser gets it Brotli- or gzip-compressed, and one that already has this version gets a 304 and nothing
// more: on Render's free plan, outbound bandwidth is what runs out first.
let pageCache = null;
function page() {
  if (!existsSync(pagePath)) return null;
  const mt = statSync(pagePath).mtimeMs;
  if (pageCache && pageCache.mt === mt) return pageCache;
  const raw = readFileSync(pagePath);
  pageCache = {
    mt, raw,
    etag: '"' + createHash('sha1').update(raw).digest('base64url').slice(0, 20) + '"',
    gz: gzipSync(raw, { level: 9 }),
    br: brotliCompressSync(raw, { params: { [Z.BROTLI_PARAM_QUALITY]: 9, [Z.BROTLI_PARAM_SIZE_HINT]: raw.length } }),
  };
  console.log(`Page: ${(raw.length / 1e6).toFixed(2)} MB, ${(pageCache.br.length / 1e6).toFixed(2)} MB with Brotli, ${(pageCache.gz.length / 1e6).toFixed(2)} MB with gzip`);
  return pageCache;
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
    const P = page();
    if (!P) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('The game has not been built yet. Run: npm run build\n');
      return;
    }
    // (no-cache: the browser keeps its copy but asks each time whether it's still current, so a new deploy shows at once)
    const head = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', etag: P.etag, vary: 'Accept-Encoding' };
    const seen = String(req.headers['if-none-match'] || '').split(',').map(t => t.trim().replace(/^W\//, ''));
    if (seen.includes(P.etag)) { res.writeHead(304, head); res.end(); return; }
    const ae = String(req.headers['accept-encoding'] || '');
    const [body, enc] = /\bbr\b/.test(ae) ? [P.br, 'br'] : /\bgzip\b/.test(ae) ? [P.gz, 'gzip'] : [P.raw, null];
    if (enc) head['content-encoding'] = enc;
    head['content-length'] = body.length;
    res.writeHead(200, head);
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found\n');
});

const clients = new Map(); // id -> client

function send(c, msg) {
  if (c.ws.readyState === 1) c.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

// keep only a plain, small JSON object (p came straight from JSON.parse, so it's plain data already)
const KEY = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
function cleanPresence(p) {
  if (!isObj(p)) return null;
  const keys = Object.keys(p);
  if (keys.length > 48) return null;
  for (const k of keys) if (!KEY.test(k) || k === '__proto__') return null;
  if (Buffer.byteLength(JSON.stringify(p)) > MAX_PRESENCE_BYTES) return null;
  return p;
}
// a patch onto someone's state (as src/transport.js makes them): d, what's new or changed, gone into key by key down
// to PT_DEPTH; x, the paths taken away. The new state, or null (and the old one stands) if it's malformed or too big.
const PT_DEPTH = 3;
function applyPatch(old, m) {
  const set = (o, d, depth) => {
    const out = isObj(o) ? Object.assign({}, o) : {};
    for (const k of Object.keys(d)) {
      if (k === '__proto__' || k.length > 64) return null;
      const v = d[k];
      if (isObj(v) && depth + 1 < PT_DEPTH) { const c = set(out[k], v, depth + 1); if (!c) return null; out[k] = c; } else out[k] = v;
    }
    return out;
  };
  const out = isObj(m.d) ? set(old, m.d, 0) : Object.assign({}, old);
  if (!out) return null;
  if (Array.isArray(m.x)) {
    if (m.x.length > 400) return null;
    for (const p of m.x) {
      if (!Array.isArray(p) || !p.length || p.length > PT_DEPTH || p.some(k => typeof k !== 'string' || k === '__proto__')) return null;
      let o = out;
      for (let i = 0; i < p.length - 1 && o; i++) { if (!isObj(o[p[i]])) { o = null; break; } o[p[i]] = Object.assign({}, o[p[i]]); o = o[p[i]]; }
      if (o) delete o[p[p.length - 1]];
    }
  }
  return cleanPresence(out);
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

function relay(from, patch) {
  let msg = null, pmsg = null;
  const full = () => msg || (msg = JSON.stringify({ t: 'state', peer: from.id, presence: from.presence }));
  const part = () => pmsg || (pmsg = JSON.stringify({ t: 'patch', peer: from.id, d: patch.d, x: patch.x }));
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
      if (mate || (!room && !night)) {
        // (a patch only to someone who has had every change of this player's since a whole copy)
        if (patch && c.v2 && c.upToDate.has(from.id)) send(c, part());
        else { send(c, full()); c.upToDate.add(from.id); }
      } else { send(c, { t: 'state', peer: from.id, presence: liteFor(from, c) }); c.upToDate.delete(from.id); }
      c.lastLobbySend.set(from.id, now);
      c.lastCrewSeen.set(from.id, crew);
      c.pending.delete(from.id);
    } else {
      c.pending.add(from.id); c.upToDate.delete(from.id);
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
      const p = liteFor(from, c);
      send(c, { t: 'state', peer: id, presence: p });
      if (p === from.presence) c.upToDate.add(id); else c.upToDate.delete(id);
      c.lastLobbySend.set(id, now);
      c.lastCrewSeen.set(id, crewOf(from));
      c.pending.delete(id);
    }
  }
}, 250);

attachWebSocket(server, '/ws', 16 * 1024, ws => {
  if (clients.size >= MAX_PLAYERS) { ws.close(1013, 'The harbour is full. Try again later.'); return; }
  const id = randomBytes(8).toString('hex');
  const c = { id, ws, presence: {}, alive: true, lastMsg: Date.now(), tokens: 80, last: Date.now(), lastLobbySend: new Map(), lastCrewSeen: new Map(), pending: new Set(), upToDate: new Set(), v2: false };
  clients.set(id, c);
  const others = [...clients.values()].filter(o => o !== c);
  send(c, { t: 'hello', v: 2, peer: id, peers: others.map(o => ({ peer: o.id, presence: o.presence })) });
  for (const o of others) c.upToDate.add(o.id);

  ws.on('pong', () => { c.alive = true; });
  ws.on('message', data => {
    // about 40 messages a second, bursts of 80
    const now = Date.now();
    c.tokens = Math.min(80, c.tokens + (now - c.last) * 0.04); c.last = now;
    if (c.tokens < 1) return;
    c.tokens -= 1;
    let m;
    try { m = JSON.parse(data.toString()); } catch (e) { return; }
    if (!m || (m.t !== 'presence' && m.t !== 'patch')) return;
    const p = m.t === 'patch' ? applyPatch(c.presence, m) : cleanPresence(m.presence);
    if (!p) return;
    if (m.t === 'presence' && m.v >= 2) c.v2 = true;
    c.presence = p;
    c.lastMsg = now;
    // the same browser tab on a new connection (a phone that slept or lost signal): drop the old one now
    // rather than letting it linger as a stale copy until its heartbeat times out
    if (typeof p.sid === 'string') {
      for (const o of clients.values()) if (o !== c && o.presence && o.presence.sid === p.sid && now - o.lastMsg > 9000) o.ws.terminate();
    }
    relay(c, m.t === 'patch' ? m : null);
  });
  ws.on('close', () => {
    clients.delete(id);
    const msg = JSON.stringify({ t: 'leave', peer: id });
    for (const o of clients.values()) { send(o, msg); o.lastLobbySend.delete(id); o.lastCrewSeen.delete(id); o.pending.delete(id); o.upToDate.delete(id); }
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

page();   // (compressed now, before the first visitor)
server.listen(PORT, () => {
  console.log('Skerry Light is running at http://localhost:' + PORT);
  console.log('Cloud saves: ' + (SAVE_STORE === 'upstash' ? 'kept in Upstash Redis' : 'in memory only (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep them)'));
  console.log('Scoreboard: ' + (SCORE_STORE === 'upstash' ? 'kept in Upstash Redis' : 'in memory only (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep it)'));
  if (!page()) console.log('Warning: dist/skerry-light.html is missing. Run: npm run build');
});
