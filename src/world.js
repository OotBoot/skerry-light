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
  try { return buildVoyage(n, attract); } finally { RNG = Math.random; }
}

function buildVoyage(n, attract) {
  const HB = SK.HARBOUR;
  const sb = attract ? rand(-0.6, 0.6) : rand(-0.95, 0.95);
  const sd = attract ? 760 : 880 + n * 60;
  const sx = Math.sin(sb) * sd, sy = Math.cos(sb) * sd;
  const ship = { x: sx, y: sy, h: bearingOf(HB.x - sx, HB.y - sy) + rand(-0.12, 0.12), v: 7, sail: 0.55, rudder: 0, hull: SK.HULL, inv: 0, bob: 0 };

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
  for (let tries = 0; tries < 2000 && wrecks.length < 3 + n; tries++) {
    const b = rand(-1.45, 1.45), d = rand(150, 1050), r = rand(11, 19);
    const x = Math.sin(b) * d, y = Math.cos(b) * d;
    if (ok(x, y, r)) addWreck(x, y, r, names[wrecks.length % names.length]);
  }

  // wreckers' false lights: a red and green pair, like the pier lamps, over a hidden cluster of rocks
  const lures = [];
  const dirX = (HB.x - sx) / Math.hypot(HB.x - sx, HB.y - sy), dirY = (HB.y - sy) / Math.hypot(HB.x - sx, HB.y - sy);
  for (let tries = 0; tries < 600 && lures.length < 2 + Math.floor(n / 2); tries++) {
    const side = RNG() < 0.5 ? -1 : 1, off = rand(70, 170) * side;
    const [bx, by] = along(rand(0.25, 0.8), 0);
    const x = bx + dirY * off, y = by - dirX * off;
    if (!ok(x, y, 34) || lures.some(l => Math.hypot(l.x - x, l.y - y) < 160)) continue;
    addRock(x, y, rand(7, 10));
    for (let i = 0; i < 3; i++) { const a = rand(0, 6.28), d = rand(11, 16); addRock(x + Math.cos(a) * d, y + Math.sin(a) * d, rand(5, 8)); }
    lures.push({ x, y, px: dirX, py: dirY, ph: rand(0, 6.28), gone: false });
  }

  const total = 26 + n * 6, onLine = Math.round(total * 0.45);
  for (let tries = 0; tries < 4000 && rocks.length < onLine; tries++) {
    const [x, y] = along(rand(0.12, 0.9), 65), r = rand(6, 16);
    if (ok(x, y, r)) addRock(x, y, r);
  }
  for (let tries = 0; tries < 4000 && rocks.length < total; tries++) {
    const b = rand(-1.5, 1.5), d = rand(90, 1100), r = rand(5, 18);
    const x = Math.sin(b) * d, y = Math.cos(b) * d;
    if (ok(x, y, r)) addRock(x, y, r);
  }

  for (let i = 0; i < 8 + n * 3; i++) timber.push(spawnTimber(sx, sy));

  let path = findPath(sx, sy, HB.x, 80, solid);
  if (!path) path = [{ x: sx, y: sy }, { x: HB.x, y: 80 }];
  path.push({ x: HB.x, y: 44 }, { x: HB.x, y: 26 });

  return { ship, rocks, wrecks, timber, path, lures };
}

function spawnTimber(sx, sy) {
  const HB = SK.HARBOUR;
  for (let tries = 0; tries < 50; tries++) {
    const b = rand(-1.45, 1.45), d = rand(150, 1050);
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
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * C, y = y0 + (j + 0.5) * C;
    let b = y < 50;
    if (!b) for (const o of blockers) {
      const lim = o.r + PAD;
      if (Math.abs(o.x - x) < lim && Math.abs(o.y - y) < lim && Math.hypot(o.x - x, o.y - y) < lim) { b = true; break; }
    }
    blk[j * nx + i] = b ? 1 : 0;
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
      for (const o of blockers) if (Math.hypot(o.x - x, o.y - y) < o.r + 11) return false;
    }
    return true;
  };
  const out = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !clear(raw[i], raw[j])) j--;
    out.push(raw[j]); i = j;
  }
  return out;
}
