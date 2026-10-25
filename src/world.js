// Building each voyage: where you start, the skerries, the old wrecks, drifting timber,
// and the safe channel Plimsoll knows through all of it.

// World generation draws from RNG, which is seeded for crew voyages so every ship in a crew
// sails the same sea. Everything else uses plain Math.random.
let RNG = Math.random;
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rand(a, b) { return a + RNG() * (b - a); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function bearingOf(x, y) { return Math.atan2(x, y); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pickOne(a) { return a[(RNG() * a.length) | 0]; }

function makeVoyage(n, attract, seed) {
  if (seed != null) RNG = seeded(seed);
  try {
    // one voyage in twenty slips out of the world: the Backrooms. Rolled from the crew's seed,
    // so a whole crew goes in together. Add ?backrooms to the address to force it (solo only).
    const forced = seed == null && !attract && SK.FORCE_BACKROOMS;
    const back = !attract && (RNG() < SK.BACKROOMS_CHANCE || forced);
    return back ? buildBackrooms(n) : buildVoyage(n, attract);
  } finally { RNG = Math.random; }
}

function buildVoyage(n, attract) {
  const HB = SK.HARBOUR;
  const sb = attract ? rand(-0.6, 0.6) : rand(-0.95, 0.95);
  const W = SK.WORLD;
  const sd = attract ? 760 : (880 + n * 60) * W;
  const sx = Math.sin(sb) * sd, sy = Math.cos(sb) * sd;
  const ship = { x: sx, y: sy, h: bearingOf(HB.x - sx, HB.y - sy) + rand(-0.12, 0.12), v: 7, sail: 0.55, rudder: 0, hull: 3, maxHull: 3, boat: 'brig', inv: 0, bob: 0 };
  { const b = typeof myBoat === 'function' ? myBoat() : null; if (b) { ship.boat = b.id; ship.hull = ship.maxHull = b.hull; } }

  const rocks = [], wrecks = [], timber = [], solid = [];
  const ok = (x, y, r) => y > 45 && Math.hypot(x - HB.x, y - HB.y) > 115 && Math.hypot(x - sx, y - sy) > 100 &&
    Math.hypot(x, y) > 70 && !solid.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 26);
  const addRock = (x, y, r) => {
    const prof = []; for (let i = 0; i < 7; i++) prof.push(rand(0.35, 1));
    prof[0] = rand(0.15, 0.45); prof[6] = rand(0.15, 0.45);
    const o = { x, y, r, prof, ph: rand(0, 6.28) };
    rocks.push(o); solid.push(o);
  };
  const addWreck = (x, y, r, name) => {
    const o = { x, y, r, ang: rand(0, 6.28), lean: rand(-1, 1), name, ribs: 4 + (Math.random() * 3 | 0) };
    wrecks.push(o); solid.push(o);
  };
  const along = (t, j) => [sx + (HB.x - sx) * t + rand(-j, j), sy + (HB.y - sy) * t + rand(-j, j)];

  // the Gannet always lies somewhere on the way in
  for (let tries = 0; tries < 400 && !wrecks.length; tries++) {
    const [x, y] = along(rand(0.35, 0.7), 80), r = rand(16, 21);
    if (ok(x, y, r)) addWreck(x, y, r, 'Gannet');
  }
  const names = SK.WRECK_NAMES.slice().sort(() => RNG() - 0.5);
  const wreckCount = attract ? 3 : Math.round((3 + n) * 2);
  for (let tries = 0; tries < 4000 && wrecks.length < wreckCount; tries++) {
    const b = rand(-1.45, 1.45), d = rand(150, 1050 * (attract ? 1 : W)), r = rand(11, 19);
    const x = Math.sin(b) * d, y = Math.cos(b) * d;
    if (ok(x, y, r)) addWreck(x, y, r, names[wrecks.length % names.length]);
  }

  // (the wreckers' false lights have been taken down: no lures any more)
  const lures = [];
  const dirX = (HB.x - sx) / Math.hypot(HB.x - sx, HB.y - sy), dirY = (HB.y - sy) / Math.hypot(HB.x - sx, HB.y - sy);
  for (let tries = 0; tries < 1500 && lures.length < 0; tries++) {
    const side = RNG() < 0.5 ? -1 : 1, off = rand(70, 170) * side;
    const [bx, by] = along(rand(0.25, 0.8), 0);
    const x = bx + dirY * off, y = by - dirX * off;
    if (!ok(x, y, 34) || lures.some(l => Math.hypot(l.x - x, l.y - y) < 120)) continue;
    addRock(x, y, rand(7, 10));
    for (let i = 0; i < 3; i++) { const a = rand(0, 6.28), d = rand(11, 16); addRock(x + Math.cos(a) * d, y + Math.sin(a) * d, rand(5, 8)); }
    lures.push({ x, y, px: dirX, py: dirY, ph: rand(0, 6.28), gone: false });
  }

  // a bigger sea needs more skerries: about the same density along the way in, and plenty off it
  const scale = attract ? 1 : W * 1.3;
  const total = Math.round((26 + n * 6) * scale), onLine = Math.round(total * 0.45);
  for (let tries = 0; tries < 12000 && rocks.length < onLine; tries++) {
    const [x, y] = along(rand(0.08, 0.92), 65 * (attract ? 1 : 1.6)), r = rand(6, 16);
    if (ok(x, y, r)) addRock(x, y, r);
  }
  for (let tries = 0; tries < 12000 && rocks.length < total; tries++) {
    const b = rand(-1.5, 1.5), d = rand(90, 1100 * (attract ? 1 : W)), r = rand(5, 18);
    const x = Math.sin(b) * d, y = Math.cos(b) * d;
    if (ok(x, y, r)) addRock(x, y, r);
  }

  for (let i = 0; i < Math.round((8 + n * 3) * (attract ? 1 : W)); i++) timber.push(spawnTimber(sx, sy));

  let path = findPath(sx, sy, HB.x, 80, solid);
  if (!path) path = [{ x: sx, y: sy }, { x: HB.x, y: 80 }];
  path.push({ x: HB.x, y: 44 }, { x: HB.x, y: 26 });

  return { ship, rocks, wrecks, timber, path, lures };
}

function makeShip(x, y, h) {
  const ship = { x, y, h, v: 7, sail: 0.55, rudder: 0, hull: 3, maxHull: 3, boat: 'brig', inv: 0, bob: 0 };
  const b = typeof myBoat === 'function' ? myBoat() : null;
  if (b) { ship.boat = b.id; ship.hull = ship.maxHull = b.hull; }
  return ship;
}

// The Backrooms: a flooded maze of yellow rooms, N x N cells of C metres, carved by a random
// depth-first walk with a few extra walls knocked through so there's more than one way round.
// The exit is the cell furthest from the start, and Plimsoll knows the way.
function buildBackrooms(n) {
  const C = SK.BACKROOMS_CELL, N = 8 + Math.min(4, Math.floor(n / 2));
  const X0 = -N * C / 2, Y0 = 220;
  const east = new Uint8Array(N * N).fill(1), north = new Uint8Array(N * N).fill(1);
  const id = (i, j) => j * N + i;
  const start = { i: (RNG() * N) | 0, j: 0 };
  const seen = new Uint8Array(N * N), stack = [start];
  seen[id(start.i, start.j)] = 1;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => ({ i: c.i + di, j: c.j + dj, di, dj }))
      .filter(o => o.i >= 0 && o.j >= 0 && o.i < N && o.j < N && !seen[id(o.i, o.j)]);
    if (!opts.length) { stack.pop(); continue; }
    const o = opts[(RNG() * opts.length) | 0];
    if (o.di === 1) east[id(c.i, c.j)] = 0; else if (o.di === -1) east[id(o.i, o.j)] = 0;
    else if (o.dj === 1) north[id(c.i, c.j)] = 0; else north[id(o.i, o.j)] = 0;
    seen[id(o.i, o.j)] = 1; stack.push({ i: o.i, j: o.j });
  }
  for (let k = 0; k < Math.round(N * N * 0.1); k++) {
    const i = (RNG() * (N - 1)) | 0, j = (RNG() * (N - 1)) | 0;
    if (RNG() < 0.5) east[id(i, j)] = 0; else north[id(i, j)] = 0;
  }
  const walls = [], T = 1.2;
  const seg = (x1, y1, x2, y2) => walls.push({ x1, y1, x2, y2, r: T, what: 'the wall' });
  seg(X0, Y0, X0 + N * C, Y0); seg(X0, Y0, X0, Y0 + N * C);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = X0 + i * C, y = Y0 + j * C;
    if (east[id(i, j)]) seg(x + C, y, x + C, y + C);
    if (north[id(i, j)]) seg(x, y + C, x + C, y + C);
  }
  // breadth-first from the start: the furthest cell is the way out
  const dist = new Int32Array(N * N).fill(-1), par = new Int32Array(N * N).fill(-1), q = [id(start.i, start.j)];
  dist[q[0]] = 0;
  let far = q[0];
  while (q.length) {
    const c = q.shift(), i = c % N, j = (c / N) | 0;
    const nb = [];
    if (i < N - 1 && !east[c]) nb.push(c + 1);
    if (i > 0 && !east[c - 1]) nb.push(c - 1);
    if (j < N - 1 && !north[c]) nb.push(c + N);
    if (j > 0 && !north[c - N]) nb.push(c - N);
    for (const d of nb) if (dist[d] < 0) { dist[d] = dist[c] + 1; par[d] = c; q.push(d); if (dist[d] > dist[far]) far = d; }
  }
  const centre = c => ({ x: X0 + (c % N + 0.5) * C, y: Y0 + (((c / N) | 0) + 0.5) * C });
  const path = [];
  for (let c = far; c >= 0; c = par[c]) path.unshift(centre(c));
  const s0 = path[0], s1 = path[1] || { x: s0.x, y: s0.y + 1 };
  const ship = makeShip(s0.x, s0.y - C * 0.2, bearingOf(s1.x - s0.x, s1.y - s0.y));
  ship.v = 5; ship.sail = 0.3;
  const lights = [];
  for (let c = 0; c < N * N; c++) { const p = centre(c); lights.push({ x: p.x, y: p.y, ph: RNG() * 6.28, bad: RNG() < 0.12 }); }
  const exit = Object.assign(centre(far), { r: C * 0.32 });
  return { ship, rocks: [], wrecks: [], timber: [], path, lures: [], walls, exit, backrooms: true, rooms: { X0, Y0, C, N, lights } };
}

function spawnTimber(sx, sy) {
  const HB = SK.HARBOUR;
  for (let tries = 0; tries < 50; tries++) {
    const b = rand(-1.45, 1.45), d = rand(150, 1050 * SK.WORLD);
    const x = Math.sin(b) * d, y = Math.cos(b) * d;
    if (y < 70 || Math.hypot(x - HB.x, y - HB.y) < 130 || Math.hypot(x - sx, y - sy) < 60) continue;
    const a = rand(0, 6.28), v = rand(1.2, 3);
    return { x, y, vx: Math.sin(a) * v, vy: Math.cos(a) * v, len: rand(4, 8), ang: rand(0, 6.28), spin: rand(-0.3, 0.3), r: 3.5 };
  }
  return { x: 0, y: 600, vx: 1, vy: 0, len: 5, ang: 0, spin: 0, r: 3.5 };
}

// A* over a 12 m grid, then pulled tight so Plimsoll walks in straight legs.
function findPath(sx, sy, tx, ty, blockers) {
  const C = 12, PAD = 15;
  const x0 = Math.min(sx, tx) - 320, x1 = Math.max(sx, tx) + 320, y0 = 0, y1 = Math.max(sy, ty) + 320;
  const nx = Math.ceil((x1 - x0) / C), ny = Math.ceil((y1 - y0) / C), N = nx * ny;
  const blk = new Uint8Array(N);
  // the shore, then each obstacle marks only the cells around it (fast even on a big sea)
  for (let j = 0; j < ny; j++) if (y0 + (j + 0.5) * C < 50) blk.fill(1, j * nx, (j + 1) * nx);
  for (const o of blockers) {
    const lim = o.r + PAD;
    const i0 = clamp(Math.floor((o.x - lim - x0) / C), 0, nx - 1), i1 = clamp(Math.floor((o.x + lim - x0) / C), 0, nx - 1);
    const j0 = clamp(Math.floor((o.y - lim - y0) / C), 0, ny - 1), j1 = clamp(Math.floor((o.y + lim - y0) / C), 0, ny - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (Math.hypot(x0 + (i + 0.5) * C - o.x, y0 + (j + 0.5) * C - o.y) < lim) blk[j * nx + i] = 1;
    }
  }
  // obstacles bucketed by 60 m square, for the line-of-sight checks below
  const B = 60, buckets = new Map();
  for (const o of blockers) {
    const lim = o.r + 11;
    for (let bx = Math.floor((o.x - lim) / B); bx <= Math.floor((o.x + lim) / B); bx++)
      for (let by = Math.floor((o.y - lim) / B); by <= Math.floor((o.y + lim) / B); by++) {
        const k = bx + ',' + by; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(o);
      }
  }
  const idx = (x, y) => clamp(Math.floor((y - y0) / C), 0, ny - 1) * nx + clamp(Math.floor((x - x0) / C), 0, nx - 1);
  const s = idx(sx, sy), t = idx(tx, ty);
  blk[s] = 0; blk[t] = 0;
  const ti = t % nx, tj = (t / nx) | 0;
  const h = k => Math.hypot(k % nx - ti, ((k / nx) | 0) - tj);
  const gS = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);

  const heap = [];
  const push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; }
    }
    return top;
  };
  gS[s] = 0; push(h(s), s);
  let found = s === t;
  while (heap.length && !found) {
    const k = pop()[1];
    if (closed[k]) continue;
    if (k === t) { found = true; break; }
    closed[k] = 1;
    const i = k % nx, j = (k / nx) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
      const nk = nj * nx + ni;
      if (blk[nk] || closed[nk]) continue;
      if (di && dj && (blk[j * nx + ni] || blk[nj * nx + i])) continue;
      const ng = gS[k] + (di && dj ? 1.4142 : 1);
      if (ng < gS[nk]) { gS[nk] = ng; came[nk] = k; push(ng + h(nk), nk); }
    }
  }
  if (!found) return null;

  const cells = [];
  for (let k = t; k !== -1; k = came[k]) { cells.push(k); if (k === s) break; }
  cells.reverse();
  const raw = cells.map(k => ({ x: x0 + (k % nx + 0.5) * C, y: y0 + (((k / nx) | 0) + 0.5) * C }));
  raw[0] = { x: sx, y: sy }; raw[raw.length - 1] = { x: tx, y: ty };

  const clear = (a, b) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 4));
    for (let i = 0; i <= n; i++) {
      const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
      if (y < 50) return false;
      const near = buckets.get(Math.floor(x / B) + ',' + Math.floor(y / B));
      if (near) for (const o of near) if (Math.hypot(o.x - x, o.y - y) < o.r + 11) return false;
    }
    return true;
  };
  const out = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = Math.min(raw.length - 1, i + 60);
    while (j > i + 1 && !clear(raw[i], raw[j])) j--;
    out.push(raw[j]); i = j;
  }
  return out;
}
