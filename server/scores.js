// The scoreboard for copies of the game hosted on your own server: each player's best in Skerry Light,
// Wreckers' Night and the Drowned Reach.
//
// Scores are kept in a free hosted Redis at Upstash (https://upstash.com), reached over its REST API, so the
// server needs no database driver. Set two environment variables on the server (on Render: the service's
// Environment tab), copied from the database's page at Upstash ("REST API" section):
//   UPSTASH_REDIS_REST_URL     https://<something>.upstash.io
//   UPSTASH_REDIS_REST_TOKEN   the long token
// Without them, scores are kept in memory only and are lost whenever the server restarts.
//
// GET  /api/scores  -> { store, games: { skerry: [{n, s, b}], fps: [...], war: [...] } }   (top 25 of each)
// POST /api/scores  <- { id, name, game, s, b }   your bests; only ever raised, never lowered
//
// `id` is a random secret each browser makes for itself; it is never shown. Anyone can send a score, so
// this is an honest-players board: the numbers are capped at what the games can plausibly produce, each
// address may send a score every few seconds, and each browser has one entry per game.

const URL_ = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const STORE = URL_ && TOKEN ? 'upstash' : 'memory';
const KEY = game => 'skerry:scores:' + game;
const TOP = 25;
// what each game's two numbers are, and the most each can sensibly be
//   skerry: s = most voyages in one run,        b = voyages made in all
//   fps:    s = most kills in one round,        b = rounds won
//   war:    s = wars won,                       b = most land taken in one war (tiles)
//   zm:     s = most rounds held in one night,  b = most kills in one night
const GAMES = { skerry: [1000, 1e6], fps: [300, 1e5], war: [1e5, 1e6], zm: [1000, 1e6] };

const memory = new Map(); // game -> Map(id -> entry)
let cache = null, cacheAt = 0;
const lastPost = new Map(); // address -> time

async function redis(commands) {
  const res = await fetch(URL_ + '/pipeline', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error('upstash ' + res.status);
  const out = await res.json();
  return out.map(r => { if (r.error) throw new Error(r.error); return r.result; });
}

const cleanName = v => String(v || '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯<>&"]/g, '').trim().slice(0, 18) || 'A sailor';
const sortKey = e => e.s * 1e7 + e.b;

async function readAll() {
  const out = {};
  if (STORE === 'upstash') {
    const games = Object.keys(GAMES), res = await redis(games.map(g => ['HGETALL', KEY(g)]));
    games.forEach((g, k) => {
      const flat = res[k] || [], list = [];
      for (let i = 0; i + 1 < flat.length; i += 2) { try { const e = JSON.parse(flat[i + 1]); list.push(e); } catch (err) {} }
      out[g] = list;
    });
  } else for (const g of Object.keys(GAMES)) out[g] = [...(memory.get(g) || new Map()).values()];
  for (const g of Object.keys(out)) out[g] = out[g].filter(e => e && e.s + e.b > 0).sort((a, b) => sortKey(b) - sortKey(a)).slice(0, TOP).map(e => ({ n: cleanName(e.n), s: e.s | 0, b: e.b | 0 }));
  return out;
}

async function getBoard() {
  if (cache && Date.now() - cacheAt < 15000) return cache;
  cache = { store: STORE, games: await readAll() }; cacheAt = Date.now();
  return cache;
}

async function postScore(body, addr) {
  const { id, game } = body || {};
  if (typeof id !== 'string' || !/^[a-z0-9]{12,40}$/.test(id) || !GAMES[game]) return [400, { error: 'bad score' }];
  const [maxS, maxB] = GAMES[game];
  const s = Math.floor(Number(body.s)), b = Math.floor(Number(body.b));
  if (!(s >= 0 && s <= maxS && b >= 0 && b <= maxB)) return [400, { error: 'out of range' }];
  const now = Date.now();
  if (now - (lastPost.get(addr) || 0) < 3000) return [429, { error: 'slow down' }];
  lastPost.set(addr, now);
  if (lastPost.size > 5000) for (const [k, t] of lastPost) if (now - t > 60000) lastPost.delete(k);
  const name = cleanName(body.name);
  let prev = null;
  if (STORE === 'upstash') { const [v] = await redis([['HGET', KEY(game), id]]); try { prev = v ? JSON.parse(v) : null; } catch (e) {} }
  else prev = (memory.get(game) || new Map()).get(id) || null;
  const e = { n: name, s: Math.max(s, prev ? prev.s | 0 : 0), b: Math.max(b, prev ? prev.b | 0 : 0), at: now };
  if (prev && prev.s === e.s && prev.b === e.b && prev.n === e.n) return [200, { ok: true, same: true }];
  if (STORE === 'upstash') await redis([['HSET', KEY(game), id, JSON.stringify(e)]]);
  else { if (!memory.has(game)) memory.set(game, new Map()); memory.get(game).set(id, e); }
  cache = null;
  return [200, { ok: true }];
}

// the HTTP side: returns true if it handled the request
export function scoresRoute(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url !== '/api/scores') return false;
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'cache-control': 'no-store' };
  const reply = (code, obj) => { res.writeHead(code, headers); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return true; }
  if (req.method === 'GET') { getBoard().then(b => reply(200, b), err => { console.error('scores:', err.message); reply(503, { error: 'scores unavailable' }); }); return true; }
  if (req.method === 'POST') {
    let body = '', big = false;
    req.on('data', c => { body += c; if (body.length > 2000) { big = true; req.destroy(); } });
    req.on('end', () => {
      if (big) return;
      let data = null; try { data = JSON.parse(body); } catch (e) { reply(400, { error: 'bad json' }); return; }
      const addr = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      postScore(data, addr).then(([code, obj]) => reply(code, obj), err => { console.error('scores:', err.message); reply(503, { error: 'scores unavailable' }); });
    });
    return true;
  }
  reply(405, { error: 'method' });
  return true;
}
export const SCORE_STORE = STORE;
