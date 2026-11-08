// The Drowned Reach: a war for the islands, played on a map.
//
// A third game, reached from its own card on the title screen and kept apart from the voyages and from
// Wreckers' Night. It plays like the territory games (Risk, and the real-time ones in a browser): you
// pick a landing on an archipelago, your people grow with the land you hold, and you send a share of
// them to take the neutral shore, then your neighbours' land, tile by tile along the border. Boats carry
// landings to other islands. Gold builds harbours, watchtowers and beacons, and buys flare volleys and
// fire-ships. Nations make and break pacts. Holding a whole island pays a bonus, as whole continents do.
//
// It keeps the Reach's own rules too: the Skerry Light stands on its rock in the middle, and its beam
// sweeps the map; at night the drowned rise on any shore the light doesn't reach and take the land back
// into the dark, until dawn; beacons, flares and the beam hold them off. The tide turns every few
// minutes: at low water the shoals dry out into land bridges between islands, and at high water they
// drown again, and whoever had marched across them is cut off. The bell rallies your people for a while.
//
// Many enemies: sixteen bot nations by default, up to forty, each with a temper of its own.
//
// This file is the game itself (the map, the nations, the fighting, the bots). warview.js draws it and
// takes your orders.

const WARC = {
  W: 200, H: 124,                 // the map, in tiles (set per game in warStart: more nations, a bigger Reach)
  SPAWN: 20,                      // seconds to choose a landing
  DAY: 240, NIGHT_FROM: 0.62, NIGHT_TO: 0.96,   // a day, and the part of it that's night
  TIDE: 180,                      // the tide turns twice in this
  BEAM_TURN: 43, BEAM_HALF: 0.22, // the Light's sweep, lit only at night: one turn in this many seconds, this half-width (radians)
  COSTS: { harbour: [60, 30], tower: [50, 25], beacon: [80, 35], flare: 45, fireship: 320 },
  TOWER_R: 6, BEACON_R: 8, FLARE_R: 9, FLARE_T: 45, FIRE_R: 6, HARBOUR_R: 3,
  BELL_CD: 90, BELL_T: 18, BOAT_SPEED: 4, LANDING_MIN: 25, TRUCE: 75,   // no war between nations in the first minute and a quarter
  DR: -2,                         // the owner value of land the drowned hold
};

const WAR = {
  on: false, phase: 'off', t: 0, speed: 1, paused: false,
  seed: 0, rng: Math.random, nBots: 16,
  map: null, owner: null, region: null, regions: [], landTiles: 0,
  nations: [], attacks: [], boats: [], flares: [], structs: new Map(), lit: null,
  beam: 0, tideHigh: false, tideT: 0, day: 0, me: -1, log: [], prompts: [], events: [],
  spawnT: 0, spawnPick: -1, ratio: 0.4, result: null, stats: null, build: null, spectate: false,
};

// ---------- helpers ----------
const warIdx = (x, y) => y * WARC.W + x;
const warX = i => i % WARC.W, warY = i => (i / WARC.W) | 0;
const WAR_N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function warNeighbours(i, fn) {
  const x = warX(i), y = warY(i);
  if (x > 0) fn(i - 1); if (x < WARC.W - 1) fn(i + 1);
  if (y > 0) fn(i - WARC.W); if (y < WARC.H - 1) fn(i + WARC.W);
}
// terrain: 0 deep sea, 1 shoal (dry at low water), 2 land, 3 hill, 4 the Light's rock
const warIsLand = i => WAR.map[i] >= 2 || (WAR.map[i] === 1 && !WAR.tideHigh);
const warIsSea = i => !warIsLand(i);
function warCoastal(i) { let c = false; warNeighbours(i, j => { if (warIsSea(j)) c = true; }); return c; }
// the shore for a harbour: facing the sea or a shoal, whatever the tide (at low water the dry shoals would otherwise hide it)
function warShore(i) { let c = false; warNeighbours(i, j => { if (WAR.map[j] <= 1) c = true; }); return c; }
function warLoadStats() { try { return JSON.parse(localStorage.getItem('skerry-war') || '{}'); } catch (e) { return {}; } }
function warSaveStats(s) { try { localStorage.setItem('skerry-war', JSON.stringify(s)); } catch (e) {} }

// value noise, for the islands
function warNoise(rng) {
  const G = 64, grid = new Float32Array(G * G); for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const at = (x, y) => grid[((y % G + G) % G) * G + ((x % G + G) % G)];
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// ---------- names ----------
const WAR_ISLES = ['Gannet Holm', 'Black Ness', 'Marrow Isle', 'Wrack Skerry', 'the Hollin Shoals', 'Caul Head', 'Saltmark', 'Kester’s Rest',
  'the Brine Teeth', 'Long Shingle', 'Orrin’s Isle', 'the Stacks', 'Mourne Holm', 'Greyback', 'Cormorant Rock', 'the Drowned Fields', 'Tallow Isle', 'Fennick Ness',
  'the Scaur', 'Wether Holm', 'Pellock Isle', 'Sorrow Skerry', 'the Rakes', 'Lantern Isle', 'Haddock Holm', 'the Weeping Ness', 'Scald Rock', 'Varrow Isle'];
const WAR_HOUSES = ['Marrow', 'Caul', 'Hollin', 'Kester', 'Orrin', 'Fennick', 'Pellock', 'Varrow', 'Tallow', 'Sorrow', 'Wether', 'Greaves', 'Dunmore', 'Scaur',
  'Rathe', 'Brannock', 'Gelling', 'Mallet', 'Quill', 'Harrow', 'Lusk', 'Sallow', 'Tarn', 'Vessey', 'Wrenne', 'Askew', 'Bream', 'Corran', 'Dree', 'Elver', 'Furlong', 'Gorse',
  'Hask', 'Inchcape', 'Jory', 'Kelp', 'Lyme', 'Mire', 'Nettle', 'Oakum', 'Pike', 'Rime', 'Sedge', 'Thrum', 'Umber', 'Vane', 'Wick', 'Yarrow'];
const WAR_FORMS = ['House %', 'the % Company', 'the % Covenant', 'the %s', 'the Folk of %', '% Reeves', 'the % Watch', 'the % Fleet', 'the % Wreckers', 'the Keepers of %', 'the % Tide', '% Salt'];

// ---------- the map ----------
function warMakeMap(seed) {
  const rng = seeded(seed), W = WARC.W, H = WARC.H, map = new Uint8Array(W * H);
  const n1 = warNoise(rng), n2 = warNoise(rng), n3 = warNoise(rng);
  // a few big island seeds and many small ones
  const blobs = [];
  const area = (W * H) / (200 * 124);
  for (let i = 0; i < Math.round(7 * area); i++) blobs.push({ x: 20 + rng() * (W - 40), y: 14 + rng() * (H - 28), r: 16 + rng() * 16 });
  for (let i = 0; i < Math.round(22 * area); i++) blobs.push({ x: 8 + rng() * (W - 16), y: 6 + rng() * (H - 12), r: 4 + rng() * 8 });
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (const b of blobs) { const d = Math.hypot(x - b.x, y - b.y) / b.r; v = Math.max(v, 1 - d * d); }
    v = v * 0.75 + (n1(x / 9, y / 9) * 0.6 + n2(x / 4, y / 4) * 0.3 + n3(x / 2, y / 2) * 0.1) * 0.55 - 0.18;
    const edge = Math.min(x, W - 1 - x, y, H - 1 - y); if (edge < 6) v -= (6 - edge) * 0.08;
    // the Light's rock in the middle, with open water round it
    const dc = Math.hypot(x - cx, y - cy);
    if (dc < 3.2) v = 0.9; else if (dc < 11) v = Math.min(v, 0.3 + (dc - 3.2) / 7.8 * 0.1);
    map[warIdx(x, y)] = v < 0.36 ? 0 : v < 0.43 ? 1 : v < 0.72 ? 2 : 3;
  }
  // the Light's rock itself; two tidal spurs reach it at low water from the nearest land
  map[warIdx(W / 2 | 0, H / 2 | 0)] = 4;
  for (const a of [rng() * 6.283, rng() * 6.283]) {
    for (let d = 3; d < 13; d++) { const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d); if (map[warIdx(x, y)] === 0 && d > 3) map[warIdx(x, y)] = 1; }
  }
  // no lone single tiles of land in the sea
  for (let i = 0; i < map.length; i++) if (map[i] >= 2 && map[i] !== 4) { let n = 0; warNeighbours(i, j => { if (map[j] >= 1) n++; }); if (n === 0) map[i] = 1; }
  return { map, rng };
}

// islands: connected land at low water, named and numbered; the big ones are the regions worth a bonus
function warRegions() {
  const W = WARC.W, H = WARC.H, reg = new Int16Array(W * H).fill(-1), regions = [];
  const land = i => WAR.map[i] >= 2;
  for (let s = 0; s < W * H; s++) {
    if (!land(s) || reg[s] >= 0) continue;
    const id = regions.length, stack = [s], tiles = []; reg[s] = id;
    while (stack.length) { const i = stack.pop(); tiles.push(i); warNeighbours(i, j => { if (land(j) && reg[j] < 0) { reg[j] = id; stack.push(j); } }); }
    let sx = 0, sy = 0; for (const i of tiles) { sx += warX(i); sy += warY(i); }
    regions.push({ id, tiles: tiles.length, x: sx / tiles.length, y: sy / tiles.length, name: '', bonus: tiles.length >= 40, light: tiles.some(i => WAR.map[i] === 4) });
  }
  const big = regions.filter(r => r.tiles >= 12).sort((a, b) => b.tiles - a.tiles);
  const names = WAR_ISLES.slice(); const rng = WAR.rng;
  for (const r of big) { if (r.light) { r.name = 'the Light'; continue; } const k = (rng() * names.length) | 0; r.name = names.splice(k, 1)[0] || ('Isle ' + r.id); }
  for (const r of regions) if (!r.name) r.name = 'a skerry';
  WAR.region = reg; WAR.regions = regions;
}

// ---------- nations ----------
function warColour(k, n) {
  const h = (k * 137.508) % 360, s = 55 + (k % 3) * 12, l = 48 + ((k * 7) % 3) * 8;
  return `hsl(${h.toFixed(0)},${s}%,${l}%)`;
}
function warNation(id, name, isMe, rng) {
  return {
    id, name, isMe, alive: true, col: warColour(id, 1), troops: 40, gold: 25, tiles: 0, maxTroops: 100,
    bot: isMe ? null : { aggr: 0.25 + rng() * 0.7, naval: rng(), loyal: rng(), greed: rng(), next: rng() * 2 },
    rel: null, allies: new Map(), bell: 0, bellCd: 0, flareCd: 0, fireCd: 0, light: false, regionsHeld: 0,
    harbours: 0, towers: 0, beacons: 0, kills: 0, taken: 0, lost: 0, lastHit: -1, lastHitT: -99, drownedT: -99, betrayed: 0, cx: 0, cy: 0,
  };
}

// a landing: a round patch of land round a tile
function warClaimBlob(i, owner, r) {
  const x0 = warX(i), y0 = warY(i); let n = 0;
  for (let y = Math.max(0, y0 - r); y <= Math.min(WARC.H - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(WARC.W - 1, x0 + r); x++) {
    const j = warIdx(x, y); if (Math.hypot(x - x0, y - y0) > r + 0.5 || WAR.map[j] < 2 || WAR.map[j] === 4) continue;
    if (WAR.owner[j] !== owner) { if (WAR.owner[j] >= 0) WAR.nations[WAR.owner[j]].tiles--; WAR.owner[j] = owner; WAR.nations[owner].tiles++; n++; }
  }
  return n;
}
function warGoodSpawn(i, taken) {
  if (WAR.map[i] < 2 || WAR.map[i] === 4 || WAR.owner[i] !== -1) return false;
  const r = WAR.regions[WAR.region[i]]; if (!r || r.light || r.tiles < 14) return false;
  const x = warX(i), y = warY(i);
  for (const t of taken) if (Math.hypot(warX(t) - x, warY(t) - y) < 13) return false;
  return true;
}

// ---------- starting a game ----------
function warMapSize(nBots) {
  // 200 x 124 tiles for 16 nations; the area grows (or shrinks) with the number of nations
  const k = Math.sqrt(clamp((nBots + 1) / 17, 0.6, 2.5));
  return [Math.round(200 * k), Math.round(124 * k)];
}
function warStart(nBots, seed) {
  [WARC.W, WARC.H] = warMapSize(nBots);
  WAR.frontSeen = null; WAR.pathPrev = null; WAR.frontScore = null; if (typeof WV !== 'undefined') WV.seen = null;
  WAR.on = true; WAR.phase = 'spawn'; WAR.t = 0; WAR.speed = 1; WAR.paused = false; WAR.spectate = false; WAR.result = null;
  WAR.nBots = nBots; WAR.seed = seed >>> 0;
  const { map, rng } = warMakeMap(WAR.seed); WAR.map = map; WAR.rng = rng;
  WAR.owner = new Int16Array(map.length).fill(-1); WAR.tideHigh = false; WAR.tideT = 0; WAR.beam = 0; WAR.day = 0;
  warRegions();
  WAR.landTiles = 0; for (let i = 0; i < map.length; i++) if (map[i] >= 2) WAR.landTiles++;
  WAR.attacks = []; WAR.boats = []; WAR.flares = []; WAR.structs = new Map(); WAR.log = []; WAR.prompts = []; WAR.events = [];
  WAR.lit = new Uint8Array(map.length); WAR.build = null; WAR.ratio = 0.4;
  // nations: you, and the bots, each with a name of its own
  const houses = WAR_HOUSES.slice(), names = new Set();
  const pickName = () => { for (let k = 0; k < 20; k++) { const h = houses.splice((rng() * houses.length) | 0, 1)[0] || ('Clan ' + k); const f = WAR_FORMS[(rng() * WAR_FORMS.length) | 0]; const n = f.replace('%', h); if (!names.has(n)) { names.add(n); return n; } } return 'the Nameless'; };
  WAR.nations = [];
  const myName = (($('warNick') && $('warNick').value) || '').trim().slice(0, 18) || 'the Keeper’s Own';
  WAR.me = 0; WAR.nations.push(warNation(0, myName, true, rng));
  for (let k = 1; k <= nBots; k++) WAR.nations.push(warNation(k, pickName(), false, rng));
  const N = WAR.nations.length;
  for (const n of WAR.nations) { n.rel = new Float32Array(N); for (let k = 0; k < N; k++) n.rel[k] = k === n.id ? 1 : (rng() - 0.5) * 0.4; }
  // the bots land now, spaced out; you choose yours (or get one when the time runs out)
  const taken = [];
  for (let k = 1; k < N; k++) {
    let best = -1;
    for (let tries = 0; tries < 400 && best < 0; tries++) { const i = (rng() * map.length) | 0; if (warGoodSpawn(i, taken)) best = i; }
    if (best < 0) for (let tries = 0; tries < 2000 && best < 0; tries++) { const i = (rng() * map.length) | 0; if (map[i] >= 2 && map[i] !== 4 && WAR.owner[i] === -1 && !WAR.regions[WAR.region[i]].light) best = i; }
    if (best >= 0) { taken.push(best); warClaimBlob(best, k, 2); WAR.nations[k].spawn = best; }
  }
  WAR.spawnTaken = taken; WAR.spawnT = WARC.SPAWN; WAR.spawnPick = -1;
  WAR.stats = { start: performance.now(), taken: 0, kills: 0, boats: 0, days: 0 };
  warLog(`The Reach lies before you: ${WAR.regions.filter(r => r.bonus).length} great isles, ${nBots} nations, and the Light in the middle. Choose a landing.`);
}

function warSpawnMe(i) {
  if (WAR.phase !== 'spawn' || i == null || !warGoodSpawn(i, WAR.spawnTaken)) return false;
  WAR.spawnPick = i; return true;
}
function warBeginPlay() {
  let i = WAR.spawnPick;
  if (i < 0) { for (let tries = 0; tries < 4000 && i < 0; tries++) { const j = (WAR.rng() * WAR.map.length) | 0; if (warGoodSpawn(j, WAR.spawnTaken)) i = j; } }
  if (i < 0) i = WAR.map.findIndex((v, j) => v >= 2 && v !== 4 && WAR.owner[j] === -1);
  warClaimBlob(i, WAR.me, 2); WAR.nations[WAR.me].spawn = i;
  WAR.phase = 'play'; WAR.t = 0;
  const r = WAR.regions[WAR.region[i]];
  warLog(`You land on ${r.name}. Your people are few; take the empty shore first.`);
}

function warStop() {
  if (!WAR.on) return;
  WAR.on = false; WAR.phase = 'off';
  if (typeof warViewStop === 'function') warViewStop();
  state = 'title'; toTitle();
}

// ---------- the log ----------
function warLog(text, kind) { WAR.log.push({ text, t: WAR.t, kind: kind || '' }); if (WAR.log.length > 60) WAR.log.shift(); WAR.logDirty = true; }

// ---------- structures ----------
function warStructCost(n, type) { const c = WARC.COSTS[type]; return Array.isArray(c) ? c[0] + c[1] * (type === 'harbour' ? n.harbours : type === 'tower' ? n.towers : n.beacons) : c; }
function warCanBuild(n, type, i) {
  if (WAR.owner[i] !== n.id || WAR.map[i] < 2 || WAR.map[i] === 4) return 'Not your land.';
  if (WAR.structs.has(i)) return 'Something stands here already.';
  if (type === 'harbour' && !warShore(i)) return 'A harbour needs the shore.';
  if (n.gold < warStructCost(n, type)) return 'Not enough gold.';
  return '';
}
function warBuild(n, type, i) {
  const why = warCanBuild(n, type, i); if (why) return why;
  n.gold -= warStructCost(n, type);
  WAR.structs.set(i, { type, owner: n.id, hp: 1, t: WAR.t });
  if (type === 'harbour') n.harbours++; else if (type === 'tower') n.towers++; else n.beacons++;
  if (n.isMe) warLog(`You raise a ${type} on ${WAR.regions[WAR.region[i]].name}.`);
  return '';
}
function warLoseStruct(i) {
  const s = WAR.structs.get(i); if (!s) return;
  const n = WAR.nations[s.owner]; if (n) { if (s.type === 'harbour') n.harbours--; else if (s.type === 'tower') n.towers--; else n.beacons--; }
  WAR.structs.delete(i);
}

// ---------- light ----------
function warLightOwner() { const i = warIdx(WARC.W / 2 | 0, WARC.H / 2 | 0); return WAR.owner[i]; }
function warIsNight() { const f = (WAR.t % WARC.DAY) / WARC.DAY; return f > WARC.NIGHT_FROM && f < WARC.NIGHT_TO; }
function warDark() {   // 0 by day, 1 in the deep of night
  const f = (WAR.t % WARC.DAY) / WARC.DAY, a = WARC.NIGHT_FROM, b = WARC.NIGHT_TO;
  if (f < a - 0.06 || f > b + 0.03) return 0;
  if (f < a) return (f - (a - 0.06)) / 0.06;
  if (f > b) return 1 - (f - b) / 0.03;
  return 1;
}
function warRelight() {
  const lit = WAR.lit; lit.fill(0);
  const cx = WARC.W / 2, cy = WARC.H / 2, W = WARC.W, H = WARC.H;
  // the beam: a wedge from the Light, lit only at night
  if (warDark() > 0.05) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let d = Math.atan2(y - cy, x - cx) - WAR.beam; d = Math.atan2(Math.sin(d), Math.cos(d));
    const dist = Math.hypot(x - cx, y - cy);
    if (Math.abs(d) < WARC.BEAM_HALF + 1.2 / Math.max(2, dist)) lit[warIdx(x, y)] = 2;
  }
  const disc = (x0, y0, r, v) => { for (let y = Math.max(0, y0 - r); y <= Math.min(H - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(W - 1, x0 + r); x++) if ((x - x0) * (x - x0) + (y - y0) * (y - y0) <= r * r) { const i = warIdx(x, y); if (lit[i] < v) lit[i] = v; } };
  for (const [i, s] of WAR.structs) { if (s.type === 'beacon') disc(warX(i), warY(i), WARC.BEACON_R, 3); else if (s.type === 'harbour') disc(warX(i), warY(i), WARC.HARBOUR_R, 1); }
  for (const f of WAR.flares) disc(Math.round(f.x), Math.round(f.y), WARC.FLARE_R, 3);
  disc(cx | 0, cy | 0, 4, 3);
}

// ---------- attacks ----------
// one attack per attacker and target; more troops sent the same way join it
// `aim`: the tile the order was given at; the advance heads that way (bots give none: they grow out from their middle)
function warAttack(from, target, troops, landing, aim) {
  const a = WAR.nations[from]; if (!a || !a.alive) return null;
  troops = Math.min(troops, a.troops); if (troops < 1) return null;
  if (target >= 0) {
    const d = WAR.nations[target]; if (!d || !d.alive) return null;
    if (WAR.t < WARC.TRUCE) { if (a.isMe && typeof wvSay === 'function') wvSay(`The landing truce holds for ${Math.ceil(WARC.TRUCE - WAR.t)} s more.`); return null; }
    if (a.allies.has(target)) { warBreakPact(from, target, true); }
  }
  a.troops -= troops;
  let at = WAR.attacks.find(k => k.from === from && k.target === target);
  if (at) { at.troops += troops; if (aim != null && aim >= 0) at.aim = aim; return at; }
  at = { from, target, troops, sent: troops, t: 0, prog: 0, landing: landing || null, taken: 0, aim: aim != null && aim >= 0 ? aim : landing != null ? landing : null };
  WAR.attacks.push(at);
  if (target >= 0) {
    const d = WAR.nations[target];
    d.lastHit = from; d.lastHitT = WAR.t; d.rel[from] = Math.max(-1, d.rel[from] - 0.45);
    for (const n of WAR.nations) if (n.allies.has(target) && n.id !== from) n.rel[from] = Math.max(-1, n.rel[from] - 0.25);
    if (a.isMe) warLog(`You march on ${d.name} with ${Math.round(troops)}.`); else if (d.isMe) warLog(`${a.name} attacks you with ${Math.round(troops)}.`, 'bad');
  } else if (target === WARC.DR && a.isMe) warLog(`You go to take the drowned shore back (${Math.round(troops)}).`);
  return at;
}
// the tiles this attack can take next: the target's tiles next to the attacker's
function warFrontier(at) {
  const out = [], seen = WAR.frontSeen || (WAR.frontSeen = new Uint8Array(WAR.map.length)); seen.fill(0);
  const own = at.from, tgt = at.target;
  // walk the attacker's tiles along the border only: scan all tiles (25k, cheap enough at a few attacks)
  for (let i = 0; i < WAR.map.length; i++) {
    if (WAR.owner[i] !== own) continue;
    warNeighbours(i, j => { if (!seen[j] && warIsLand(j) && WAR.map[j] !== 4 && WAR.owner[j] === tgt) { seen[j] = 1; out.push(j); } });
  }
  return out;
}
function warTileCost(at, j) {
  const def = at.target >= 0 ? WAR.nations[at.target] : null;
  let cost = at.target === WARC.DR ? 4.5 : at.target === -1 ? 0.8 : 3;
  if (WAR.map[j] === 3) cost += 1.4;
  if (def) {
    cost += Math.min(16, (def.troops / Math.max(1, def.tiles)) * 1.0);
    if (def.bell > 0) cost *= 1.6;
    const x = warX(j), y = warY(j);
    for (const [i, s] of WAR.structs) if (s.type === 'tower' && s.owner === def.id && Math.hypot(warX(i) - x, warY(i) - y) <= WARC.TOWER_R) { cost *= 1.7; break; }
    if (def.light) cost *= 1.1;
  }
  return cost;
}
function warTakeTile(j, to, from) {
  if (from >= 0) { const d = WAR.nations[from]; d.tiles--; d.lost++; }
  if (to >= 0) { const a = WAR.nations[to]; a.tiles++; a.taken++; if (a.isMe) WAR.stats.taken++; }
  WAR.owner[j] = to;
  const s = WAR.structs.get(j); if (s && s.owner !== to) { warLoseStruct(j); if (to >= 0 && from >= 0 && WAR.nations[from].isMe) warLog(`Your ${s.type} on ${WAR.regions[WAR.region[j]].name} is taken.`, 'bad'); }
}
function warAttacksTick(dt) {
  for (let k = WAR.attacks.length - 1; k >= 0; k--) {
    const at = WAR.attacks[k], a = WAR.nations[at.from];
    if (!a.alive) { WAR.attacks.splice(k, 1); continue; }
    const def = at.target >= 0 ? WAR.nations[at.target] : null;
    if (def && !def.alive) { a.troops += at.troops; WAR.attacks.splice(k, 1); continue; }
    at.t += dt;
    // how many tiles this tick: bigger forces spread faster, up to the border's width
    // (over the empty wilds the advance runs: nobody is there to stop it)
    at.prog += dt * (1.1 + Math.sqrt(at.troops) * 0.2) * (at.target === -1 ? 7 : 1);
    let n = Math.floor(at.prog); if (n <= 0) continue; at.prog -= n;
    const front = warFrontier(at);
    if (!front.length) { a.troops += at.troops * 0.9; WAR.attacks.splice(k, 1); if (a.isMe && at.taken > 0 && at.target >= 0) warLog(`No more of ${def.name}’s land within reach; your people fall back.`); continue; }
    // which border tiles go first: those nearest where the order was aimed (or, for a bot, nearest its middle, so it
    // grows round), and above all those already hemmed in by the attacker's land, so the border fills in
    // round instead of reaching out in thin lines
    const ax = at.aim != null ? warX(at.aim) : a.cx, ay = at.aim != null ? warY(at.aim) : a.cy;
    const sc = WAR.frontScore || (WAR.frontScore = new Float32Array(WAR.map.length));
    for (const j of front) {
      let own = 0; warNeighbours(j, q => { if (WAR.owner[q] === at.from) own++; });
      const x = warX(j), y = warY(j);
      let diag = 0; for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const qx = x + dx, qy = y + dy; if (qx >= 0 && qy >= 0 && qx < WARC.W && qy < WARC.H && WAR.owner[warIdx(qx, qy)] === at.from) diag++; }
      sc[j] = Math.hypot(x - ax, y - ay) - own * 4 - diag * 1.2 + WAR.rng() * 1.5;
    }
    front.sort((p, q) => sc[p] - sc[q]);
    n = Math.min(n, front.length);
    for (let q = 0; q < n; q++) {
      const j = front[q], cost = warTileCost(at, j);
      if (at.troops < cost) { WAR.attacks.splice(k, 1); if (a.isMe) warLog(def ? `Your attack on ${def.name} is spent.` : 'Your advance runs out of people.'); break; }
      at.troops -= cost; at.taken++;
      if (def) def.troops = Math.max(0, def.troops - cost * 0.45);
      warTakeTile(j, at.from, at.target);
      if (def && def.tiles <= 0) warEliminate(def, a);
    }
    // the force at the front is also the force the enemy sees: the defender may counter (bots do, below)
  }
}
function warEliminate(d, by) {
  if (!d.alive) return;
  d.alive = false; d.troops = 0;
  for (let k = WAR.attacks.length - 1; k >= 0; k--) if (WAR.attacks[k].from === d.id) WAR.attacks.splice(k, 1);
  for (let k = WAR.boats.length - 1; k >= 0; k--) if (WAR.boats[k].from === d.id) WAR.boats.splice(k, 1);
  for (const [i, s] of [...WAR.structs]) if (s.owner === d.id) warLoseStruct(i);
  for (const n of WAR.nations) n.allies.delete(d.id);
  if (by) { by.kills++; if (by.isMe) WAR.stats.kills++; }
  warLog(`${d.name} ${d.isMe ? 'are' : 'is'} no more${by ? ', finished by ' + by.name : ''}.`, d.isMe ? 'bad' : 'good');
  if (d.isMe) warFinish('lost', by);
}

// ---------- boats ----------
// find the sea path from a nation's shore to the sea beside a target tile
function warSeaPath(from, target) {
  const W = WARC.W, H = WARC.H, prev = WAR.pathPrev || (WAR.pathPrev = new Int32Array(W * H)); prev.fill(-2);
  // goals: sea tiles beside the target
  const goals = new Set(); warNeighbours(target, j => { if (warIsSea(j)) goals.add(j); });
  if (!goals.size) return null;
  // sources: sea tiles beside the nation's land (its harbours first: start the search there)
  const q = []; let qh = 0;
  const addSrc = i => { if (prev[i] === -2 && warIsSea(i)) { prev[i] = -1; q.push(i); } };
  for (let i = 0; i < W * H; i++) if (WAR.owner[i] === from && warIsLand(i)) warNeighbours(i, addSrc);
  if (!q.length) return null;
  let found = -1;
  while (qh < q.length) {
    const i = q[qh++]; if (goals.has(i)) { found = i; break; }
    const x = warX(i), y = warY(i);
    for (const [dx, dy] of WAR_N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = warIdx(nx, ny); if (prev[j] !== -2 || !warIsSea(j)) continue; prev[j] = i; q.push(j); }
  }
  if (found < 0) return null;
  const path = []; for (let i = found; i >= 0; i = prev[i]) path.push(i); path.reverse();
  return path;
}
function warSendBoat(from, target, troops, kind) {
  const a = WAR.nations[from]; if (!a.alive) return 'Gone.';
  if (!warIsLand(target) || WAR.map[target] === 4) return 'Land only.';
  if (WAR.owner[target] >= 0 && WAR.t < WARC.TRUCE) return `The landing truce holds for ${Math.ceil(WARC.TRUCE - WAR.t)} s more.`;
  if (WAR.owner[target] === from) return 'That is your own shore.';
  if (WAR.owner[target] >= 0 && a.allies.has(WAR.owner[target])) return 'They are your allies.';
  if (!warCoastal(target)) return 'A boat needs a shore to land on.';
  const path = warSeaPath(from, target); if (!path) return 'No sea road reaches there.';
  if (kind === 'fire') { if (a.harbours < 1) return 'A fire-ship needs a harbour.'; if (a.gold < WARC.COSTS.fireship) return 'Not enough gold.'; a.gold -= WARC.COSTS.fireship; a.fireCd = 90; troops = 0; }
  else { troops = Math.min(troops, a.troops); if (troops < WARC.LANDING_MIN) return `A landing needs at least ${WARC.LANDING_MIN}.`; a.troops -= troops; }
  const s = path[0];
  WAR.boats.push({ from, target, troops, kind: kind || 'troops', path, i: 0, x: warX(s), y: warY(s), hp: 1, t: 0 });
  if (a.isMe) { WAR.stats.boats++; warLog(kind === 'fire' ? 'A fire-ship puts out, low in the water.' : `A boat puts out with ${Math.round(troops)} aboard.`); }
  return '';
}
function warBoatsTick(dt) {
  for (let k = WAR.boats.length - 1; k >= 0; k--) {
    const b = WAR.boats[k], a = WAR.nations[b.from];
    if (!a.alive) { WAR.boats.splice(k, 1); continue; }
    b.t += dt;
    let step = WARC.BOAT_SPEED * dt;
    while (step > 0 && b.i < b.path.length - 1) {
      const nx = warX(b.path[b.i + 1]), ny = warY(b.path[b.i + 1]), d = Math.hypot(nx - b.x, ny - b.y);
      if (d <= step) { b.x = nx; b.y = ny; b.i++; step -= d; } else { b.x += (nx - b.x) / d * step; b.y += (ny - b.y) / d * step; step = 0; }
    }
    // the tide may have drowned or dried the road; and enemy watchtowers fire on passing boats
    if (b.i < b.path.length - 1 && !warIsSea(b.path[b.i + 1])) { if (b.kind === 'troops') a.troops += b.troops * 0.8; WAR.boats.splice(k, 1); if (a.isMe) warLog('The tide has shut the channel; the boat turns back.', 'bad'); continue; }
    for (const [i, s] of WAR.structs) {
      if (s.type !== 'tower' || s.owner === b.from || WAR.nations[s.owner].allies.has(b.from)) continue;
      if (Math.hypot(warX(i) - b.x, warY(i) - b.y) <= WARC.TOWER_R) { b.hp -= dt * (b.kind === 'fire' ? 0.3 : 0.12); b.troops *= 1 - dt * 0.1; b.hit = 0.3; }
    }
    if (b.hp <= 0) { WAR.boats.splice(k, 1); if (a.isMe) warLog('Your boat is shot to pieces under a watchtower.', 'bad'); else if (WAR.owner[b.target] === WAR.me) warLog(`Your towers sink a boat of ${a.name}.`, 'good'); continue; }
    if (b.i >= b.path.length - 1) {
      WAR.boats.splice(k, 1);
      const tgt = b.target, own = WAR.owner[tgt];
      if (b.kind === 'fire') { warFireship(b, a); continue; }
      if (own === b.from) { a.troops += b.troops; continue; }
      if (own >= 0 && a.allies.has(own)) { a.troops += b.troops; continue; }
      if (!warIsLand(tgt)) { a.troops += b.troops * 0.8; continue; }
      // the landing: the shore tile is taken outright, and the fight spreads from it
      const cost = own >= 0 ? warTileCost({ target: own, from: b.from }, tgt) : 2;
      if (b.troops < cost + 2) { if (a.isMe) warLog('The landing is thrown back into the sea.', 'bad'); continue; }
      warTakeTile(tgt, b.from, own); b.troops -= cost;
      if (own >= 0) { const d = WAR.nations[own]; d.troops = Math.max(0, d.troops - cost * 0.45); if (d.tiles <= 0) warEliminate(d, a); if (d.isMe) warLog(`${a.name} lands on your shore at ${WAR.regions[WAR.region[tgt]].name}!`, 'bad'); }
      const at = warAttack(b.from, own, 0, tgt, tgt); a.troops -= 0;
      if (at) { at.troops += b.troops; at.sent += b.troops; } else a.troops += b.troops;
      if (a.isMe) warLog(`Your people land on ${WAR.regions[WAR.region[tgt]].name}.`);
    }
  }
}
function warFireship(b, a) {
  const x0 = warX(b.target), y0 = warY(b.target), hit = new Map();
  for (let y = Math.max(0, y0 - WARC.FIRE_R); y <= Math.min(WARC.H - 1, y0 + WARC.FIRE_R); y++) for (let x = Math.max(0, x0 - WARC.FIRE_R); x <= Math.min(WARC.W - 1, x0 + WARC.FIRE_R); x++) {
    if (Math.hypot(x - x0, y - y0) > WARC.FIRE_R) continue;
    const j = warIdx(x, y); if (!warIsLand(j) || WAR.map[j] === 4) continue;
    const o = WAR.owner[j];
    if (o >= 0) { hit.set(o, (hit.get(o) || 0) + 1); warTakeTile(j, -1, o); } else if (o === WARC.DR) WAR.owner[j] = -1;
    if (WAR.structs.has(j)) warLoseStruct(j);
  }
  for (const [o, n] of hit) { const d = WAR.nations[o]; d.troops *= Math.max(0.2, 1 - n / Math.max(1, d.tiles + n) * 1.5); d.rel[a.id] = -1; if (d.tiles <= 0) warEliminate(d, a); if (d.isMe) warLog(`${a.name}’s fire-ship burns ${n} of your tiles at ${WAR.regions[WAR.region[b.target]].name}!`, 'bad'); }
  WAR.flares.push({ x: x0, y: y0, t: WARC.FLARE_T * 0.6, fire: true, r: WARC.FIRE_R });
  WAR.events.push({ kind: 'boom', x: x0, y: y0, t: 1.2 });
  if (a.isMe) warLog(`Your fire-ship goes up at ${WAR.regions[WAR.region[b.target]].name}: ${[...hit.values()].reduce((s, v) => s + v, 0)} tiles burnt.`, 'good');
}

// ---------- flares and the bell ----------
function warFlare(n, i) {
  if (n.flareCd > 0) return 'The flare gun is still hot.';
  if (n.gold < WARC.COSTS.flare) return 'Not enough gold.';
  n.gold -= WARC.COSTS.flare; n.flareCd = 20;
  WAR.flares.push({ x: warX(i), y: warY(i), t: WARC.FLARE_T, by: n.id });
  // the glare clears the drowned off the land it lights
  const x0 = warX(i), y0 = warY(i);
  for (let y = Math.max(0, y0 - WARC.FLARE_R); y <= Math.min(WARC.H - 1, y0 + WARC.FLARE_R); y++) for (let x = Math.max(0, x0 - WARC.FLARE_R); x <= Math.min(WARC.W - 1, x0 + WARC.FLARE_R); x++) {
    const j = warIdx(x, y); if (Math.hypot(x - x0, y - y0) <= WARC.FLARE_R && WAR.owner[j] === WARC.DR) WAR.owner[j] = -1;
  }
  if (n.isMe) warLog('A flare bursts over the shore.');
  return '';
}
function warBell(n) {
  if (n.bellCd > 0) return 'The bell is still ringing in their ears.';
  n.bell = WARC.BELL_T; n.bellCd = WARC.BELL_CD;
  // the rally: attacks on you lose heart (they pay more per tile while the bell is up), and your own forces at the front are heartened
  for (const at of WAR.attacks) if (at.from === n.id) at.troops *= 1.08;
  if (n.isMe) warLog('The bell rings out over your land. Your people hold.');
  return '';
}

// ---------- pacts ----------
function warPropose(from, to) {
  const a = WAR.nations[from], b = WAR.nations[to]; if (!a.alive || !b.alive || a.allies.has(to)) return;
  if (b.isMe) {
    if (WAR.prompts.some(p => p.from === from)) return;
    WAR.prompts.push({ from, t: 30, text: `${a.name} offers a pact: no war between you for four minutes.` });
    warLog(`${a.name} offers you a pact.`);
  } else if (b.bot) {
    // a bot takes a pact when it likes the other side enough, or fears it
    const likes = b.rel[from] > -0.1 && (b.rel[from] > 0.1 || a.troops > b.troops * 1.3 || b.lastHit === a.id && WAR.t - b.lastHitT < 20);
    if (likes && WAR.rng() < 0.6 + b.bot.loyal * 0.3) warMakePact(from, to);
  }
}
function warMakePact(x, y) {
  const a = WAR.nations[x], b = WAR.nations[y], until = WAR.t + 240;
  a.allies.set(y, until); b.allies.set(x, until);
  for (let k = WAR.attacks.length - 1; k >= 0; k--) { const at = WAR.attacks[k]; if ((at.from === x && at.target === y) || (at.from === y && at.target === x)) { WAR.nations[at.from].troops += at.troops; WAR.attacks.splice(k, 1); } }
  a.rel[y] = Math.min(1, a.rel[y] + 0.3); b.rel[x] = Math.min(1, b.rel[x] + 0.3);
  if (a.isMe || b.isMe) warLog(`A pact is sworn with ${(a.isMe ? b : a).name}.`, 'good');
}
function warBreakPact(x, y, treachery) {
  const a = WAR.nations[x], b = WAR.nations[y];
  a.allies.delete(y); b.allies.delete(x);
  if (treachery) {
    a.betrayed++; b.rel[x] = -1;
    for (const n of WAR.nations) if (n.id !== x) n.rel[x] = Math.max(-1, n.rel[x] - 0.35);
    warLog(a.isMe ? `You break your oath to ${b.name}. The Reach will remember.` : `${a.name} breaks its oath to ${b.name}.`, a.isMe ? 'bad' : '');
  }
}
function warAnswerPrompt(p, yes) {
  const k = WAR.prompts.indexOf(p); if (k >= 0) WAR.prompts.splice(k, 1);
  const a = WAR.nations[p.from]; if (!a.alive) return;
  if (yes) warMakePact(p.from, WAR.me); else { a.rel[WAR.me] -= 0.15; warLog(`You turn ${a.name} away.`); }
}

// ---------- the drowned and the tide ----------
function warDrownedTick(dt) {
  const night = warIsNight(), lo = warLightOwner();
  if (night) {
    // on dark shores, the drowned come up out of the sea and take the land; they creep inland from there
    WAR.drownAcc = (WAR.drownAcc || 0) + dt;
    if (WAR.drownAcc < 0.5) return; WAR.drownAcc = 0;
    const n = WAR.map.length, tries = 420;
    for (let k = 0; k < tries; k++) {
      const i = (WAR.rng() * n) | 0, o = WAR.owner[i];
      if (!warIsLand(i) || WAR.map[i] === 4 || WAR.lit[i] >= 2 || o === WARC.DR) continue;
      if (o >= 0 && o === lo) continue;   // the Keeper's land is safe: the Light is theirs
      let sea = false, dr = false; warNeighbours(i, j => { if (warIsSea(j)) sea = true; if (WAR.owner[j] === WARC.DR) dr = true; });
      if (!(sea && WAR.rng() < 0.55) && !(dr && WAR.rng() < 0.35)) continue;
      if (WAR.lit[i] === 1 && WAR.rng() < 0.7) continue;
      if (o >= 0) { const d = WAR.nations[o]; d.tiles--; d.lost++; d.troops = Math.max(0, d.troops - 1.5); if (WAR.t - d.drownedT > 25) { d.drownedT = WAR.t; if (d.isMe) warLog('The drowned are coming up on your dark shore.', 'bad'); } if (d.tiles <= 0) warEliminate(d, null); }
      WAR.owner[i] = WARC.DR; if (WAR.structs.has(i)) warLoseStruct(i);
    }
  } else {
    // by day they sink back; the land lies empty until someone takes it
    WAR.drownAcc = (WAR.drownAcc || 0) + dt;
    if (WAR.drownAcc < 0.5) return; WAR.drownAcc = 0;
    for (let k = 0; k < 300; k++) { const i = (WAR.rng() * WAR.map.length) | 0; if (WAR.owner[i] === WARC.DR && WAR.rng() < 0.5) WAR.owner[i] = -1; }
  }
}
function warTideTick(dt) {
  WAR.tideT += dt;
  const high = (WAR.tideT % WARC.TIDE) >= WARC.TIDE / 2;
  if (high === WAR.tideHigh) return;
  WAR.tideHigh = high;
  if (high) {
    // the shoals drown: whoever stood on them loses them
    let lost = new Map();
    for (let i = 0; i < WAR.map.length; i++) if (WAR.map[i] === 1) { const o = WAR.owner[i]; if (o >= 0) { WAR.nations[o].tiles--; lost.set(o, (lost.get(o) || 0) + 1); } WAR.owner[i] = -1; if (WAR.structs.has(i)) warLoseStruct(i); }
    for (const [o, n] of lost) { const d = WAR.nations[o]; if (d.isMe) warLog(`The tide comes in: ${n} tiles of shoal go under.`, 'bad'); if (d.tiles <= 0) warEliminate(d, null); }
    warLog('High water. The shoals are under the sea; the islands stand apart.');
  } else warLog('Low water. The shoals dry out: the islands are joined.');
  // boats whose road just closed turn back on their next step (handled in warBoatsTick)
}

// ---------- growth ----------
function warGrowth(dt) {
  const lo = warLightOwner();
  for (const n of WAR.nations) {
    if (!n.alive) continue;
    n.light = n.id === lo;
    n.maxTroops = 60 + n.tiles * 10;
    let g = (1.3 + n.tiles * 0.07) * (1 - n.troops / Math.max(1, n.maxTroops));
    if (n.light) g *= 1.1;
    g *= 1 + 0.12 * n.regionsHeld;
    if (g > 0) n.troops += g * dt;
    n.gold += (0.35 + n.tiles * 0.011 + n.harbours * 0.4 + (n.light ? 1.5 : 0) + n.regionsHeld * 0.3) * dt;
    if (n.bell > 0) n.bell -= dt; if (n.bellCd > 0) n.bellCd -= dt; if (n.flareCd > 0) n.flareCd -= dt; if (n.fireCd > 0) n.fireCd -= dt;
    for (const [k, until] of n.allies) if (WAR.t > until) { warBreakPact(n.id, k, false); if (n.isMe) warLog(`Your pact with ${WAR.nations[k].name} has run its course.`); }
    for (let k = 0; k < n.rel.length; k++) if (k !== n.id) n.rel[k] += (0 - n.rel[k]) * dt * 0.004;
  }
}
// whole islands held: the region bonus, and each nation's heart (for labels and the bots)
function warSurvey() {
  const N = WAR.nations.length, cnt = new Int32Array(WAR.regions.length * N), sx = new Float64Array(N), sy = new Float64Array(N), c = new Int32Array(N);
  for (let i = 0; i < WAR.map.length; i++) { const o = WAR.owner[i]; if (o < 0) continue; cnt[WAR.region[i] * N + o]++; sx[o] += warX(i); sy[o] += warY(i); c[o]++; }
  for (const n of WAR.nations) { n.regionsHeld = 0; n.tiles = c[n.id]; if (c[n.id]) { n.cx = sx[n.id] / c[n.id]; n.cy = sy[n.id] / c[n.id]; } }
  for (const r of WAR.regions) { r.owner = -1; if (!r.bonus) continue; for (let o = 0; o < N; o++) if (cnt[r.id * N + o] >= r.tiles * 0.97) { r.owner = o; WAR.nations[o].regionsHeld++; } }
  for (const n of WAR.nations) if (n.alive && n.tiles <= 0 && WAR.phase === 'play') warEliminate(n, null);
}

// ---------- the bots ----------
function warBorders(id) {
  // which nations' land touches this one's, and whether empty land or the drowned do
  const out = new Map(); let neutral = 0, dr = 0;
  for (let i = 0; i < WAR.map.length; i++) {
    if (WAR.owner[i] !== id) continue;
    warNeighbours(i, j => { if (!warIsLand(j) || WAR.map[j] === 4) return; const o = WAR.owner[j]; if (o === -1) neutral++; else if (o === WARC.DR) dr++; else if (o !== id) out.set(o, (out.get(o) || 0) + 1); });
  }
  return { out, neutral, dr };
}
function warBotTick(n, dt) {
  const b = n.bot; b.next -= dt; if (b.next > 0) return; b.next = 0.9 + WAR.rng() * 0.6;
  const my = n.troops, bord = warBorders(n.id), leader = WAR.nations.reduce((m, k) => k.alive && (!m || k.tiles > m.tiles) ? k : m, null);
  const busy = WAR.attacks.filter(a => a.from === n.id).reduce((s, a) => s + a.troops, 0);
  const reserve = n.maxTroops * (0.12 + (1 - b.aggr) * 0.18);
  // 1. someone is on our land: answer, if we can
  if (n.lastHit >= 0 && WAR.t - n.lastHitT < 12) {
    const e = WAR.nations[n.lastHit];
    if (e.alive && WAR.t > WARC.TRUCE && !n.allies.has(e.id) && my > reserve * 1.2 && !WAR.attacks.some(a => a.from === n.id && a.target === e.id) && bord.out.has(e.id)) warAttack(n.id, e.id, my * (0.3 + b.aggr * 0.3));
    if (n.gold > warStructCost(n, 'tower') && WAR.rng() < 0.5) warBotBuild(n, 'tower', e.id);
    if (e.alive && e.troops > my * 1.6 && WAR.rng() < 0.3 + b.loyal * 0.4) warPropose(n.id, e.id);
  }
  // 2. the empty shore
  if (bord.neutral > 0 && my > 20 && busy < my * 0.6 && WAR.rng() < 0.7) warAttack(n.id, -1, my * (0.25 + b.greed * 0.3));
  // 3. the drowned, by day
  if (bord.dr > 0 && !warIsNight() && my > 40 && WAR.rng() < 0.4) warAttack(n.id, WARC.DR, Math.min(my * 0.25, bord.dr * 6));
  // 4. a neighbour: the weakest we dislike most, and the leader when they grow too big
  if (WAR.t > WARC.TRUCE && my > reserve + 40 && busy < my * 0.5 && WAR.rng() < 0.05 + b.aggr * 0.12 + (bord.neutral ? 0 : 0.08)) {
    let best = null, bs = 0;
    for (const [o, shared] of bord.out) {
      const e = WAR.nations[o]; if (!e.alive || n.allies.has(o)) continue;
      let s = (my / Math.max(20, e.troops)) * (0.6 - n.rel[o]) * (0.5 + b.aggr) * Math.min(1, shared / 6);
      if (leader && o === leader.id && leader.tiles > WAR.landTiles * 0.22) s *= 1.8;
      if (e.bell > 0) s *= 0.5;
      if (s > bs) { bs = s; best = e; }
    }
    if (best && bs > 0.7) warAttack(n.id, best.id, my * (0.3 + b.aggr * 0.35));
  }
  // 5. over the sea: when the island is full, or a naval temper
  if (!bord.neutral && my > WARC.LANDING_MIN * 2 && busy < my * 0.4 && WAR.rng() < 0.08 + b.naval * 0.2) {
    const tgt = warBotSeaTarget(n);
    if (tgt >= 0) warSendBoat(n.id, tgt, my * (0.25 + b.naval * 0.2));
  }
  // 6. gold: harbours for sailors, beacons after a bad night, towers at the border, a fire-ship for the hated
  if (n.gold > 40) {
    const r = WAR.rng();
    if (b.naval > 0.4 && n.harbours < 1 + (n.tiles / 90 | 0) && n.gold >= warStructCost(n, 'harbour') && r < 0.4) warBotBuild(n, 'harbour');
    else if (WAR.t - n.drownedT < 60 && n.gold >= warStructCost(n, 'beacon') && r < 0.6) warBotBuild(n, 'beacon');
    else if (n.towers < 1 + (n.tiles / 70 | 0) && n.gold >= warStructCost(n, 'tower') && r < 0.5) warBotBuild(n, 'tower');
    else if (n.harbours > 0 && n.gold >= WARC.COSTS.fireship && n.fireCd <= 0 && b.aggr > 0.5 && WAR.rng() < 0.3) {
      const hated = WAR.nations.filter(e => e.alive && e.id !== n.id && !n.allies.has(e.id) && (n.rel[e.id] < -0.5 || (leader && e.id === leader.id && e.tiles > WAR.landTiles * 0.25))).sort((p, q) => n.rel[p.id] - n.rel[q.id])[0];
      if (hated) { const t = warBotCoastOf(hated.id, 40); if (t >= 0) warSendBoat(n.id, t, 0, 'fire'); }
    }
    if (warIsNight() && n.gold > WARC.COSTS.flare + 20 && n.flareCd <= 0 && WAR.t - n.drownedT < 10) { const t = warBotDrownedNear(n.id); if (t >= 0) warFlare(n, t); }
  }
  // 7. the bell when hard pressed
  if (n.bellCd <= 0 && WAR.attacks.some(a => a.target === n.id && a.troops > my * 0.5)) warBell(n);
  // 8. friends: a pact with a strong neighbour we don't hate, now and then
  if (WAR.rng() < 0.04 + b.loyal * 0.05) {
    for (const [o] of bord.out) { const e = WAR.nations[o]; if (e.alive && !n.allies.has(o) && n.rel[o] > 0.05 && e.troops > my * 0.8) { warPropose(n.id, o); break; } }
  }
}
function warBotBuild(n, type, vs) {
  // a tile of ours: on the shore for a harbour, at the border with `vs` for a tower, at a dark shore for a beacon
  let best = -1, bs = -1;
  for (let k = 0; k < 400; k++) {
    const i = (WAR.rng() * WAR.map.length) | 0; if (WAR.owner[i] !== n.id || WAR.structs.has(i) || WAR.map[i] < 2 || WAR.map[i] === 4) continue;
    let s = WAR.rng();
    if (type === 'harbour') { if (!warShore(i)) continue; }
    else if (type === 'tower') { let nb = 0; warNeighbours(i, j => { if (vs != null ? WAR.owner[j] === vs : (WAR.owner[j] >= 0 && WAR.owner[j] !== n.id)) nb++; }); s += nb * 2; }
    else if (type === 'beacon') { if (!warCoastal(i)) continue; if (WAR.lit[i] >= 3) continue; s += 1; }
    if (s > bs) { bs = s; best = i; }
  }
  if (best >= 0) warBuild(n, type, best);
}
function warBotSeaTarget(n) {
  // another island's shore: empty land first, then the weakest nation's
  let best = -1, bs = -1;
  for (let k = 0; k < 300; k++) {
    const i = (WAR.rng() * WAR.map.length) | 0; if (!warIsLand(i) || WAR.map[i] === 4 || !warCoastal(i)) continue;
    const o = WAR.owner[i]; if (o === n.id || o === WARC.DR || (o >= 0 && n.allies.has(o))) continue;
    if (WAR.region[i] === WAR.region[n.spawn] && WAR.map[i] >= 2) continue;
    const d = Math.hypot(warX(i) - n.cx, warY(i) - n.cy);
    let s = (o === -1 ? 3 : 1.5 - n.rel[o] - WAR.nations[o].troops / Math.max(1, n.troops)) - d / 60;
    if (s > bs) { bs = s; best = i; }
  }
  return bs > 0 ? best : -1;
}
function warBotCoastOf(id, tries) {
  let best = -1, bs = -1;
  for (let k = 0; k < tries * 10; k++) { const i = (WAR.rng() * WAR.map.length) | 0; if (WAR.owner[i] !== id || !warCoastal(i)) continue; let s = 0; const x = warX(i), y = warY(i); for (const [j, st] of WAR.structs) if (st.owner === id && Math.hypot(warX(j) - x, warY(j) - y) < 5) s += 2; s += WAR.rng(); if (s > bs) { bs = s; best = i; } }
  return best;
}
function warBotDrownedNear(id) {
  for (let k = 0; k < 400; k++) { const i = (WAR.rng() * WAR.map.length) | 0; if (WAR.owner[i] !== WARC.DR) continue; let mine = false; warNeighbours(i, j => { if (WAR.owner[j] === id) mine = true; }); if (mine) return i; }
  return -1;
}

// ---------- the end ----------
function warFinish(how, by) {
  if (WAR.result) return;
  const me = WAR.nations[WAR.me], st = warLoadStats();
  st.games = (st.games || 0) + 1; if (how === 'won') st.wins = (st.wins || 0) + 1; st.bestTiles = Math.max(st.bestTiles || 0, me.taken); st.bestDays = Math.max(st.bestDays || 0, WAR.day);
  warSaveStats(st);
  WAR.result = { how, by: by ? by.name : null, days: WAR.day, taken: me.taken, kills: me.kills, boats: WAR.stats.boats, tiles: me.tiles, share: me.tiles / WAR.landTiles };
  WAR.spectate = how !== 'won';
  if (typeof warShowResult === 'function') warShowResult(WAR.result);
}

// ---------- the clock ----------
function warTick(dt) {
  if (WAR.phase === 'spawn') {
    WAR.spawnT -= dt; WAR.beam += dt * 6.283 / WARC.BEAM_TURN;
    if (WAR.spawnT <= 0) warBeginPlay();
    return;
  }
  if (WAR.phase !== 'play' || WAR.paused) return;
  WAR.t += dt;
  const day = Math.floor(WAR.t / WARC.DAY) + 1; if (day !== WAR.day) { WAR.day = day; WAR.stats.days = day; if (day > 1) warLog(`Day ${day} breaks over the Reach.`); }
  WAR.beam += dt * 6.283 / WARC.BEAM_TURN;
  WAR.relT = (WAR.relT || 0) + dt; if (WAR.relT > 0.2) { WAR.relT = 0; warRelight(); }
  warTideTick(dt);
  warGrowth(dt);
  warAttacksTick(dt);
  warBoatsTick(dt);
  warDrownedTick(dt);
  for (let k = WAR.flares.length - 1; k >= 0; k--) { WAR.flares[k].t -= dt; if (WAR.flares[k].t <= 0) WAR.flares.splice(k, 1); }
  for (let k = WAR.events.length - 1; k >= 0; k--) { WAR.events[k].t -= dt; if (WAR.events[k].t <= 0) WAR.events.splice(k, 1); }
  for (let k = WAR.prompts.length - 1; k >= 0; k--) { WAR.prompts[k].t -= dt; if (WAR.prompts[k].t <= 0) { const p = WAR.prompts.splice(k, 1)[0]; WAR.nations[p.from].rel[WAR.me] -= 0.05; } }
  WAR.survT = (WAR.survT || 0) + dt; if (WAR.survT > 1) { WAR.survT = 0; warSurvey(); }
  for (const n of WAR.nations) if (n.alive && n.bot) warBotTick(n, dt);
  // the end: most of the Reach is yours, or you are the last standing
  const me = WAR.nations[WAR.me];
  if (!WAR.result && me.alive && (me.tiles >= WAR.landTiles * 0.6 || WAR.nations.every(n => n.isMe || !n.alive))) warFinish('won');
}
// several ticks per frame at speed; capped so a slow phone doesn't spiral
function warFrame(dt) {
  const steps = WAR.speed, h = Math.min(dt, 0.05);
  for (let k = 0; k < steps; k++) warTick(h);
  if (typeof warDraw === 'function') warDraw(dt);
}
