// The scoreboard for copies of the game hosted on your own server: every game each player plays is an entry of its
// own (a run of Skerry Light, a round of Wreckers' Night, a war, a night at the Lighthouse, a raid), so one player can
// be on a board many times. Before that it kept each player's best alone; those bests are still read, each as one
// entry, so nobody's old scores went missing.
//
// Scores are kept in a free hosted Redis at Upstash (https://upstash.com), reached over its REST API, so the
// server needs no database driver. Set two environment variables on the server (on Render: the service's
// Environment tab), copied from the database's page at Upstash ("REST API" section):
//   UPSTASH_REDIS_REST_URL     https://<something>.upstash.io
//   UPSTASH_REDIS_REST_TOKEN   the long token
// Without them, scores are kept in memory only and are lost whenever the server restarts.
//
// GET  /api/scores  -> { store, games: { skerry: [{n, s, b, c, f, me?}], fps: [...], war: [...], zm: [...], raid: [...] } }
//                      every game's entries, best first, up to 500 (and at most 25 of one player's); f: 0 for a game
//                      left or lost before its end; with an x-board-id header, that player's own are marked me: true
// POST /api/scores  <- { id, rid, name, game, s, b, c?, f? }   one game (rid: its own random id, made when it began),
//                      sent as it goes and once more at its end: each number only ever goes up, and f once set stays
// POST /api/scores  <- { id, name, game, s, b, p?, f?, was? }   (from pages before every game was its own entry) your bests; only ever raised, never lowered. p: 1 once
//                      you've played it (so you're on the board with nothing yet); f: 1 once you've finished a game of
//                      it (until then, f: 0 and the board shows an asterisk by your name). `was`: the id
//                      this player was on the board under before (a browser's own, before its save had a recovery
//                      code): that entry goes, and its bests carry over, so no one is on the board twice
//
// `id` is a random secret each browser makes for itself; it is never shown. Anyone can send a score, so
// this is an honest-players board: the numbers are capped at what the games can plausibly produce, each
// address may send a score every few seconds, and each browser has one entry per game.

const URL_ = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const STORE = URL_ && TOKEN ? 'upstash' : 'memory';
const KEY = game => 'skerry:scores:' + game;
const TOP = 500;   // everyone (the card shows the top ten, and All for the rest)
// every game played: a sorted set ranks them (by sortKey) and a hash holds each (field: "<player id>.<rid>")
const RKEY = game => 'skerry:runs:' + game, DKEY = game => 'skerry:rund:' + game;
const MAXRUNS = 4000, PER = 25;   // games kept for each board (the lowest let go), and most of one player's shown
// what one game's numbers are (a run's, a round's...), within the same caps as the bests below
//   skerry: s = voyages made, b = close shaves        fps: s = kills, b = 1 if you won the round
//   war:    s = 1 if won, b = land taken (tiles)       zm:  s = rounds held, b = kills
//   raid:   s = time through, as 100000 less its seconds (0: not through), b = damage to its bosses, c = kills
//   fogrun: s = the furthest island reached, b = time through if won (as raid), c = islands lit
//   fbsea:  s = sovereigns banked in the session, b = voyages done in it, c = sovereigns banked in all (as it stood)
const runsMem = new Map(); // game -> Map(field -> entry)
// what each game's two numbers are, and the most each can sensibly be
//   skerry: s = most voyages in one run,        b = voyages made in all
//   fps:    s = most kills in one round,        b = rounds won
//   war:    s = wars won,                       b = most land taken in one war (tiles)
//   zm:     s = most rounds held in one night,  b = most kills in one night
//   raid:   s = best time through Maren's End, as 100000 less its seconds (so higher is better; 0: never through),
//           b = most damage done to its bosses in one raid, c = the drowned sent back in all raids
//   gannet: the same, for the second raid, The Gannet's Wake
//   fogrun: s = the furthest island reached, b = time through a won run (as raid; 0: not won), c = islands lit (one
//           run's; a best: in all)
//   fbsea:  s = the most sovereigns banked in one session, b = the most voyages done in one, c = sovereigns in all
const GAMES = { skerry: [1000, 1e6], fps: [300, 1e5], war: [1e5, 1e6], zm: [1000, 1e6], raid: [1e5, 1e8, 1e7], gannet: [1e5, 1e8, 1e7], fogrun: [100, 1e5, 1e6], fbsea: [1e7, 1e4, 1e9] };

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
const sortKey = e => e.s * 1e9 + e.b;
// finished a game of it? (an entry from before the mark: yes if it has anything, but Maren's End only with a time)
const finished = (game, e) => !e ? 0 : 'f' in e ? (e.f ? 1 : 0) : (game === 'raid' || game === 'gannet' ? e.s | 0 : (e.s | 0) + (e.b | 0) + (e.c | 0)) > 0 ? 1 : 0;

// a best from before every game was its own entry, as one game: its numbers mean what a game's do, near enough
// (Skerry Light's voyages in all and Wreckers' Night's rounds won don't, so they go; wars won becomes won)
function oldAsRun(g, e) {
  const r = { id: e.id, n: e.n, s: e.s | 0, b: e.b | 0, c: e.c | 0, f: finished(g, e) };
  if (g === 'skerry' || g === 'fps') r.b = 0;
  if (g === 'war') r.s = r.s > 0 ? 1 : 0;
  return r;
}
async function readAll() {
  const out = {}, games = Object.keys(GAMES);
  if (STORE === 'upstash') {
    const res = await redis(games.flatMap(g => [['HGETALL', KEY(g)], ['ZREVRANGE', RKEY(g), 0, TOP * 2 - 1]]));
    const fields = games.map((g, k) => res[k * 2 + 1] || []);
    const want = games.map((g, k) => fields[k].length ? ['HMGET', DKEY(g), ...fields[k]] : null);
    const got = want.some(Boolean) ? await redis(want.filter(Boolean)) : [];
    let j = 0;
    games.forEach((g, k) => {
      const flat = res[k * 2] || [], list = [];
      for (let i = 0; i + 1 < flat.length; i += 2) { try { const e = JSON.parse(flat[i + 1]); e.id = flat[i]; list.push(oldAsRun(g, e)); } catch (err) {} }
      if (want[k]) { const vals = got[j++] || []; fields[k].forEach((f, i) => { try { if (vals[i]) { const e = JSON.parse(vals[i]); e.id = f.split('.')[0]; list.push(e); } } catch (err) {} }); }
      out[g] = list;
    });
  } else for (const g of games) out[g] = [...(memory.get(g) || new Map()).entries()].map(([id, e]) => oldAsRun(g, Object.assign({ id }, e)))
    .concat([...(runsMem.get(g) || new Map()).entries()].map(([f, e]) => Object.assign({}, e, { id: f.split('.')[0] })));
  for (const g of games) {
    const per = new Map();
    out[g] = out[g].filter(e => e && e.s + e.b + (e.c | 0) > 0).sort((a, b) => sortKey(b) - sortKey(a))
      .filter(e => { const k = (per.get(e.id) || 0) + 1; per.set(e.id, k); return k <= PER; })
      .slice(0, TOP).map(e => ({ id: e.id, n: cleanName(e.n), s: e.s | 0, b: e.b | 0, c: e.c | 0, f: e.f ? 1 : 0 }));
  }
  return out;
}

async function getBoard(me) {
  if (!cache || Date.now() - cacheAt >= 15000) { cache = { store: STORE, games: await readAll() }; cacheAt = Date.now(); }
  // (the ids stay here: each row goes out with only its name and numbers, and "me" for the asker's own)
  const games = {};
  for (const [g, list] of Object.entries(cache.games)) games[g] = list.map(e => me && e.id === me ? { n: e.n, s: e.s, b: e.b, c: e.c, f: e.f, me: true } : { n: e.n, s: e.s, b: e.b, c: e.c, f: e.f });
  return { store: STORE, games };
}

// one game, as it goes: each number only goes up, and finished once set stays
async function postRun(body, id, game, addr) {
  const rid = body.rid;
  if (typeof rid !== 'string' || !/^[a-z0-9]{6,24}$/.test(rid)) return [400, { error: 'bad game' }];
  const [maxS, maxB, maxC] = GAMES[game];
  const s = Math.floor(Number(body.s) || 0), b = Math.floor(Number(body.b) || 0), c = Math.floor(Number(body.c) || 0);
  if (!(s >= 0 && s <= maxS && b >= 0 && b <= maxB && c >= 0 && c <= (maxC || 1e7))) return [400, { error: 'out of range' }];
  const now = Date.now();
  if (now - (lastPost.get(addr) || 0) < 3000) return [429, { error: 'slow down' }];
  lastPost.set(addr, now);
  const field = id + '.' + rid;
  let prev = null;
  if (STORE === 'upstash') { const [v] = await redis([['HGET', DKEY(game), field]]); try { prev = v ? JSON.parse(v) : null; } catch (e) {} }
  else prev = (runsMem.get(game) || new Map()).get(field) || null;
  const e = { n: cleanName(body.name), s: Math.max(s, prev ? prev.s | 0 : 0), b: Math.max(b, prev ? prev.b | 0 : 0), c: Math.max(c, prev ? prev.c | 0 : 0), f: body.f || (prev && prev.f) ? 1 : 0, at: now };
  if (e.s + e.b + e.c <= 0) return [200, { ok: true, same: true }];
  if (prev && prev.s === e.s && prev.b === e.b && prev.c === e.c && prev.f === e.f && prev.n === e.n) return [200, { ok: true, same: true }];
  if (STORE === 'upstash') {
    const r = await redis([['HSET', DKEY(game), field, JSON.stringify(e)], ['ZADD', RKEY(game), sortKey(e) + e.c * 1e-3, field], ['ZCARD', RKEY(game)]]);
    // (too many: the lowest go)
    const extra = (r[2] | 0) - MAXRUNS;
    if (extra > 0) { const low = await redis([['ZRANGE', RKEY(game), 0, extra - 1]]); if (low[0] && low[0].length) await redis([['ZREMRANGEBYRANK', RKEY(game), 0, extra - 1], ['HDEL', DKEY(game), ...low[0]]]); }
  } else {
    if (!runsMem.has(game)) runsMem.set(game, new Map());
    const M = runsMem.get(game); M.set(field, e);
    if (M.size > MAXRUNS) { const low = [...M.entries()].sort((a, b) => sortKey(a[1]) - sortKey(b[1]))[0]; M.delete(low[0]); }
  }
  cache = null;
  return [200, { ok: true }];
}

async function postScore(body, addr) {
  const { id, game } = body || {};
  if (typeof id !== 'string' || !/^[a-z0-9]{12,40}$/.test(id) || !GAMES[game]) return [400, { error: 'bad score' }];
  if (body.rid != null) return postRun(body, id, game, addr);
  const [maxS, maxB, maxC] = GAMES[game];
  const s = Math.floor(Number(body.s)), b = Math.floor(Number(body.b)), c = maxC ? Math.floor(Number(body.c) || 0) : 0;
  if (!(s >= 0 && s <= maxS && b >= 0 && b <= maxB && c >= 0 && c <= (maxC || 0))) return [400, { error: 'out of range' }];
  const now = Date.now();
  if (now - (lastPost.get(addr) || 0) < 3000) return [429, { error: 'slow down' }];
  lastPost.set(addr, now);
  if (lastPost.size > 5000) for (const [k, t] of lastPost) if (now - t > 60000) lastPost.delete(k);
  const name = cleanName(body.name);
  let prev = null, old = null;
  const was = typeof body.was === 'string' && /^[a-z0-9]{12,40}$/.test(body.was) && body.was !== id ? body.was : null;
  if (STORE === 'upstash') {
    const [v, w] = await redis([['HGET', KEY(game), id], ['HGET', KEY(game), was || '-']]);
    try { prev = v ? JSON.parse(v) : null; } catch (e) {}
    try { old = was && w ? JSON.parse(w) : null; } catch (e) {}
  } else { const M = memory.get(game) || new Map(); prev = M.get(id) || null; old = was ? M.get(was) || null : null; }
  // (moving from an old id: its bests come along, and it goes)
  if (old) prev = { n: prev ? prev.n : old.n, s: Math.max(prev ? prev.s | 0 : 0, old.s | 0), b: Math.max(prev ? prev.b | 0 : 0, old.b | 0), c: Math.max(prev ? prev.c | 0 : 0, old.c | 0), p: 1, f: Math.max(finished(game, prev), finished(game, old)) };
  if (was) { if (STORE === 'upstash') await redis([['HDEL', KEY(game), was]]); else if (memory.has(game)) memory.get(game).delete(was); if (old) cache = null; }
  const e = { n: name, s: Math.max(s, prev ? prev.s | 0 : 0), b: Math.max(b, prev ? prev.b | 0 : 0), at: now };
  if (maxC) e.c = Math.max(c, prev ? prev.c | 0 : 0);
  // (played, and finished: once set, never taken back)
  e.p = body.p || prev || s + b + c > 0 ? 1 : 0;
  e.f = Math.max(body.f ? 1 : 0, finished(game, prev));
  if (prev && !old && prev.s === e.s && prev.b === e.b && (prev.c | 0) === (e.c | 0) && prev.n === e.n && prev.p === e.p && prev.f === e.f) return [200, { ok: true, same: true }];
  if (STORE === 'upstash') await redis([['HSET', KEY(game), id, JSON.stringify(e)]]);
  else { if (!memory.has(game)) memory.set(game, new Map()); memory.get(game).set(id, e); }
  cache = null;
  return [200, { ok: true }];
}

// the HTTP side: returns true if it handled the request
export function scoresRoute(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url !== '/api/scores') return false;
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-board-id', 'cache-control': 'no-store' };
  const reply = (code, obj) => { res.writeHead(code, headers); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return true; }
  const me = String(req.headers['x-board-id'] || ''), meOk = /^[a-z0-9]{12,40}$/.test(me) ? me : '';
  if (req.method === 'GET') { getBoard(meOk).then(b => reply(200, b), err => { console.error('scores:', err.message); reply(503, { error: 'scores unavailable' }); }); return true; }
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
