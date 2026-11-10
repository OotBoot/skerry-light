// Cloud saves for copies of the game hosted on your own server: each player's crates and cosmetics (boats, flags,
// flares, weapon skins, outfits, banners, pirate tokens), kept under a recovery code so they can be brought back on
// any phone or browser.
//
// Kept in the same free Upstash Redis as the scoreboard (scores.js): the same two environment variables,
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Without them, saves are kept in memory only and are lost
// whenever the server restarts (the game says so to the player).
//
// POST /api/save  { op: 'get', code }               -> { store, found, v, data }
// POST /api/save  { op: 'put', code, v, data }      -> { store, ok: true, v }  or 409 { store, v, data } if the save
//                                                      has moved on since version v (another device): the game
//                                                      merges what's there into its own and tries again
//
// The recovery code (SKR-XXXX-XXXX-XXXX-XXXX, 80 random bits) is the only key: whoever has it has the save. It's
// never stored as it is, only its SHA-256. The save itself is the game's own JSON, at most 48 KB, and a save not
// touched for 400 days is let go.
import { createHash } from 'node:crypto';

const URL_ = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const STORE = URL_ && TOKEN ? 'upstash' : 'memory';
const CODE = /^SKR(-[A-HJ-NP-Z2-9]{4}){4}$/;
const MAX = 48 * 1024;
const KEEP = 400 * 24 * 3600;
const key = code => 'skerry:save:' + createHash('sha256').update(code).digest('hex');

const memory = new Map();   // key -> { v, d, at }
const hits = new Map();     // address -> [window start, count]

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
// write only if the version is still the one the game last saw (atomic, in Redis)
const CAS = `local cur = redis.call('HGET', KEYS[1], 'v') or '0'
if cur ~= ARGV[1] then return {0, cur, redis.call('HGET', KEYS[1], 'd') or ''} end
redis.call('HSET', KEYS[1], 'v', ARGV[2], 'd', ARGV[3], 'at', ARGV[4])
redis.call('EXPIRE', KEYS[1], ARGV[5])
return {1, ARGV[2]}`;

async function load(k) {
  if (STORE === 'upstash') {
    const [r] = await redis([['HMGET', k, 'v', 'd']]);
    if (!r || r[0] == null) return null;
    return { v: Number(r[0]) || 0, d: r[1] || '' };
  }
  return memory.get(k) || null;
}
async function store(k, v, d) {
  const nv = v + 1, at = Date.now();
  if (STORE === 'upstash') {
    const [r] = await redis([['EVAL', CAS, '1', k, String(v), String(nv), d, String(at), String(KEEP)]]);
    if (Number(r[0]) === 1) return { ok: true, v: nv };
    return { ok: false, v: Number(r[1]) || 0, d: r[2] || '' };
  }
  const cur = memory.get(k);
  if ((cur ? cur.v : 0) !== v) return { ok: false, v: cur.v, d: cur.d };
  memory.set(k, { v: nv, d, at });
  return { ok: true, v: nv };
}
const parse = d => { try { return d ? JSON.parse(d) : null; } catch (e) { return null; } };

async function handle(body, addr) {
  // (a few dozen calls a minute from one address at most)
  const now = Date.now(), h = hits.get(addr);
  if (!h || now - h[0] > 60000) hits.set(addr, [now, 1]); else if (++h[1] > 40) return [429, { error: 'slow down' }];
  if (hits.size > 5000) for (const [a, x] of hits) if (now - x[0] > 60000) hits.delete(a);
  const { op, code } = body || {};
  if (typeof code !== 'string' || !CODE.test(code)) return [400, { error: 'bad code' }];
  const k = key(code);
  if (op === 'get') {
    const s = await load(k);
    return [200, { store: STORE, found: !!s, v: s ? s.v : 0, data: s ? parse(s.d) : null }];
  }
  if (op === 'put') {
    const v = Math.floor(Number(body.v));
    if (!(v >= 0) || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return [400, { error: 'bad save' }];
    const d = JSON.stringify(body.data);
    if (d.length > MAX) return [413, { error: 'too big' }];
    const r = await store(k, v, d);
    if (r.ok) return [200, { store: STORE, ok: true, v: r.v }];
    return [409, { store: STORE, v: r.v, data: parse(r.d) }];
  }
  return [400, { error: 'bad op' }];
}

// the HTTP side: returns true if it handled the request
export function savesRoute(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url !== '/api/save') return false;
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'cache-control': 'no-store' };
  const reply = (code, obj) => { res.writeHead(code, headers); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return true; }
  if (req.method !== 'POST') { reply(405, { error: 'method' }); return true; }
  let body = '', big = false;
  req.on('data', c => { body += c; if (body.length > MAX + 2000) { big = true; reply(413, { error: 'too big' }); req.destroy(); } });
  req.on('end', () => {
    if (big) return;
    let data = null; try { data = JSON.parse(body); } catch (e) { reply(400, { error: 'bad json' }); return; }
    const addr = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    handle(data, addr).then(([code, obj]) => reply(code, obj), err => { console.error('saves:', err.message); reply(503, { error: 'saves unavailable' }); });
  });
  return true;
}
export const SAVE_STORE = STORE;
