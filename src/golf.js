'use strict';
// Skerry Links: a round of golf on the cliffs, nine holes laid out after the front nine at Pebble Beach (src/golfcourse.js).
// Its own card on the title screen (id gfTitle, the eighth on the desk menu), alone, up to four taking turns on one
// screen, or up to four online (src/golfnet.js). The 3D view is src/golf3d.js.
//
// A shot. Pick a club (up and down; each has its carry at full power, shown in yards), aim with left and right (the
// line and the ring on the ground show where a full shot carries in still air), then the swing meter: press once to
// start the swing, again to set the power as the marker rises (past 100% is an overswing: a little further, but the
// strike is harder to time), and once more as it comes back down, on the strike line. Early on the strike line draws
// the ball left (a hook), late pushes it right (a slice), and on it is straight. On the green the putter's meter is a
// length instead (its scale fits the putt: 10, 20, 40 or 80 feet), and timing only pushes or pulls it a little.
// The ball. It flies through the air (drag, lift that dies away, the wind, side spin), bounces and rolls by what it
// lands on (the fairway runs, the rough grabs, the bunkers hold, the greens are quick, and slopes take it), and drops
// in the cup if it reaches it slowly enough (too fast and it lips out). In the sea, the creek, or off the course: a
// stroke's penalty and a drop where it went in. Ten strokes on a hole and you pick up.
// Turns. Everyone tees off in turn (the best score on the last hole first), then whoever's furthest from the hole plays.
// The whole shot is worked out the moment it's struck (gfSim: a track of where the ball is, 60 times a second) and then
// played back, so the result's known at once and the same on every screen.
// The scoreboard (src/scores.js, game 'golf'): a full round of nine is an entry, s = 200 less your score to par (so the
// lowest round ranks first), b the holes played, c birdies or better. On one screen with others, the entry is the first
// player's. A round left early keeps its holes, with an asterisk.
// Debug and tests: gfDebug(hole) starts a round alone on that hole (0 to 8); gfDebugShot(club, power, acc, aim) strikes.

const GFC = { DT: 1 / 120, KD: 0.0045, KL: 0.0032, TAU: 6, KS: 0.00045, G: 9.81, CUP: 0.06, MAXS: 10, PUTT_MU: 0.062, GR_A0: 0.24, GR_B: 0.2, GR_SLOPE: 0.45 };
// (on a green a rolling ball slows by GR_A0 m/s² plus GR_B of its speed a second, so it rolls out freely and eases to a stop, and feels a little under half of the slope's pull, so putts break gently)
function gfGreenRoll(v) { const a = GFC.GR_A0, b = GFC.GR_B; return v / b - a / (b * b) * Math.log(1 + b * v / a); }
function gfGreenSpeed(D) { let lo = 0, hi = 20; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (gfGreenRoll(m) < D) lo = m; else hi = m; } return (lo + hi) / 2; }
const GF_CLUBS = [
  { k: 'D', n: 'Driver', c: 252, a: 12 }, { k: '3W', n: '3 Wood', c: 228, a: 13 }, { k: '5W', n: '5 Wood', c: 210, a: 15 },
  { k: '4I', n: '4 Iron', c: 192, a: 17 }, { k: '5I', n: '5 Iron', c: 181, a: 19 }, { k: '6I', n: '6 Iron', c: 170, a: 21 },
  { k: '7I', n: '7 Iron', c: 158, a: 24 }, { k: '8I', n: '8 Iron', c: 146, a: 28 }, { k: '9I', n: '9 Iron', c: 133, a: 32 },
  { k: 'PW', n: 'Pitching Wedge', c: 118, a: 38 }, { k: 'SW', n: 'Sand Wedge', c: 88, a: 48 }, { k: 'P', n: 'Putter', c: 0, a: 0, putt: true },
];
// what the ball meets: roll (how hard the ground slows a rolling ball, times g), bounce, grip (what's left of the speed
// along the ground at a bounce), lie (how much of a full shot you get from it)
const GF_SURF = {
  tee: { n: 'Tee', roll: 0.17, e: 0.32, f: 0.72, lie: 1 }, fairway: { n: 'Fairway', roll: 0.17, e: 0.32, f: 0.72, lie: 1 },
  fringe: { n: 'Fringe', roll: 0.12, e: 0.27, f: 0.64, lie: 0.97 }, green: { n: 'Green', roll: GFC.PUTT_MU, e: 0.22, f: 0.62, lie: 1 },
  rough: { n: 'Rough', roll: 0.42, e: 0.2, f: 0.45, lie: 0.86 }, deep: { n: 'Deep rough', roll: 0.8, e: 0.12, f: 0.3, lie: 0.72 },
  sand: { n: 'Bunker', roll: 2.4, e: 0.04, f: 0.12, lie: 0.62 }, rock: { n: 'Rocks', roll: 0.35, e: 0.5, f: 0.7, lie: 0.7 },
  water: { n: 'Sea', roll: 9, e: 0, f: 0, lie: 1 }, out: { n: 'Out of bounds', roll: 9, e: 0, f: 0, lie: 1 },
};
const GF_COLS = ['#ffd88a', '#8fd0ff', '#ff9a7a', '#a8e28a'];
const GF_PUTTS = [10, 20, 40, 80];   // (the putter's scales, feet at full)
const GF_WIND = { calm: [0, 2], breezy: [1.5, 5.5], gusty: [4, 9] };
const GF_METER = { normal: [1 / 1.05, 1.35], gentle: [1 / 1.6, 0.9] };   // (up, then down: of the meter a second)
var GF = { on: false, H: null, P: [], cur: 0, hi: 0, holes: [], ph: 'off', club: 0, aim: 0, putt: 1, m: null, shot: null, msg: '', msgT: 0,
  wind: [0, 0], seed: 1, mode: 'solo', set: null, cam: null, view: 'aim', t: 0, over: false, cardT: 0, keys: {}, rep: null, net: null, me: 0 };
const gfStore = { get() { try { return JSON.parse(localStorage.getItem('skerry-golf') || '{}') || {}; } catch (e) { return {}; } }, set(o) { try { localStorage.setItem('skerry-golf', JSON.stringify(o)); } catch (e) {} } };

// ---------- the ball ----------
// the speed off the face that carries a club a given distance in still air over flat ground (found by halving)
function gfFlatCarry(v, ang) {
  let x = 0, z = 0, vx = v * Math.cos(ang), vz = v * Math.sin(ang), t = 0; const dt = GFC.DT;
  while (t < 20) { const s = Math.hypot(vx, vz), L = GFC.KL * Math.exp(-t / GFC.TAU); vx += (-GFC.KD * s * vx - L * s * vz) * dt; vz += (-GFC.G - GFC.KD * s * vz + L * s * vx) * dt; x += vx * dt; z += vz * dt; t += dt; if (z < 0 && t > 0.1) break; }
  return x;
}
const GF_VCACHE = new Map();
function gfSpeedFor(club, m) {
  const key = club.k + ':' + Math.round(m * 10); if (GF_VCACHE.has(key)) return GF_VCACHE.get(key);
  let lo = 2, hi = 130; const a = club.a * Math.PI / 180;
  for (let i = 0; i < 34; i++) { const mid = (lo + hi) / 2; if (gfFlatCarry(mid, a) < m) lo = mid; else hi = mid; }
  GF_VCACHE.set(key, lo); return lo;
}
// the shot, worked out whole: from (x, y) with a club, a bearing (0 up the hole's frame), power (0 to 1.1) and a
// strike (acc: -0.15 late to +0.15 early; 0 on the line). Returns { tr: the ball's track [x, y, z] at 60 a second,
// end: [x, y], how: 'rest' | 'cup' | 'water' | 'out', drop: [x, y] (after water), surf, flew: carry in metres }
function gfSim(H, x0, y0, clubI, aim, power, acc, wind, pu) {
  const club = GF_CLUBS[clubI], lieS = gfSurf(H, x0, y0), z0 = gfH(H, x0, y0);
  const E = Math.sign(acc) * Math.max(0, Math.abs(acc) - 0.012) / 0.138 * (power > 1 ? 1 + (power - 1) * 8 : 1);   // (-1 to 1: the strike's error; an overswing makes it worse)
  const B = { x: x0, y: y0, z: z0 + 0.02, vx: 0, vy: 0, vz: 0, t: 0, mode: 'air', side: 0, lift: 1, lip: 0, hit: new Set() };
  const tr = [[B.x, B.y, B.z]];
  if (club.putt) {
    const ft = GF_PUTTS[pu == null ? GF.putt : pu] || 20, D = ft * 0.3048 * power, v = gfGreenSpeed(D) * (lieS === 'sand' ? 0.5 : 1);
    const a = aim - E * 0.05; B.vx = Math.sin(a) * v; B.vy = Math.cos(a) * v; B.mode = 'roll'; B.z = z0;
  } else {
    let lie = (GF_SURF[lieS] || GF_SURF.rough).lie;
    if (lieS === 'sand' && club.k === 'SW') lie = 0.86;
    if (club.k === 'D' && lieS !== 'tee') lie *= 0.9;   // (a driver off the ground)
    const m = club.c * GF_YD * Math.min(power, 1) * (power > 1 ? 1 + (power - 1) * 0.6 : 1) * lie;
    const v = gfSpeedFor(club, m), la = club.a * Math.PI / 180, a = aim - E * 0.07, ch = Math.cos(la);
    B.vx = Math.sin(a) * ch * v; B.vy = Math.cos(a) * ch * v; B.vz = Math.sin(la) * v; B.side = E * 1.0;
    B.spin = club.a / 48;   // (wedges stop; long clubs run)
  }
  const near = H.trees.filter(t => gfSegD(t.x, t.y, x0, y0, x0 + Math.sin(aim) * 320, y0 + Math.cos(aim) * 320) < 90);
  let how = 'rest', steps = 0, flew = 0, landed = false;
  const dt = GFC.DT, wx = wind[0], wy = wind[1];
  while (steps < 120 * 45) {
    steps++; B.t += dt;
    if (B.mode === 'air') {
      const rx = B.vx - wx, ry = B.vy - wy, rz = B.vz, s = Math.hypot(rx, ry, rz) || 1e-6, rh = Math.hypot(rx, ry) || 1e-6, hx = rx / rh, hy = ry / rh;
      const dec = Math.exp(-B.t / GFC.TAU), L = GFC.KL * dec * B.lift, Sd = GFC.KS * B.side * dec;
      B.vx += (-GFC.KD * s * rx + L * s * s * (-rz / s * hx) + Sd * s * s * hy) * dt;
      B.vy += (-GFC.KD * s * ry + L * s * s * (-rz / s * hy) - Sd * s * s * hx) * dt;
      B.vz += (-GFC.G - GFC.KD * s * rz + L * s * s * (rh / s)) * dt;
      B.x += B.vx * dt; B.y += B.vy * dt; B.z += B.vz * dt;
      // through a tree's crown: most of the speed gone, and down it drops
      for (const t of near) { if (B.hit.has(t)) continue; const gz = t.gz != null ? t.gz : (t.gz = gfH(H, t.x, t.y)), cz = gz + t.h * 0.68, d = Math.hypot(B.x - t.x, B.y - t.y, (B.z - cz) * 1.5); if (d < t.r || (Math.hypot(B.x - t.x, B.y - t.y) < 0.45 && B.z < cz && B.z > gz)) { B.hit.add(t); B.vx *= 0.22; B.vy *= 0.22; B.vz = Math.min(B.vz, 0) * 0.3; B.lift = 0; B.side = 0; } }
      const g = gfH(H, B.x, B.y);
      if (B.z <= g) {
        const sf = gfSurf(H, B.x, B.y);
        if (sf === 'water' || sf === 'out') { how = sf; B.z = Math.max(g, -0.2); tr.push([B.x, B.y, B.z]); break; }
        if (!landed) { landed = true; flew = Math.hypot(B.x - x0, B.y - y0); }
        const S = GF_SURF[sf], n = gfNorm(H, B.x, B.y), vn = B.vx * n[0] + B.vy * n[1] + B.vz * n[2];
        B.z = g;
        if (vn < 0) {
          let f = S.f; if (B.spin && B.lift > 0.5 && (sf === 'green' || sf === 'fringe' || sf === 'fairway')) f *= 1 - 0.45 * B.spin; B.lift = 0;
          const tx = B.vx - vn * n[0], ty = B.vy - vn * n[1], tz = B.vz - vn * n[2];
          B.vx = tx * f - S.e * vn * n[0]; B.vy = ty * f - S.e * vn * n[1]; B.vz = tz * f - S.e * vn * n[2];
          B.side *= 0.3;
          if (-vn * S.e < 1.1) { B.mode = 'roll'; B.vz = 0; }
        }
      }
    } else if (B.mode === 'roll') {
      const sf = gfSurf(H, B.x, B.y);
      if (sf === 'water' || sf === 'out') { how = sf; break; }
      const S = GF_SURF[sf], n = gfNorm(H, B.x, B.y), gr = sf === 'green', sl = gr ? GFC.GR_SLOPE : 1, gx = -n[0] / n[2] * sl, gy = -n[1] / n[2] * sl;
      const sp = Math.hypot(B.vx, B.vy), slA = GFC.G * 5 / 7 * Math.hypot(gx, gy), fr = gr ? GFC.GR_A0 + GFC.GR_B * sp : S.roll * GFC.G;
      if (sp < (gr ? 0.03 : 0.04) && slA < (gr ? GFC.G * 0.05 : fr * 1.05)) { how = 'rest'; B.vx = B.vy = 0; tr.push([B.x, B.y, gfH(H, B.x, B.y)]); break; }
      let ax = -GFC.G * 5 / 7 * gx, ay = -GFC.G * 5 / 7 * gy;
      if (sp > 1e-4) { const k = Math.min(fr, sp / dt) / sp; ax -= B.vx * k; ay -= B.vy * k; }
      // a slow ball close to the cup is drawn gently in (the cup's edge falls away a little)
      if (gr) { const dx = H.pin[0] - B.x, dy = H.pin[1] - B.y, d = Math.hypot(dx, dy); if (d < 0.35 && d > 1e-3 && sp < 1.2) { const pull = 0.45 * (1 - d / 0.35); ax += dx / d * pull; ay += dy / d * pull; } }
      B.vx += ax * dt; B.vy += ay * dt; B.x += B.vx * dt; B.y += B.vy * dt;
      const g = gfH(H, B.x, B.y);
      // over a lip or a cliff: in the air again
      if (B.z - g > 0.12 + Math.hypot(B.vx, B.vy) * dt * 0.5) { B.mode = 'air'; B.vz = 0; B.lift = 0; } else B.z = g;
      // the cup
      const cd = Math.hypot(B.x - H.pin[0], B.y - H.pin[1]), s2 = Math.hypot(B.vx, B.vy);
      if ((cd < GFC.CUP || (cd < GFC.CUP * 1.3 && s2 < 0.9)) && sf === 'green') {
        if (s2 < 1.35) { how = 'cup'; B.x = H.pin[0]; B.y = H.pin[1]; B.z = g - 0.08; tr.push([B.x, B.y, B.z]); break; }
        if (!B.lip && s2 < 2.4) { B.lip = 1; const side = ((B.x - H.pin[0]) * B.vy - (B.y - H.pin[1]) * B.vx) > 0 ? 1 : -1, r = side * (0.5 + 0.4 * (1 - cd / GFC.CUP)), c = Math.cos(r), s = Math.sin(r); const vx = B.vx * c - B.vy * s, vy = B.vx * s + B.vy * c; B.vx = vx * 0.55; B.vy = vy * 0.55; }
      } else if (cd > GFC.CUP * 2) B.lip = 0;
    }
    if (steps % 2 === 0) tr.push([B.x, B.y, B.z]);
  }
  if (!landed) flew = Math.hypot(B.x - x0, B.y - y0);
  const out = { tr, end: [B.x, B.y], how, flew, surf: how === 'cup' ? 'green' : how === 'rest' ? gfSurf(H, B.x, B.y) : how };
  if (how === 'water' || how === 'out') out.drop = gfDropFrom(H, tr, x0, y0);
  return out;
}
// where to drop after the sea: back along the track from where it went in, to good ground clear of the cliff
function gfDropFrom(H, tr, x0, y0) {
  let j = tr.length - 1;
  while (j > 0 && /water|out/.test(gfSurf(H, tr[j][0], tr[j][1]))) j--;
  for (; j > 0; j--) { const [x, y] = tr[j], s = gfSurf(H, x, y); if (s !== 'water' && s !== 'out' && s !== 'rock' && gfSeaD(H, x, y) > 6 && !gfInCreek(H, x, y) && gfCreekD(H, x, y) > 4) return [x, y]; }
  return [x0, y0];
}
function gfCreekD(H, x, y) { let d = 1e9; for (const P of H.ck) d = Math.min(d, gfPolyD(P, x, y)); return d; }

// ---------- the round ----------
function gfHoleNow() { return GF.H; }
function gfPlayer() { return GF.P[GF.cur]; }
const gfToPin = p => Math.hypot(p.x - GF.H.pin[0], p.y - GF.H.pin[1]);
const gfYds = m => Math.round(m / GF_YD);
const gfFt = m => Math.round(m / 0.3048);
function gfDist(m) { return m < 18 ? gfFt(m) + ' ft' : gfYds(m) + ' yd'; }
function gfScoreName(st, par) {
  if (st === 1) return 'Hole in one!';
  const d = st - par; return d <= -3 ? 'Albatross!' : d === -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Double bogey' : d === 3 ? 'Triple bogey' : '+' + d;
}
function gfToPar(p) { let s = 0; GF.holes.forEach((h, k) => { if (p.sc[k] != null) s += p.sc[k] - GF_RAW[h].par; }); return s; }
const gfParTxt = v => v === 0 ? 'E' : v > 0 ? '+' + v : '−' + -v;
function gfTotal(p) { return p.sc.reduce((a, v) => a + (v || 0), 0); }

// a round begins: who's playing (names, and for online play their ids), the settings, the seed for the wind
function gfStart(o) {
  o = o || {};
  const st = gfStore.get();
  GF.set = { wind: o.wind || st.wind || 'breezy', meter: o.meter || st.meter || 'normal', aid: st.aid !== false };
  GF.holes = o.holes || [0, 1, 2, 3, 4, 5, 6, 7, 8];
  GF.seed = o.seed >>> 0 || ((Math.random() * 4294967295) >>> 0);
  GF.mode = o.net ? 'net' : (o.names && o.names.length > 1 ? 'local' : 'solo');
  GF.net = o.net || null;
  const names = o.names && o.names.length ? o.names : [gfMyName()];
  GF.P = names.map((nm, i) => ({ nm: String(nm || 'Player ' + (i + 1)).slice(0, 16), col: GF_COLS[i % 4], sid: o.sids ? o.sids[i] : null, sc: GF.holes.map(() => null), x: 0, y: 0, lie: 'tee', st: 0, done: false, gone: false }));
  GF.me = o.net ? Math.max(0, GF.P.findIndex(p => p.sid === NET.sid)) : 0;
  GF.on = true; GF.over = false; GF.hi = 0; GF.t = 0;
  GF.full = GF.holes.length === 9 && !o.debug;
  gfEnter();
  if (GF.full && typeof scorePlayed === 'function') scorePlayed('golf');
  gfLoadHole(0);
}
function gfMyName() { const v = ($('gfNick0') && $('gfNick0').value) || (typeof NET !== 'undefined' && NET.nick) || ''; return String(v).replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16) || 'Golfer'; }
function gfLoadHole(k) {
  GF.hi = k; const H = GF.H = gfHoles()[GF.holes[k]];
  const r = gfRng(GF.seed + GF.holes[k] * 977), w = GF_WIND[GF.set.wind] || GF_WIND.breezy, ws = w[0] + r() * (w[1] - w[0]), wa = r() * Math.PI * 2;
  GF.wind = [Math.sin(wa) * ws, Math.cos(wa) * ws];
  for (const p of GF.P) { p.x = 0; p.y = 0; p.lie = 'tee'; p.st = 0; p.done = p.gone; }
  // the honour: the best score on the last hole goes first (as it stood before, if level)
  if (k > 0) { const was = GF.P.slice(); GF.order = GF.order.slice().sort((a, b) => (GF.P[a].sc[k - 1] || 99) - (GF.P[b].sc[k - 1] || 99) || was.indexOf(GF.P[a]) - was.indexOf(GF.P[b])); }
  else GF.order = GF.P.map((_, i) => i);
  if (typeof gf3dHole === 'function') gf3dHole(H);
  GF.shot = null; GF.cam = null;
  gfSay(`Hole ${GF.holes[k] + 1} · ${H.n} · Par ${H.par} · ${H.yd} yards`, 3.2);
  gfNextTurn(true);
}
// whose go it is: on the tee, in the order of the honour; after that, whoever's furthest from the hole
function gfNextTurn(first) {
  const left = GF.order.filter(i => !GF.P[i].done);
  if (!left.length) { gfHoleDone(); return; }
  const tee = left.filter(i => GF.P[i].st === 0);
  GF.cur = tee.length ? tee[0] : left.slice().sort((a, b) => gfToPin(GF.P[b]) - gfToPin(GF.P[a]))[0];
  gfReadyShot();
}
// the player steps up: aim at the pin, the club that fits the distance
function gfReadyShot() {
  const p = gfPlayer(), H = GF.H;
  GF.aim = Math.atan2(H.pin[0] - p.x, H.pin[1] - p.y);
  // a dogleg: off the tee, aim down the fairway's first leg when the pin is out of reach
  const d = gfToPin(p);
  if (p.st === 0 && H.pts.length > 2 && d > 240) { const q = H.pts[1]; GF.aim = Math.atan2(q[0] - p.x, q[1] - p.y); }
  GF.club = gfPickClub(p, d);
  GF.putt = gfPuttScale(d);
  gfAutoPow();
  GF.m = null; GF.ph = 'aim'; GF.view = 'aim'; GF.lookT = 0;
  if (typeof G3 !== 'undefined' && GF.intro <= 0) G3.cp = null;   // (a cut to the new shot, not a swing round through the golfer)
  if (GF.mode === 'net' && typeof gfnTurned === 'function') gfnTurned();
  if (typeof gfHud === 'function') gfHud(true);
}
function gfPickClub(p, d) {
  if (p.lie === 'green' || (p.lie === 'fringe' && d < 12)) return GF_CLUBS.length - 1;
  // the shortest club that gets there at full power (or near enough); if none does, the longest you'd take from here
  const lie = (GF_SURF[p.lie] || GF_SURF.rough).lie, reach = i => GF_CLUBS[i].c * GF_YD * lie * (GF_CLUBS[i].k === 'SW' && p.lie === 'sand' ? 0.86 / 0.62 : 1);
  for (let i = GF_CLUBS.length - 2; i >= 0; i--) { if (GF_CLUBS[i].k === 'D' && p.lie !== 'tee') continue; if (reach(i) >= d * 0.97) return i; }
  // short of the green whatever you take: the longest that doesn't come down in (or run into) the sea or the creek
  let i = p.lie === 'tee' ? 0 : 1; const H = GF.H, sa = Math.sin(GF.aim), ca = Math.cos(GF.aim);
  const wet = i => { for (let f = 0.9; f <= 1.18; f += 0.04) { const m = reach(i) * f, s = gfSurf(H, p.x + sa * m, p.y + ca * m); if (s === 'water' || s === 'out') return true; } return false; };
  while (i < GF_CLUBS.length - 2 && wet(i)) i++;
  return i;
}
function gfPuttScale(d) { const ft = d / 0.3048 * 1.35; for (let i = 0; i < GF_PUTTS.length; i++) if (GF_PUTTS[i] >= ft) return i; return GF_PUTTS.length - 1; }
// may I swing now (whose go it is, and is it on this screen)
function gfMyTurn() { if (!GF.on || GF.over) return false; const p = gfPlayer(); if (!p || p.done) return false; return GF.mode !== 'net' || (p.sid === NET.sid && (typeof gfnTurnOk !== 'function' || gfnTurnOk())); }

// ---------- the swing ----------
// one press: start, set the power, strike
function gfPress() {
  if (GF.ph === 'fly') { if (GF.rep) GF.rep.fast = true; return; }
  if (GF.ph === 'card') { gfCardNext(); return; }
  if (!gfMyTurn() || (GF.ph !== 'aim' && GF.ph !== 'swing')) return;
  if (GF.ph === 'aim') { GF.ph = 'swing'; GF.m = { s: 1, v: 0, p: 0 }; gfSnd('tick'); return; }
  const M = GF.m;
  if (M.s === 1) {
    // inside the green zone is the power you chose exactly; on a putt a miss is softened too
    const pw = GF.pw || 1, z = gfPowZone(), putt = GF_CLUBS[GF.club].putt, ms = gfMeterScale();
    M.p = Math.abs(M.v - pw / ms) <= z ? pw : Math.max(0.03, putt ? pw + (M.v - pw) * 0.6 : M.v * ms); M.s = 2; gfSnd('tick');
  }
  else if (M.s === 2) gfStrike(M.v);
}
// how much power the meter's full sweep stands for: on a short chip it's scaled down so the power you want sits at 70% of the bar, not a quick dab near the bottom
function gfMeterScale() { const pw = GF.pw || 1; return GF_CLUBS[GF.club].putt || pw >= 0.7 ? 1 : Math.max(0.12, pw / 0.7); }
function gfPowZone() { return GF_CLUBS[GF.club].putt ? 0.06 : 0.035; }
function gfMeterTick(dt) {
  const M = GF.m; if (!M || GF.ph !== 'swing') return;
  const sp = GF_METER[GF.set.meter] || GF_METER.normal, pk = GF_CLUBS[GF.club].putt ? 0.7 : 1;   // (the putter's meter runs slower)
  if (M.s === 1) { M.v += dt * sp[0] * pk; if (M.v >= 1.1) { M.v = 1.1; M.p = 1.1 * gfMeterScale(); M.s = 2; } }
  else if (M.s === 2) { M.v -= dt * sp[1] * pk; if (M.v <= -0.15) gfStrike(-0.15); }
}
function gfStrike(acc) {
  const M = GF.m, p = gfPlayer(); M.s = 3;
  const shot = { c: GF.club, a: GF.aim, w: M.p, e: Math.max(-0.15, Math.min(0.15, acc)), pu: GF.putt, x: p.x, y: p.y, k: GF.hi, n: p.st };
  if (GF.mode === 'net' && typeof gfnShot === 'function') gfnShot(shot);
  gfPlayShot(GF.cur, shot);
}
// a shot struck (here, or heard from another screen): worked out, then played back
function gfPlayShot(pi, shot, told) {
  const H = GF.H;
  const R = gfSim(H, shot.x, shot.y, shot.c, shot.a, shot.w, shot.e, GF.wind, shot.pu);
  // (another screen's word for where it ended wins, should the sums differ in the last place)
  if (told && told.end) { R.end = told.end; R.how = told.how; R.drop = told.drop; R.surf = told.surf; }
  GF.cur = pi; GF.club = shot.c; GF.aim = shot.a;
  GF.shot = { pi, shot, R, sx: shot.x, sy: shot.y };
  GF.rep = { i: 0, t: 0, fast: false, end: false };
  GF.ph = 'fly'; GF.view = 'fly'; GF.swingT = 0;
  gfSnd(GF_CLUBS[shot.c].putt ? 'putt' : 'strike', shot.w);
  const E = Math.abs(shot.e);
  if (!GF_CLUBS[shot.c].putt) gfSay(E < 0.012 ? 'Perfect strike' : shot.e > 0.06 ? 'Hooked' : shot.e < -0.06 ? 'Sliced' : shot.e > 0 ? 'Drawn a touch left' : 'Faded a touch right', 1.4);
  if (typeof gfHud === 'function') gfHud(true);
  return R;
}
// the playback: along the track, then the result
function gfReplayTick(dt) {
  const S = GF.shot, Rp = GF.rep; if (!S || !Rp) return;
  const tr = S.R.tr;
  Rp.t += dt * (Rp.fast ? 4 : 1);
  const want = Math.min(tr.length - 1, Math.floor(Rp.t * 60));
  for (let i = Rp.i + 1; i <= want; i++) { const a = tr[i - 1], b = tr[i]; if (a[2] - gfH(GF.H, a[0], a[1]) > 0.3 && b[2] - gfH(GF.H, b[0], b[1]) < 0.05) gfSnd('land', 1, gfSurf(GF.H, b[0], b[1])); }
  Rp.i = want;
  if (Rp.i >= tr.length - 1 && !Rp.end) { Rp.end = true; Rp.doneT = 0; gfShotDone(); }
  if (Rp.end) { Rp.doneT += dt; if (Rp.doneT > (GF.mode === 'net' ? 2.4 : 2.0) && GF.ph === 'result') gfAfterResult(); }
}
function gfBallNow() { const S = GF.shot; if (!S || !GF.rep) return null; const tr = S.R.tr, i = Math.min(tr.length - 1, GF.rep.i), a = tr[i], b = tr[Math.min(tr.length - 1, i + 1)], f = Math.min(1, (GF.rep.t * 60) - i); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
function gfShotDone() {
  const S = GF.shot, p = GF.P[S.pi], R = S.R, H = GF.H;
  p.st++;
  if (R.how === 'cup') {
    p.done = true; p.sc[GF.hi] = p.st; p.x = H.pin[0]; p.y = H.pin[1]; p.lie = 'green';
    const nm = gfScoreName(p.st, H.par);
    gfSay((GF.P.length > 1 ? p.nm + ': ' : '') + nm, 3); gfSnd(p.st - H.par <= -1 ? 'cheer' : 'cup');
  } else if (R.how === 'water' || R.how === 'out') {
    p.st++; p.x = R.drop[0]; p.y = R.drop[1]; p.lie = gfSurf(H, p.x, p.y);
    gfSay(R.how === 'water' ? (gfInCreek(H, R.end[0], R.end[1]) ? 'In the creek. One stroke penalty, and a drop.' : 'Into the sea. One stroke penalty, and a drop.') : 'Out of bounds. One stroke penalty, and a drop.', 3);
    if (R.how === 'water') gfSnd('splash');
  } else {
    p.x = R.end[0]; p.y = R.end[1]; p.lie = R.surf;
    const d = gfToPin(p), pu = GF_CLUBS[S.shot.c].putt;
    gfSay(pu ? (d < 1.2 ? 'Close. ' + gfFt(d) + ' ft left' : gfDist(d) + ' left') : `${GF_SURF[p.lie].n} · ${gfYds(R.flew)} yd carry · ${gfDist(d)} to the pin`, 2.6);
  }
  if (!p.done && p.st >= GFC.MAXS) { p.done = true; p.sc[GF.hi] = GFC.MAXS; gfSay(`${GF.P.length > 1 ? p.nm + ' picks' : 'Picked'} up at ${GFC.MAXS}.`, 2.6); }
  GF.ph = 'result';
  if (typeof gfHud === 'function') gfHud(true);
}
// the next go (on a shared round, the host's word says whose: src/golfnet.js)
function gfAfterResult() {
  GF.shot = null; GF.rep = null;
  if (GF.mode === 'net' && typeof gfnAfter === 'function' && gfnAfter()) return;
  gfNextTurn();
}
function gfHoleDone() {
  const k = GF.hi, H = GF.H;
  for (const p of GF.P) if (p.sc[k] == null) p.sc[k] = p.gone ? null : Math.min(GFC.MAXS, p.st || GFC.MAXS);
  gfReportBoard(false);
  GF.ph = 'card'; GF.cardT = 0; GF.view = 'card';
  if (k >= GF.holes.length - 1) { GF.over = true; gfRoundDone(); }
  if (typeof gfCardShow === 'function') gfCardShow(true);
}
function gfCardNext() {
  if (GF.mode === 'net' && typeof gfnCardNext === 'function' && gfnCardNext()) return;
  if (GF.over) return;
  $('gfCard').hidden = true;
  gfLoadHole(GF.hi + 1);
}
// the scoreboard and your own bests
function gfReportBoard(done) {
  if (!GF.full || typeof scoreRun !== 'function') return;
  const p = GF.P[GF.me]; if (!p) return;
  const holes = p.sc.filter(v => v != null).length, birdies = p.sc.filter((v, k) => v != null && v < GF_RAW[GF.holes[k]].par).length;
  const s = done ? Math.max(1, 200 - gfToPar(p)) : 0;
  scoreRun('golf', s, holes, birdies, done);
  if (done && typeof scoreReport === 'function') scoreReport('golf', s, holes, birdies, true);
}
function gfRoundDone() {
  gfReportBoard(true);
  if (typeof scoreRunEnd === 'function' && GF.full) scoreRunEnd('golf');
  const p = GF.P[GF.me]; if (!p || !GF.full) return;
  const st = gfStore.get(), tot = gfTotal(p); st.rounds = (st.rounds | 0) + 1;
  if (!st.best || tot < st.best) { st.best = tot; st.newBest = 1; } else st.newBest = 0;
  st.hb = st.hb || []; GF.holes.forEach((h, k) => { const v = p.sc[k]; if (v != null && (!st.hb[h] || v < st.hb[h])) st.hb[h] = v; });
  gfStore.set(Object.assign(gfStore.get(), { rounds: st.rounds, best: st.best, newBest: st.newBest, hb: st.hb }));
}
function gfQuit() {
  if (!GF.on) return;
  if (GF.full && !GF.over) { gfReportBoard(false); if (typeof scoreRunEnd === 'function') scoreRunEnd('golf'); }
  if (GF.mode === 'net' && typeof gfnStop === 'function') gfnStop();
  GF.on = false; GF.ph = 'off';
  gfExit();
}

// ---------- the screen, the keys and the camera ----------
function gfEnter() {
  try { audioInit(); } catch (e) {}
  if (typeof gf3dInit === 'function' && !gf3dInit()) { if (typeof toast === 'function') toast('Skerry Links needs WebGL, which this browser has turned off.', 'No 3D'); }
  state = 'golf'; paused = false;
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('gfUI').hidden = false; $('gfPause').hidden = true; $('gfCard').hidden = true;
  document.body.classList.add('gfon');
  gfAmbience(true);
}
function gfExit() {
  $('gfUI').hidden = true; document.body.classList.remove('gfon');
  gfAmbience(false);
  state = 'title'; toTitle();
  if (typeof gfnBackToLobby === 'function') gfnBackToLobby();
  setTimeout(() => { const c = $('gfTitle'); if (c) c.scrollIntoView({ block: 'start' }); gfCardRender(); }, 60);
}
function gfSay(t, s) { GF.msg = t; GF.msgT = s || 2.5; const el = $('gfMsg'); if (el) { el.textContent = t; el.classList.add('on'); } }
// every frame while a round's on (src/main.js)
function gfFrame(dt) {
  GF.t += dt;
  gfPadPoll(dt);
  if (!$('gfPause').hidden) { if (typeof gf3dDraw === 'function') gf3dDraw(dt); return; }
  if (GF.ph === 'aim' && gfMyTurn()) {
    const k = GF.keys, rs = (k.fine ? 0.16 : 0.55) * (GF_CLUBS[GF.club].putt ? 0.5 : 1);
    if (k.l) GF.aim -= rs * dt; if (k.r) GF.aim += rs * dt;
    if (GF.padAx) GF.aim += GF.padAx * rs * dt;
  }
  gfMeterTick(dt);
  if (GF.ph === 'fly' || GF.ph === 'result') gfReplayTick(dt);
  if (GF.ph === 'card') GF.cardT += dt;
  if (GF.msgT > 0) { GF.msgT -= dt; if (GF.msgT <= 0) { const el = $('gfMsg'); if (el) el.classList.remove('on'); } }
  if (GF.mode === 'net' && typeof gfnTick === 'function') gfnTick(dt);
  if (typeof gf3dDraw === 'function') gf3dDraw(dt);
  if (typeof gfHud === 'function') gfHud(false);
}
// the power you mean to hit with (the green zone on the meter, and where the ring and the map's mark sit): to start
// with, what the distance to the pin calls for with this club; then wherever you drag the power bar (or Z and X)
function gfCarryNow() { const p = gfPlayer(), club = GF_CLUBS[GF.club]; if (club.putt) return GF_PUTTS[GF.putt] * 0.3048; return club.c * GF_YD * (GF_SURF[p.lie] || GF_SURF.rough).lie * (club.k === 'D' && p.lie !== 'tee' ? 0.9 : 1); }
function gfAutoPow() { const p = gfPlayer(); if (!p) return; GF.pw = Math.max(0.05, Math.min(1, gfToPin(p) / gfCarryNow())); gfPowUi(); }
function gfSetPow(v) { if (GF.ph !== 'aim' || !gfMyTurn()) return; GF.pw = Math.max(0.05, Math.min(1, v)); gfPowUi(); }
function gfPowUi() { const s = $('gfPow'); if (s && document.activeElement !== s) s.value = String(Math.round(GF.pw * 100)); const o = $('gfPowOut'); if (o) { const c = GF_CLUBS[GF.club], L = gfCarryNow() * GF.pw; o.textContent = `${Math.round(GF.pw * 100)}% · ${c.putt ? Math.round(L / 0.3048) + ' ft' : Math.round(L / GF_YD) + ' yd'}`; } }
function gfClub(d) {
  if (GF.ph !== 'aim' || !gfMyTurn()) return;
  GF.club = Math.max(0, Math.min(GF_CLUBS.length - 1, GF.club + d));
  if (GF_CLUBS[GF.club].putt) GF.putt = gfPuttScale(gfToPin(gfPlayer()));
  gfAutoPow(); gfSnd('tick'); gfHud(true);
}
function gfPuttStep(d) { if (GF.ph !== 'aim' || !gfMyTurn() || !GF_CLUBS[GF.club].putt) return; GF.putt = Math.max(0, Math.min(GF_PUTTS.length - 1, GF.putt + d)); gfAutoPow(); gfHud(true); }
function gfPauseOpen(on) {
  if (!GF.on) return;
  $('gfPause').hidden = !on;
  if (on) { setTimeout(() => $('gfResume').focus({ preventScroll: true }), 30); }
}
function gfKey(e, down) {
  if (state !== 'golf') return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Escape') return;
  const k = e.key, K = GF.keys;
  if (k === 'Escape') { if (down) { e.preventDefault(); if (!$('gfCard').hidden && GF.ph !== 'card') gfCardShow(false, true); else gfPauseOpen($('gfPause').hidden); } e.stopImmediatePropagation(); return; }
  if (!$('gfPause').hidden) return;
  e.stopImmediatePropagation();
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { K.l = down; e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { K.r = down; e.preventDefault(); }
  else if (k === 'Shift') K.fine = down;
  else if (!down) return;
  else if (e.repeat) { if (k === ' ') e.preventDefault(); return; }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); gfClub(-1); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); gfClub(1); }
  else if (k === 'z' || k === 'Z') gfSetPow(GF.pw - 0.05);
  else if (k === 'x' || k === 'X') gfSetPow(GF.pw + 0.05);
  else if (k === 'q' || k === 'Q') gfPuttStep(-1);
  else if (k === 'e' || k === 'E') gfPuttStep(1);
  else if (k === ' ' || k === 'Enter') { e.preventDefault(); if (!$('gfCard').hidden && GF.over) return; gfPress(); }
  else if (k === 'Tab') { e.preventDefault(); gfCardShow($('gfCard').hidden, true); }
  else if (k === 'm' || k === 'M' || k === 'v' || k === 'V') gfLook();
  else if (k === 'h' || k === 'H') gfHeat();
}
// the view from above the hole, and back
// on or by the green, so the slopes (and the Slope heat map, if it's on) are worth showing
function gfOnGreen() { const p = gfPlayer(), club = GF_CLUBS[GF.club]; return !!(GF.H && p && !p.done && (p.lie === 'green' || p.lie === 'fringe' || (club.putt && gfToPin(p) < 30)) && GF.ph !== 'card'); }
function gfHeat() { GF.heat = !GF.heat; const st = gfStore.get(); st.heat = GF.heat; gfStore.set(st); gfSnd('tick'); gfHud(true); }
function gfLook() { if (GF.ph !== 'aim') return; GF.view = GF.view === 'look' ? 'aim' : 'look'; }
addEventListener('keydown', e => gfKey(e, true), true);
addEventListener('keyup', e => gfKey(e, false), true);
// a controller: the stick or the D-pad aims (left, right) and picks the club (up, down), A swings, X the view from
// above, Y the scorecard, LB and RB the putter's scale, Back the Slope heat map, Start the menu
function gfPadPoll(dt) {
  const p = typeof firstPad === 'function' ? firstPad() : null; if (!p) { GF.padAx = 0; return; }
  const now = p.buttons.map(b => b.pressed), prev = GF.padPrev || [], down = i => now[i] && !prev[i]; GF.padPrev = now;
  const ax = Math.abs(p.axes[0] || 0) > 0.18 ? p.axes[0] : 0;
  if (!$('gfPause').hidden) { if (down(1) || down(9)) gfPauseOpen(false); if (down(0) && document.activeElement && document.activeElement.click) document.activeElement.click(); return; }
  GF.padAx = ax + (now[15] ? 1 : 0) - (now[14] ? 1 : 0);
  const ay = p.axes[1] || 0; GF.padY = GF.padY || 0;
  if (Math.abs(ay) > 0.6 && Math.abs(GF.padY) <= 0.6) gfClub(ay > 0 ? 1 : -1); GF.padY = ay;
  if (down(12)) gfClub(-1); if (down(13)) gfClub(1);
  if (down(4)) gfPuttStep(-1); if (down(5)) gfPuttStep(1);
  const lt = p.buttons[6] ? p.buttons[6].value : 0, rt = p.buttons[7] ? p.buttons[7].value : 0; if (lt > 0.2 || rt > 0.2) gfSetPow(GF.pw + (rt - lt) * dt * 0.6);
  if (down(0)) { if (!$('gfCard').hidden && GF.over) $('gfCardMenu').click(); else gfPress(); }
  if (down(2)) gfLook(); if (down(8)) gfHeat();
  if (down(3)) gfCardShow($('gfCard').hidden, true);
  if (down(9)) gfPauseOpen(true);
  if (down(1) && !$('gfCard').hidden && !GF.over) gfCardShow(false, true);
}

// ---------- the sounds (Web Audio, src/audio.js; they follow the volume) ----------
function gfSnd(k, v, surf) {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  try {
    if (k === 'tick') tone(1500, 'square', 0.001, 0.03, 0.02);
    else if (k === 'strike') { const w = Math.min(1, v || 1); noise('bandpass', 2600, 1.4, 0.001, 0.32 * w + 0.08, 0.08); tone(220, 'triangle', 0.001, 0.22 * w, 0.09, { to: 110 }); noise('bandpass', 700, 0.8, 0.02, 0.06 * w, 0.6, { delay: 0.05, to: 2000 }); }
    else if (k === 'putt') { tone(1100, 'sine', 0.001, 0.12, 0.05); noise('highpass', 3000, 1, 0.001, 0.05, 0.03); }
    else if (k === 'land') { if (surf === 'sand') noise('lowpass', 900, 0.6, 0.005, 0.12, 0.25); else if (surf === 'green' || surf === 'fringe') tone(420, 'sine', 0.002, 0.07, 0.07); else noise('lowpass', 500, 0.7, 0.003, 0.09, 0.12); }
    else if (k === 'cup') { [0, 0.07, 0.15].forEach((d, i) => tone(1300 - i * 180, 'triangle', 0.001, 0.09, 0.05, { delay: d })); sfxChime(); }
    else if (k === 'cheer') { gfSnd('cup'); for (let i = 0; i < 9; i++) noise('bandpass', 1400 + Math.random() * 1600, 0.9, 0.05, 0.05 + Math.random() * 0.04, 0.5 + Math.random() * 0.6, { delay: 0.3 + i * 0.12 }); }
    else if (k === 'splash') { if (typeof sfxSplash === 'function') sfxSplash(); else noise('lowpass', 1200, 0.7, 0.01, 0.25, 0.6); }
  } catch (e) {}
}
// the sea below the cliffs and the wind in the grass, while a round's on
function gfAmbience(on) {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  const c = AUD.ctx;
  if (on && !GF.amb) {
    try {
      const s = c.createBufferSource(); s.buffer = AUD.brown; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.09, c.currentTime, 1.2);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.05; lfo.connect(lg).connect(g.gain); lfo.start();
      s.connect(f).connect(g).connect(AUD.master); s.start();
      GF.amb = { s, g, lfo };
    } catch (e) {}
  } else if (!on && GF.amb) { const A = GF.amb; GF.amb = null; try { A.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3); setTimeout(() => { try { A.s.stop(); A.lfo.stop(); } catch (e) {} }, 1200); } catch (e) {} }
}

// ---------- the card on the title screen ----------
function gfCardRender() {
  const st = gfStore.get(), el = $('gfBest'); if (!el) return;
  el.textContent = st.best ? `Your best round: ${st.best} (${gfParTxt(st.best - GF_PAR)}) · rounds played: ${st.rounds | 0}` : 'No round played yet. Par for the nine is 36.';
  gfBoardRender();
}
// the course's own leaderboard on its card: the board's top five rounds (src/scores.js)
function gfBoardRender() {
  const ol = $('gfLeaders'); if (!ol || typeof BOARD === 'undefined') return;
  const rows = ((BOARD.data && BOARD.data.golf) || []).filter(e => e.s > 0).slice(0, 5);
  ol.textContent = '';
  if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = BOARD.data ? 'No rounds on the board yet. Be the first.' : (BOARD.err || 'Reading the board…'); ol.append(li); return; }
  rows.forEach((e, k) => {
    const li = document.createElement('li'); if (e.me) li.className = 'me';
    const tp = 200 - e.s, a = document.createElement('span'); a.className = 'rk'; a.textContent = String(k + 1);
    const n = document.createElement('span'); n.className = 'nm'; n.textContent = e.n + (e.me ? ' (you)' : '');
    const s = document.createElement('span'); s.className = 'sc'; s.textContent = `${GF_PAR + tp} (${gfParTxt(tp)})`;
    li.append(a, n, s); ol.append(li);
  });
}
// how many on this screen, and their names
function gfLocalRows() {
  const n = +($('gfPlayers').value || 1), box = $('gfNames'); if (!box) return;
  for (let i = 0; i < 4; i++) { const r = $('gfNameRow' + i); if (r) r.hidden = i >= n; }
  const st = gfStore.get(); st.n = n; gfStore.set(st);
}
function gfPlayLocal() {
  if (typeof GFN !== 'undefined' && GFN.code) { if (typeof gfnLeave === 'function') gfnLeave(); }
  const n = +($('gfPlayers').value || 1), names = [];
  for (let i = 0; i < n; i++) { const v = ($('gfNick' + i) && $('gfNick' + i).value || '').replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16); names.push(v || (i === 0 ? gfMyName() : 'Player ' + (i + 1))); }
  const o = gfOptions(); gfStart({ names, wind: o.wind, meter: o.meter, holes: o.holes });
}
function gfOptions() {
  const wind = $('gfWindSel').value, meter = $('gfMeterSel').value, hs = $('gfHolesSel').value;
  const st = gfStore.get(); st.wind = wind; st.meter = meter; st.holes = hs; const names = []; for (let i = 1; i < 4; i++) names.push(($('gfNick' + i) || {}).value || ''); st.names = names; gfStore.set(st);
  const holes = hs === 'f3' ? [0, 1, 2] : hs === 'm3' ? [3, 4, 5] : hs === 'b3' ? [6, 7, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return { wind, meter, holes, hs };
}
// tests: straight onto a hole, alone; and a shot struck as if by the meter
function gfDebug(h) { gfStart({ names: [gfMyName()], holes: [h | 0], debug: true }); }
function gfDebugShot(club, power, acc, aim) { if (GF.ph !== 'aim') return null; if (club != null) GF.club = club; if (aim != null) GF.aim = aim; GF.ph = 'swing'; GF.m = { s: 2, v: 0, p: power == null ? 1 : power }; gfStrike(acc || 0); return GF.shot && GF.shot.R; }

(function gfInit() {
  if (!$('gfTitle')) return;
  const st = gfStore.get();
  if (st.wind && GF_WIND[st.wind]) $('gfWindSel').value = st.wind;
  if (st.meter && GF_METER[st.meter]) $('gfMeterSel').value = st.meter;
  if (st.holes) $('gfHolesSel').value = st.holes;
  if (st.n) $('gfPlayers').value = String(st.n);
  if (Array.isArray(st.names)) st.names.forEach((v, i) => { const b = $('gfNick' + (i + 1)); if (b && v) b.value = String(v).slice(0, 16); });
  gfLocalRows();
  $('gfPlayers').addEventListener('change', gfLocalRows);
  for (const id of ['gfWindSel', 'gfMeterSel', 'gfHolesSel']) $(id).addEventListener('change', gfOptions);
  $('gfPlay').addEventListener('click', gfPlayLocal);
  $('gfSettings').addEventListener('click', () => $('titleSettings').click());
  if ($('gfBanner')) $('gfBanner').addEventListener('click', () => { $('gfTitle').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('gfPlay').focus({ preventScroll: true }), 400); });
  $('gfResume').addEventListener('click', () => gfPauseOpen(false));
  $('gfPauseCard').addEventListener('click', () => { gfPauseOpen(false); gfCardShow(true, true); });
  $('gfLeave').addEventListener('click', gfQuit);
  $('gfMenuBtn').addEventListener('click', () => gfPauseOpen(true));
  $('gfCardNext').addEventListener('click', () => { if (GF.ph === 'card') gfCardNext(); else gfCardShow(false, true); });
  $('gfCardMenu').addEventListener('click', gfQuit);
  $('gfCardAgain').addEventListener('click', () => { if (GF.mode === 'net') return; const names = GF.P.map(p => p.nm), holes = GF.holes.slice(); GF.on = false; gfStart({ names, holes, wind: GF.set.wind, meter: GF.set.meter }); });
  // the buttons on a touch screen (held: aim; tapped: the rest)
  const hold = (id, key) => { const b = $(id); const on = e => { e.preventDefault(); GF.keys[key] = true; }, off = () => { GF.keys[key] = false; }; b.addEventListener('pointerdown', on); for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, off); };
  hold('gfAimL', 'l'); hold('gfAimR', 'r');
  $('gfClubUp').addEventListener('click', () => gfClub(-1)); $('gfClubDn').addEventListener('click', () => gfClub(1));
  $('gfPuttDn').addEventListener('click', () => gfPuttStep(-1)); $('gfPuttUp').addEventListener('click', () => gfPuttStep(1));
  $('gfSwing').addEventListener('pointerdown', e => { e.preventDefault(); gfPress(); });
  $('gfLookBtn').addEventListener('click', gfLook);
  $('gfHeatBtn').addEventListener('click', gfHeat); GF.heat = !!st.heat;
  $('gfPow').addEventListener('input', () => gfSetPow(+$('gfPow').value / 100));
  for (const t of ['pointerdown', 'keydown']) $('gfPow').addEventListener(t, e => e.stopPropagation());
  $('gfCardBtn').addEventListener('click', () => gfCardShow($('gfCard').hidden, true));
  // a tap on the 3D view swings too (the meter's below it)
  $('gfCv').addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; gfPress(); });
  addEventListener('resize', () => { if (GF.on && typeof gf3dResize === 'function') gf3dResize(); });
  gfCardRender();
})();
