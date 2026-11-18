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
// POST /api/scores  <- { mmr: 1, id, name, kind: 'bot' | 'net', res: 'w' | 'l' | 'd', lvl?, g?, side?, opp?, host? }
//                      a finished Skerry Clash match, for its rating (MMR); see the section below. The GET's games
//                      gain `clash`: one entry a username, { n, s: rating, b: wins, c: matches, f: 1, me? }, by rating
//
// `id` is a random secret each browser makes for itself; it is never shown. Anyone can send a score, so
// this is an honest-players board: the numbers are capped at what the games can plausibly produce, each
// address may send a score every few seconds, and each browser has one entry per game.

import { clientAddr } from './addr.js';

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
//   golf:   s = 200 less a round of nine's score to par (0 until it's finished), b = holes played, c = birdies or better
const GAMES = { skerry: [1000, 1e6], fps: [300, 1e5], war: [1e5, 1e6], zm: [1000, 1e6], raid: [1e5, 1e8, 1e7], gannet: [1e5, 1e8, 1e7], fogrun: [100, 1e5, 1e6], fbsea: [1e7, 1e4, 1e9], golf: [1000, 100, 100] };

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
  if (!cache || Date.now() - cacheAt >= 15000) { cache = { store: STORE, games: await readAll(), clash: await mmrBoard() }; cacheAt = Date.now(); }
  // (the ids stay here: each row goes out with only its name and numbers, and "me" for the asker's own)
  const games = {};
  cache.games.clash = cache.clash || [];
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
  if (body && body.mmr) return postMmr(body, addr);
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

// ---------- Skerry Clash's rating (MMR) ----------
// One rating a username (the scoreboard name, trimmed, lower-cased, its spaces run together), from 1000, by Elo:
// K 32 for a duel online, and K 16 for a match against the bot, counted as a match against a fixed rating (easy 800,
// normal 1100, hard 1300), so a player alone still has one but the online duels count for more. A draw is half a
// win; nobody goes below 0. Each name is kept as { n: as shown, id, r, w, l, d, b: the best r, at: last played }.
// The rating belongs to the username alone: any save on any device playing under that name adds to the same rating
// (id is only the board id that played under it last). A new username starts again from 1000.
// GET /api/scores?mmr=<name> -> { ok, p: { n, r, b, w, l, d, at } | null }: a username's rating, so a device that's
// never played under it shows the real one.
// Against the bot: rated at once, but at most one result a minute for each id. Online: each side reports the duel by
// its id g, with its side, its result and the other's name; the report waits (15 minutes) until the other side's
// comes, and only when the two agree (one won and one lost, or both drew; two different ids; each names the other)
// are both names rated, together. The first word from each side stands; the same report again is answered with
// what it did (so a page can ask again until the other side is in). The two halves of a duel are matched under a
// short lock (SET NX), so two reports at the same moment can't both miss each other or both apply.
// Keys: skerry:mmr:p:<name> the player, skerry:mmr:rank by rating, :g:<g>:<side> a report, :done:<g> what a duel
// did (a day), :lock:<g>, :bot:<id> the minute between bot results. In memory alike without Upstash.
const MK = { p: n => 'skerry:mmr:p:' + n, rank: 'skerry:mmr:rank', g: (g, s) => 'skerry:mmr:g:' + g + ':' + s, done: g => 'skerry:mmr:done:' + g, lock: g => 'skerry:mmr:lock:' + g, bot: id => 'skerry:mmr:bot:' + id };
const MMR0 = 1000, MMR_BOT = { easy: 800, normal: 1100, hard: 1300 }, K_NET = 32, K_BOT = 16;
const mmrNorm = v => cleanName(v).toLowerCase().replace(/\s+/g, ' ');
const elo = (ra, rb, s, k) => Math.max(0, Math.round(ra + k * (s - 1 / (1 + Math.pow(10, (rb - ra) / 400)))));
const mmrMem = new Map(), mmrRank = new Map(), lastMmr = new Map();   // (key -> { v, exp }; name -> rating; address.id -> time)
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function kvGet(keys) {
  if (STORE === 'upstash') { const [vals] = await redis([['MGET', ...keys]]); return (vals || []).map(v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }); }
  const now = Date.now(); return keys.map(k => { const e = mmrMem.get(k); return e && (!e.exp || e.exp > now) ? e.v : null; });
}
// (nx: only if it isn't there; ttl in ms; true if it was set)
async function kvSet(key, v, ttl, nx) {
  if (STORE === 'upstash') { const c = ['SET', key, JSON.stringify(v)]; if (ttl) c.push('PX', ttl); if (nx) c.push('NX'); const [r] = await redis([c]); return r === 'OK'; }
  const now = Date.now(), e = mmrMem.get(key); if (nx && e && (!e.exp || e.exp > now)) return false;
  mmrMem.set(key, { v, exp: ttl ? now + ttl : 0 });
  if (mmrMem.size > 20000) for (const [k, x] of mmrMem) if (x.exp && x.exp <= now) mmrMem.delete(k);
  return true;
}
async function kvDel(key) { if (STORE === 'upstash') await redis([['DEL', key]]); else mmrMem.delete(key); }
// the players, all in one go, and their places by rating
async function mmrPut(list) {
  if (STORE === 'upstash') await redis(list.flatMap(([k, P]) => [['SET', MK.p(k), JSON.stringify(P)], ['ZADD', MK.rank, P.r, k]]));
  else for (const [k, P] of list) { mmrMem.set(MK.p(k), { v: P, exp: 0 }); mmrRank.set(k, P.r); }
  cache = null;
}
async function mmrBoard() {
  let keys;
  if (STORE === 'upstash') [keys] = await redis([['ZREVRANGE', MK.rank, 0, TOP - 1]]);
  else keys = [...mmrRank.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(e => e[0]);
  if (!keys || !keys.length) return [];
  const P = await kvGet(keys.map(MK.p));
  return P.filter(p => p && p.w + p.l + p.d > 0).sort((a, b) => b.r - a.r || b.w - a.w).map(p => ({ id: p.id, n: cleanName(p.n), s: p.r | 0, b: p.w | 0, c: (p.w + p.l + p.d) | 0, f: 1 }));
}
function mmrApply(P, res, opp, k, name, now) {
  const was = P.r; P.r = elo(P.r, opp, res === 'w' ? 1 : res === 'd' ? 0.5 : 0, k);
  P[res === 'w' ? 'w' : res === 'd' ? 'd' : 'l']++; P.b = Math.max(P.b, P.r); P.n = name; P.at = now;
  return P.r - was;
}
const mmrNew = id => ({ n: '', id, r: MMR0, w: 0, l: 0, d: 0, b: MMR0, at: 0 });
const mmrOut = (P, d) => ({ ok: true, rated: 1, r: P.r, d, b: P.b, w: P.w, l: P.l, dr: P.d });
// what a duel did, for the side asking
function mmrAnswer(done, id) {
  if (done.err) return [200, { ok: true, rated: 0, why: done.err }];
  const e = (done.s || []).find(x => x.id === id);
  return e ? [200, Object.assign({ ok: true, rated: 1 }, e.o)] : [200, { ok: true, rated: 0, why: 'not yours' }];
}
// one username's rating, as it stands
async function getMmr(name) {
  if (!String(name || '').trim()) return { ok: true, p: null };
  const key = mmrNorm(name);
  const [P] = await kvGet([MK.p(key)]);
  return { ok: true, p: P ? { n: cleanName(P.n), r: P.r | 0, b: P.b | 0, w: P.w | 0, l: P.l | 0, d: P.d | 0, at: +P.at || 0 } : null };
}
async function postMmr(body, addr) {
  const id = body.id, kind = body.kind, res = body.res;
  if (typeof id !== 'string' || !/^[a-z0-9]{12,40}$/.test(id) || (kind !== 'bot' && kind !== 'net') || !['w', 'l', 'd'].includes(res)) return [400, { error: 'bad result' }];
  if (!String(body.name || '').trim()) return [400, { error: 'no name' }];
  const name = cleanName(body.name), key = mmrNorm(body.name), now = Date.now();
  // (each browser every few seconds: two keepers on one address can both send)
  const lk = addr + '.' + id + '.' + key;
  if (now - (lastMmr.get(lk) || 0) < 3000) return [429, { error: 'slow down' }];
  lastMmr.set(lk, now);
  if (lastMmr.size > 5000) for (const [k, t] of lastMmr) if (now - t > 60000) lastMmr.delete(k);
  const [mine] = await kvGet([MK.p(key)]);
  if (kind === 'bot') {
    if (!MMR_BOT[body.lvl]) return [400, { error: 'bad level' }];
    if (!(await kvSet(MK.bot(id), 1, 60000, true))) return [429, { error: 'too soon', soon: 1 }];
    const P = mine || mmrNew(id); P.id = id; const d = mmrApply(P, res, MMR_BOT[body.lvl], K_BOT, name, now);
    await mmrPut([[key, P]]);
    return [200, mmrOut(P, d)];
  }
  const g = body.g, side = body.side, okey = mmrNorm(body.opp);
  if (typeof g !== 'string' || !/^[a-z0-9]{4,12}$/.test(g) || (side !== 0 && side !== 1) || !String(body.opp || '').trim() || okey === key) return [400, { error: 'bad duel' }];
  let [done] = await kvGet([MK.done(g)]);
  if (done) return mmrAnswer(done, id);
  await kvSet(MK.g(g, side), { id, k: key, n: name, res, o: okey, at: now }, 15 * 60000, true);
  let locked = false;
  for (let i = 0; i < 12 && !locked; i++) { locked = await kvSet(MK.lock(g), 1, 4000, true); if (!locked) await sleep(150); }
  if (!locked) return [200, { ok: true, pending: 1 }];
  try {
    const [d2, r0, r1] = await kvGet([MK.done(g), MK.g(g, 0), MK.g(g, 1)]);
    if (d2) return mmrAnswer(d2, id);
    if (!r0 || !r1) return [200, { ok: true, pending: 1 }];
    const agree = r0.id !== r1.id && r0.k !== r1.k && r0.o === r1.k && r1.o === r0.k && (r0.res === 'd' ? r1.res === 'd' : r0.res !== r1.res && r1.res !== 'd');
    if (!agree) done = { err: 'mismatch' };
    else {
      const [p0, p1] = await kvGet([MK.p(r0.k), MK.p(r1.k)]);
      const P0 = p0 || mmrNew(r0.id), P1 = p1 || mmrNew(r1.id), a = P0.r, b = P1.r; P0.id = r0.id; P1.id = r1.id;
      const d0 = mmrApply(P0, r0.res, b, K_NET, r0.n, now), d1 = mmrApply(P1, r1.res, a, K_NET, r1.n, now);
      await mmrPut([[r0.k, P0], [r1.k, P1]]);
      done = { s: [{ id: r0.id, o: mmrOut(P0, d0) }, { id: r1.id, o: mmrOut(P1, d1) }] };
    }
    await kvSet(MK.done(g), done, 24 * 3600000);
    return mmrAnswer(done, id);
  } finally { await kvDel(MK.lock(g)).catch(() => {}); }
}

// the HTTP side: returns true if it handled the request
export function scoresRoute(req, res) {
  const [url, qs] = (req.url || '/').split('?');
  if (url !== '/api/scores') return false;
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-board-id', 'cache-control': 'no-store' };
  const reply = (code, obj) => { res.writeHead(code, headers); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return true; }
  const me = String(req.headers['x-board-id'] || ''), meOk = /^[a-z0-9]{12,40}$/.test(me) ? me : '';
  const mq = new URLSearchParams(qs || '').get('mmr');
  if (req.method === 'GET' && mq != null) { getMmr(mq.slice(0, 40)).then(b => reply(200, b), err => { console.error('scores:', err.message); reply(503, { error: 'scores unavailable' }); }); return true; }
  if (req.method === 'GET') { getBoard(meOk).then(b => reply(200, b), err => { console.error('scores:', err.message); reply(503, { error: 'scores unavailable' }); }); return true; }
  if (req.method === 'POST') {
    let body = '', big = false;
    req.on('data', c => { body += c; if (body.length > 2000) { big = true; req.destroy(); } });
    req.on('end', () => {
      if (big) return;
      let data = null; try { data = JSON.parse(body); } catch (e) { reply(400, { error: 'bad json' }); return; }
      const addr = clientAddr(req);
      postScore(data, addr).then(([code, obj]) => reply(code, obj), err => { console.error('scores:', err.message); reply(503, { error: 'scores unavailable' }); });
    });
    return true;
  }
  reply(405, { error: 'method' });
  return true;
}
export const SCORE_STORE = STORE;
