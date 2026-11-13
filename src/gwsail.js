// The Gannet's Wake, Part I: The Skerries (RAID_STAGES.gwsail). The original Skerry Light, played from a deck together.
//
// You all start aboard the keeper's cutter at the foot of the Light, and the deck is the map: you walk it, fight on it,
// and the sea moves past. The cutter herself sails just as the Brig does in Skerry Light (src/game.js update: the same
// rudder, the same sail that keeps climbing the longer it's made, the same answer to it, the Brig's own accel and turn,
// and no top speed at all: nothing here ever slows her but what slows a ship at sea, a rock).
//  - The helm. Use at the wheel to take it. While you hold the helm your move keys (and the stick) steer her and make
//    or shorten sail, the way they do in Skerry Light, and you stand at the wheel instead of walking; Use again to let
//    go (or go down, and it's let go for you). Let go, she holds her course and her speed. Anyone can take over.
//  - The beam. The Light behind you sweeps round every GW.PERIOD seconds (one clock for every part: src/gannet.js).
//    The rocks only show while the beam is on them, and fade over SK.SEEN_FADE seconds after (and a little, close by,
//    in the deck lantern's light). Hit one head-on and it costs a plank and stoves a hole in the deck; a glancing touch
//    only scrapes, as at sea.
//  - Holes and flooding. Every hole lets the sea in (the flood bar). Hold Use at one to patch it, and the plank's back.
//    With nothing open the pumps take the water back out. A full bar and she goes down: the raid is lost, all of you.
//    The holes never slow her.
//  - Maren stands on the water behind, one stage nearer each turn of the beam (SK.MAREN_STAGES), with her tells: a swell
//    from her side and the lantern guttering a moment before she steps, her whisper the first time you see her at each
//    stage, oars in the rowlocks when she's close and out of sight, and now and then the shape of her on the bowsprit
//    as the beam goes over. One more step past the last and she's aboard: she puts down whoever is nearest the stern,
//    and goes back out to the first stage.
//  - The ship's bell, on the mast (Use; GWS.BELL_CD to swing again): drives her back three stages, and sinks the drowned
//    who are still in the water alongside.
//  - Plimsoll walks ahead through the deep water, as he does in Skerry Light, on the one channel through the rocks.
//    Keep the cutter inside his ring (a faint blue shimmer on the sea round him) and Maren holds where she is.
//  - Flares. The flare locker at the stern (Use; GWS.FLARE_CD to reload) fires a flare that lights every rock within
//    350 m for 7 seconds, for everyone.
//  - The drowned climb over the rails all the way out, more as you go: up out of the sea alongside and in over the
//    rail at the low places along it (sea windows: src/zombies.js's own ladder climb).
//  - About 1.6 km out, a ring of the Gannet's old spars stands out of the water. Hold her inside it while the Gannet
//    comes up out of the sea alongside, her bell ringing; then everyone climbs her side (Use at her boarding ladder),
//    and once you're all aboard (or a little after the first of you) it's on to Part II.
//
// How it's done. The deck is fixed in the island's frame at its middle (the island itself has no ground here:
// FPS_ISLES.gwsail.noGround), raised GWS.D over the ground with the rails as solids along the hull's edge and the deck
// edge closed by block(). The bow is +y (local v), starboard +x (local u). The cutter has her own pose on a sea of her
// own: the sailing game's own frame, the Light at its origin and the open sea to the north (GWS.B: x, y, h, v, sail,
// rudder). Everything out there (the rocks, Plimsoll, Maren, the mark, flares, the wake, even the sailing game's own
// coast and lighthouse, GL3D.coast, and the sea's waves and the beam on the water through a small hook in src/gl3d.js)
// is drawn in a group placed by the inverse of her pose, so the sea goes past and turns round the deck as she sails
// and steers; the stars turn with it (GFX.skyTurn, src/gfx.js skyPos).
// Together it's host-authoritative: the host (or you alone) runs her pose and her collisions, the rocks she hits, the
// holes, the flood, Maren, Plimsoll, the bell's and the flare's clocks and the drowned, and sends them in the stage's
// word (pack: g* keys). A joined player at the helm sends the host what their keys say (raidAsk 'st', whenever it
// changes and once a second besides), and sails her on their own side meanwhile, eased towards the host's word, so
// the steering answers at once; everyone else's side runs the host's pose on between its words.
// Hooks in shared files, each marked [gannet]: src/fps.js (at the helm the move keys steer: gwsHelm; the sea's sound
// out here), src/gl3d.js (the sea in the cutter's frame: gwsGL, and its shader's frame uniforms), src/gfx.js (the stars
// turn with her: GFX.skyTurn), src/fpsisle.js (no ground under the deck: T.noGround).
// [fogrun] Fog Run's sailing legs (src/frsail.js) are this same stage with a few things changed, through GWS_LEG (below):
// where she sets out from and the island she's to beach on, the rocks from the run's seed, the fog, and no Maren or
// Plimsoll. Her sailing is never touched: her top speed and how quick she gathers way are the Brig's, always.
// [fbsea] Freebooters' Sea's open sea (src/fbsail.js) is this stage again through GWS_LEG, with a few more of its
// say (all optional, below): a sea of its own laid out already (sea), islands she runs aground on without harm
// (sea.shore), her pose and holes put back as they were (enter), what happens when she sinks (sunk), how hard the
// drowned come (prog, spawnOk), the line in the ship's panel (row), a label on the strip's mark (markLab), and a
// brighter night (amb). Her sailing is still never touched.

const GWS = {
  D: 1.3, HB: 3.3, STERN: -11, BOW: 11.4, SPRIT: 15.6,   // (the deck's height over the ground; her half beam, stern, stem and bowsprit's end)
  MAST: [0, 3.2], MAST_H: 13.5, WHEEL: [0, -8.2], STAND: [0, -9.2], LOCKER: [2.0, -10.1], BELL: [0, 3.62],
  START: [30, 62], H0: 0.05, SAIL0: 0.36,                  // (where she sets out from, the Light's foot; her sail to begin with)
  MARK: [-150, 1680], MARK_R: 32, MARK_IN: 70, RISE: 14,   // (the Gannet's mark: its spars' ring, the ring to hold her in while she rises)
  BOARD_T: 25, LADDER: [-3.05, 0.6], BEACH: 2.6,            // ([fogrun] BEACH: run up on an island's beach, this long before you're ashore)                       // (after the first of you is aboard, the rest have this long)
  PLANKS: 4, FLOOD: 1 / 42, PUMP: 1 / 55, PATCH: 2.2, SINK: 3.2,
  BELL_CD: 16, BELL_PUSH: 3, BELL_SINK: 26, FLARE_CD: 35, FLARE_T: 7, FLARE_R: 350,
  LANT_R: 26, SPEC: 1.2,                                   // (how far the deck lantern shows a rock, dimly)
  ROCKS: 150, IMPACT: 5,
};
// [fogrun] A leg of Fog Run's (src/frsail.js), or null for the Gannet's Wake. Set as the leg is laid out, before anything
// of the sea is made, and dropped when it's left. Its say: start [x, y] and h0 (where she sets out from, and her heading),
// mark [x, y] (the island she's to beach on, isleR across; markIn: how near counts as there), seed and rocks (the rocks,
// from the run's seed, that many, along the way), fog (m: a rock shows inside it, as well as in the beam or a flare),
// maren and plim (false: neither of them out there), line(S, dm) (the HUD's line), landSay, arrive() (hosting or
// alone: once she's run up on the beach), b3(SG, GW3) and f3(dt, V) (the island's own 3D, in the sea's group).
// [fbsea] and: sea (its own sea, as gwsSea makes one, laid out already; sea.shore: [{ x, y, r }] land she runs up
// against and is pushed off, never holed), enter(S) (after her state is made fresh: put back her pose, holes and
// flood), sunk() (hosting or alone: she's gone down, in place of the end of the raid), prog() (0 to 1: how hard the
// drowned come over the rail), spawnOk() (false: none come just now), row() ([label, value, colour]: the panel's
// fourth line), markLab() (the strip's label under the mark, in place of its distance), amb ([ambient, moon]).
var GWS_LEG = null;
const gwsMark = () => GWS_LEG ? GWS_LEG.mark : GWS.MARK;
const gwsMaren = () => !GWS_LEG || !!GWS_LEG.maren;
const gwsPlim = () => !GWS_LEG || !!GWS_LEG.plim;
// where a hole can open in her deck (local u, v)
const GWS_HOLES = [[-1.7, 7.2], [1.5, 5.6], [-2.0, 1.2], [1.9, -0.6], [-1.6, -3.9], [1.7, -5.3], [0.9, 8.9], [-1.2, -6.7]];
// the low places along her rails where the drowned come in over the side: [u, v, nx, ny] (outward)
const GWS_WIN = (() => {
  const w = [];
  for (const v of [-7.5, -4, -0.5, 3, 6.4]) for (const s of [-1, 1]) w.push([s * (gwsHw(v) - 0.05), v, s, 0]);
  for (const u of [-1.3, 1.3]) w.push([u, GWS.STERN + 0.05, 0, -1]);
  return w;
})();
// her half width at v along her (local), from the transom to the stem
function gwsHw(v) {
  if (v > 2) return GWS.HB * Math.sqrt(Math.max(0, 1 - Math.pow((v - 2) / (GWS.BOW - 2), 2)));
  return GWS.HB - Math.max(0, -v - 5) * 0.07;
}
const gwsW = (u, v) => [FPSC.CX + u, FPSC.CY + v];
const gwsL = (x, y) => [x - FPSC.CX, y - FPSC.CY];
const gwsOn = () => RAID.on && !!(raidStage() || {}).gws && !!RAID.st.B;   // [fogrun] (this stage, or one made from it: S.gws)
const gwsNick = sid => sid === FPS.me.id ? 'You' : ((ZM.hum || []).find(h => h[0] === sid) || [])[1] || 'Someone';
// the Brig's own numbers (src/crates.js BOATS): the cutter is never slower than she is
const gwsBrig = () => (typeof BOAT_BY_ID !== 'undefined' && BOAT_BY_ID.brig) || { accel: 1.3, turn: 1.2, top: 1 };

// ---------- the sea: its rocks, Plimsoll's channel, the mark (the same on every side, from the seed) ----------
function gwsSea() {
  if (GWS_LEG) return gwsLegSea(GWS_LEG);   // [fogrun]
  const R = seeded(0x6a77e + 977), rnd = (a, b) => a + R() * (b - a);
  const [sx, sy] = GWS.START, [mx, my] = GWS.MARK, rocks = [];
  const ok = (x, y, r) => y > 120 && Math.hypot(x - sx, y - sy) > 90 && Math.hypot(x - mx, y - my) > GWS.MARK_R + r + 30 && !rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 26);
  const add = (x, y, r) => { const prof = []; for (let i = 0; i < 7; i++) prof.push(rnd(0.35, 1)); prof[0] = rnd(0.15, 0.45); prof[6] = rnd(0.15, 0.45); rocks.push({ x, y, r, prof, ph: rnd(0, 6.28), seen: -99, lit: 0, i: rocks.length }); };
  // thick along the way out, thicker the further out (the skerries close in round the mark), and plenty off it
  const along = (t, j) => [sx + (mx - sx) * t + rnd(-j, j), sy + (my - sy) * t + rnd(-j, j)];
  for (let n = 0; n < 9000 && rocks.length < GWS.ROCKS * 0.55; n++) { const t = Math.sqrt(rnd(0.01, 1)), [x, y] = along(t, 110 + 60 * t), r = rnd(5, 15); if (ok(x, y, r)) add(x, y, r); }
  for (let n = 0; n < 9000 && rocks.length < GWS.ROCKS; n++) { const x = rnd(-700, 700), y = rnd(150, 2100), r = rnd(5, 17); if (ok(x, y, r)) add(x, y, r); }
  // round the mark itself, a ring of reef
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + rnd(-0.2, 0.2), d = GWS.MARK_IN + 24 + rnd(0, 30), x = mx + Math.sin(a) * d, y = my + Math.cos(a) * d, r = rnd(5, 10); if (a > 2.6 && a < 3.7) continue; if (!rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 18)) add(x, y, r); }
  let path = typeof findPath === 'function' ? findPath(sx, sy + 20, mx, my, rocks) : null;
  if (!path || !path.length) path = [{ x: sx, y: sy + 20 }, { x: mx, y: my }];
  path = path.map(p => ({ x: p.x, y: p.y }));
  // (laid off every dozen metres or so, so he walks it a step at a time and can start just ahead of her)
  { const out = [path[0]]; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12)); for (let j = 1; j <= n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n }); } path = out; }
  // the mark's spars: a ring of them, leaning, broken off at all heights
  const spars = [];
  for (let i = 0; i < 15; i++) { const a = i / 15 * 6.283 + rnd(-0.12, 0.12), d = GWS.MARK_R + rnd(-4, 4); spars.push({ x: mx + Math.sin(a) * d, y: my + Math.cos(a) * d, h: rnd(3, 12), r: rnd(0.18, 0.42), lx: rnd(-0.35, 0.35), ly: rnd(-0.35, 0.35), yard: R() < 0.4, ph: rnd(0, 6.28) }); }
  return { rocks, path, spars, len: Math.hypot(mx - sx, my - sy) };
}
// [fogrun] a leg's sea: rocks thick along the way from where she sets out to the island and thinner off it, none close
// round either end; no spars, and the way straight there (nobody walks it)
function gwsLegSea(L) {
  const R = seeded(L.seed), rnd = (a, b) => a + R() * (b - a), [sx, sy] = L.start, [mx, my] = L.mark, rocks = [];
  const len = Math.hypot(mx - sx, my - sy), ux = (mx - sx) / len, uy = (my - sy) / len;
  const ok = (x, y, r) => y > 110 && Math.hypot(x - sx, y - sy) > 60 + r && Math.hypot(x - mx, y - my) > L.isleR + r + 30 && !rocks.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 20);
  const add = (x, y, r) => { const prof = []; for (let i = 0; i < 7; i++) prof.push(rnd(0.35, 1)); prof[0] = rnd(0.15, 0.45); prof[6] = rnd(0.15, 0.45); rocks.push({ x, y, r, prof, ph: rnd(0, 6.28), seen: -99, lit: 0, i: rocks.length }); };
  const at = (t, side) => [sx + ux * len * t - uy * side, sy + uy * len * t + ux * side];
  for (let n = 0; n < 6000 && rocks.length < L.rocks * 0.6; n++) { const [x, y] = at(rnd(0.05, 1.05), rnd(-70, 70)), r = rnd(4, 12); if (ok(x, y, r)) add(x, y, r); }
  for (let n = 0; n < 6000 && rocks.length < L.rocks; n++) { const [x, y] = at(rnd(-0.15, 1.3), rnd(-300, 300)), r = rnd(5, 16); if (ok(x, y, r)) add(x, y, r); }
  const path = []; for (let i = 0; i <= Math.ceil(len / 12); i++) { const t = i / Math.ceil(len / 12); path.push({ x: sx + (mx - sx) * t, y: sy + (my - sy) * t }); }
  return { rocks, path, spars: [], len };
}
let GWS_SEA = null;
const gwsSeaOf = () => GWS_LEG ? GWS_LEG.sea || (GWS_LEG.sea = gwsSea()) : GWS_SEA || (GWS_SEA = gwsSea());   // [fogrun] (each leg its own)

// ---------- her sailing (the Brig's, src/game.js update) ----------
function gwsBoat(x, y, h) { return { x, y, h, v: 3 + GWS.SAIL0 * 12, sail: GWS.SAIL0, rudder: 0, held: 0, inv: 0 }; }
// steer and sailIn in -1..1, as Skerry Light's helm; host: rocks, a hit or a scrape
function gwsSail(B, steer, sailIn, dt, host) {
  const b = gwsBrig(), turnK = b.turn;
  B.rudder += (steer - B.rudder) * Math.min(1, dt * 4 * turnK);
  if (sailIn > 0) B.held = (B.held || 0) + dt; else B.held = 0;
  const rate = (sailIn > 0 ? 1.6 * (1 + B.held * 1.2) : 1.6) * b.accel;
  B.sail = Math.max(0.15, B.sail + (sailIn > 0 ? sailIn * rate : sailIn * (1.6 + B.sail * 1.8)) * dt);
  const vT = (3 + B.sail * 12) * (b.top || 1);
  B.v += (vT - B.v) * Math.min(1, dt * 4 * b.accel);
  B.h = wrapPi(B.h + B.rudder * 0.55 * turnK * dt * (0.35 + 0.65 * Math.min(1, B.v / 10)));
  if (B.inv > 0) B.inv -= dt;
  const steps = Math.min(600, Math.max(1, Math.ceil(B.v * dt / 2)));
  for (let i = 0; i < steps; i++) {
    B.x += Math.sin(B.h) * B.v * dt / steps; B.y += Math.cos(B.h) * B.v * dt / steps;
    if (host && gwsCollide(B)) break;
  }
}
// the hull, as the sailing game's: a capsule along her keel, five points
function gwsHullPts(B) {
  const sx = Math.sin(B.h), sy = Math.cos(B.h), pts = [];
  for (let i = 0; i < 5; i++) { const off = GWS.BOW - 0.4 - (GWS.BOW - GWS.STERN - 1) * i / 4, w = GWS.HB * (i === 0 ? 0.55 : i === 4 ? 0.85 : 1); pts.push({ x: B.x + sx * off, y: B.y + sy * off, w, off }); }
  return pts;
}
// (hosting) push her clear of any rock she's on; a real blow (as SK.IMPACT, and at a real angle) is a plank gone
function gwsCollide(B) {
  const S = RAID.st, pts = gwsHullPts(B), sea = gwsSeaOf();
  if (sea.shore && gwsShore(B, pts, sea.shore)) return false;   // [fbsea] aground on an island's shore: pushed off it, no harm done
  for (const r of sea.rocks) {
    if (Math.abs(r.x - B.x) > r.r + 30 || Math.abs(r.y - B.y) > r.r + 30) continue;
    let best = null;
    for (const p of pts) { const dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy) || 0.001, pen = r.r + p.w - d; if (pen > 0 && (!best || pen > best.pen)) best = { pen, nx: dx / d, ny: dy / d, p }; }
    if (!best) continue;
    B.x += best.nx * best.pen; B.y += best.ny * best.pen;
    const vx = Math.sin(B.h) * B.v, vy = Math.cos(B.h) * B.v, closing = -(vx * best.nx + vy * best.ny);
    if (closing <= 0) continue;
    if (closing > GWS.IMPACT && closing > B.v * 0.5) {
      if (B.inv > 0) return true;
      B.inv = 1.4; B.v = 1.5; B.h = wrapPi(B.h + angDiff(bearingOf(best.nx, best.ny), B.h) * 0.6);
      gwsStove(best.p.off, -Math.sign(angDiff(bearingOf(r.x - B.x, r.y - B.y), B.h)) || 1);
      return true;
    }
    // glancing: as at sea, the speed into it lost, the speed along it kept, and swung along it
    const tx = vx + best.nx * closing, ty = vy + best.ny * closing;
    if (Math.hypot(tx, ty) > 0.5) B.h = wrapPi(B.h + angDiff(bearingOf(tx, ty), B.h) * 0.35);
    B.v = Math.max(2, B.v - closing * 0.6);
    if (!(S.scrT > 0)) { S.scrT = 0.6; S.scrN = (S.scrN | 0) + 1; }
  }
  return false;
}
// [fbsea] (hosting) land she runs up against (an island's shore): pushed clear and her way along it kept, as a glancing
// touch on a rock, but never holed and never slowed below a crawl
function gwsShore(B, pts, shore) {
  let hit = false;
  for (const r of shore) {
    if (Math.abs(r.x - B.x) > r.r + 30 || Math.abs(r.y - B.y) > r.r + 30) continue;
    let best = null;
    for (const p of pts) { const dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy) || 0.001, pen = r.r + p.w - d; if (pen > 0 && (!best || pen > best.pen)) best = { pen, nx: dx / d, ny: dy / d }; }
    if (!best) continue;
    hit = true; B.x += best.nx * best.pen; B.y += best.ny * best.pen;
    const vx = Math.sin(B.h) * B.v, vy = Math.cos(B.h) * B.v, closing = -(vx * best.nx + vy * best.ny);
    if (closing <= 0) continue;
    const tx = vx + best.nx * closing, ty = vy + best.ny * closing;
    if (Math.hypot(tx, ty) > 0.5) B.h = wrapPi(B.h + angDiff(bearingOf(tx, ty), B.h) * 0.35);
    B.v = Math.max(1.5, B.v - closing * 0.8);
  }
  return hit;
}
// (hosting) a plank stove in: a hole in the deck (near where she struck, if there's room), and the word to everyone
function gwsStove(off, side) {
  const S = RAID.st;
  S.hitN = (S.hitN | 0) + 1;
  if (typeof frcSpare === 'function' && frcSpare()) { gwsHitFx(); return; }   // [fogrun cards] Fresh Planks: a spare plank takes it
  const free = GWS_HOLES.map((h, i) => i).filter(i => !S.holes.includes(i));
  if (free.length) {
    free.sort((a, b) => Math.hypot(GWS_HOLES[a][0] - side * 1.5, GWS_HOLES[a][1] - off * 0.8) - Math.hypot(GWS_HOLES[b][0] - side * 1.5, GWS_HOLES[b][1] - off * 0.8));
    S.holes.push(free[0]);
  } else S.flood = Math.min(1, S.flood + 0.2);   // (nowhere left to stove in: she ships it green)
  gwsHitFx();
}
const gwsPlanks = () => Math.max(0, GWS.PLANKS - RAID.st.holes.length);

// ---------- Maren, out on the water behind ----------
// (her place: d behind the cutter, a little off her wake)
function gwsMarenAt(S, B) {
  const M = S.mar, d = SK.MAREN_STAGES[Math.min(M.st, SK.MAREN_STAGES.length - 1)], b = B.h + Math.PI + M.rb;
  // on the sea, never up on the land: while the coast is astern she swings round on her circle until she's standing on water
  for (let i = 0; i < 32; i++) for (const sg of i ? [1, -1] : [1]) { const a = b + sg * i * 0.1; if (B.y + Math.cos(a) * d >= 30) return [B.x + Math.sin(a) * d, B.y + Math.cos(a) * d]; }
  return [B.x + Math.sin(b) * d, Math.max(30, B.y + Math.cos(b) * d)];
}
// where she is from the cutter, in a word: astern, on the quarter, abeam (the HUD)
function gwsSide(S, md) { const V = S.V || S.B, M = S.mar, a = Math.abs(wrapPi(Math.atan2(M.x - V.x, M.y - V.y) - V.h)); return md < 1 ? 'astern' : a > 2.5 ? 'astern' : a > 1.9 ? 'on the quarter' : a > 1.1 ? 'abeam' : 'ahead'; }
// Plimsoll's ring: as at sea, it grows with her speed
const gwsLead = v => 80 + Math.max(0, v - 12) * 2.5;
const gwsGuardR = v => gwsLead(v) * 1.15 + 30;
const gwsGuarded = (S, B) => Math.hypot(S.pl.x - B.x, S.pl.y - B.y) < gwsGuardR(B.v);
// (hosting) a turn of the beam: a stage nearer, unless he's keeping her off; past the last, aboard
function gwsMarenTurn(S) {
  const M = S.mar, B = S.B;
  if (S.ph !== 'sail' && S.ph !== 'rise') return;
  if (gwsGuarded(S, B)) { if (M.st > 0 && RAID.t - (M.heldT || -99) > 14) { M.heldT = RAID.t; gwsSay('Plimsoll is close. She holds where she is.'); } return; }
  if (M.st >= SK.MAREN_STAGES.length - 1) { gwsMarenBoards(S); return; }
  M.st++; M.rb = (Math.random() - 0.5) * 0.7;
  const L = [null, 'Someone is humming out on the water, astern.', 'A woman is standing on the sea behind you.', 'She is close now. Ring the bell, or keep with Plimsoll.', 'She is right under the stern!'];
  if (L[M.st]) gwsSay(L[M.st], M.st >= 3);
}
// (hosting) she's aboard: whoever's nearest the stern goes down, and she's back out where she began
function gwsMarenBoards(S) {
  let who = null, best = 1e9;
  for (const p of ZM.players || []) { const v = p.y - FPSC.CY; if (v < best) { best = v; who = p; } }
  S.mar.st = 0; S.mar.rb = (Math.random() - 0.5) * 0.7;
  S.take = [(S.take ? S.take[0] : 0) + 1, who ? who.sid : ''];
  gwsTaken(S.take[1]);
}
// (everyone) the word that she came aboard: her at the stern for a moment, a scream, and the one she took goes down
function gwsTaken(sid) {
  const S = RAID.st; S.abT = 2.2;
  try { if (!soundOff()) sfxScream(1.1, 1.15); } catch (e) {}
  if (sid === FPS.me.id && !(FPS.me.dead > 0) && !zmIsDown()) { FPS.me.hp = 0; FPS.me.iframe = 0; FPS.hurtT = 1; fpsFeed('Maren came over the stern and took hold of you.'); zmDown(); }
  else if (sid) fpsFeed(`Maren came over the stern and took ${gwsNick(sid)}.`);
  ZM.banner = { text: 'Maren came aboard', t: 3, sub: 'Ring the bell before she does it again', col: '#d8e6ff' };
}
// (hosting) the bell: she's driven back three stages, and the drowned in the water alongside sink back under
function gwsBell(sid) {
  const S = RAID.st; if (S.bellCd > 0) return;
  S.bellCd = GWS.BELL_CD; S.bellN = (S.bellN | 0) + 1; S.bellBy = sid || '';
  const M = S.mar, was = M.st;
  if (M.st > 0) { M.st = Math.max(0, M.st - GWS.BELL_PUSH); M.rb = (Math.random() - 0.5) * 0.7; }
  let sank = 0;
  for (const z of ZM.z) {
    if (z.dead || !z.win || !z.win.sea || (z.st !== 'out' && z.st !== 'climb')) continue;
    if (Math.hypot(z.x - FPSC.CX, z.y - FPSC.CY) > GWS.BELL_SINK) continue;
    z.dead = 1; z.deadT = 0; z.gwSunk = 1; z.win.q = z.win.q.filter(q => q !== z); sank++;
  }
  S.bellSay = was > 0 ? (sank ? 'The bell rings out: she draws well back, and the drowned sink away.' : 'The bell rings out and she draws well back.') : sank ? 'The bell rings out, and the drowned alongside sink back under.' : 'The bell rings out over the water.';
  gwsBellFx(S);
}
// (hosting) a flare from the locker
function gwsFlare(sid) {
  const S = RAID.st; if (S.flareCd > 0) return;
  S.flareCd = GWS.FLARE_CD * (typeof frcFlareK === 'function' ? frcFlareK() : 1); S.flN = (S.flN | 0) + 1; S.flAt = [Math.round(S.B.x), Math.round(S.B.y)]; S.flBy = sid || '';
  gwsFlareFx(S);
}
// (hosting) Plimsoll walks his channel ahead of her, as at sea (src/creatures.js updatePlimsoll)
function gwsPlimTick(S, dt) {
  const p = S.pl, B = S.B, path = gwsSeaOf().path, d = Math.hypot(p.x - B.x, p.y - B.y), lead = gwsLead(B.v);
  const behind = (p.x - B.x) * Math.sin(B.h) + (p.y - B.y) * Math.cos(B.h) < 0 && d < lead * 2;
  if (d < lead || behind) { p.w = 1; p.wait = 0; }
  else if (d > Math.min(lead * 1.3 + 25, gwsGuardR(B.v) - 8)) { p.wait += dt; p.w = p.wait > SK.PLIMSOLL_PATIENCE ? 1 : 0; if (p.w && !p.warned) { p.warned = true; gwsSay('Plimsoll won’t wait. He’s walking on without you.'); } }
  if (p.k >= path.length) p.w = 0;
  if (p.w) {
    const t = path[p.k], dx = t.x - p.x, dy = t.y - p.y, dd = Math.hypot(dx, dy), sp = (behind ? Math.max(14, B.v * 1.6 + 10) : Math.max(8, B.v * 1.15 + 3)) * dt;
    if (dd <= sp) { p.x = t.x; p.y = t.y; p.k++; } else { p.x += dx / dd * sp; p.y += dy / dd * sp; p.dx = dx / dd; p.dy = dy / dd; }
  }
}

// ---------- the drowned over the rail ----------
// (hosting) one of them up out of the sea alongside, to one of the low places in the rail, then in over it
function gwsSpawn(S) {
  if (GWS_LEG && GWS_LEG.spawnOk && !GWS_LEG.spawnOk()) return;   // [fbsea] (none just now)
  const n = Math.max(1, ZM.hum.length), prog = gwsProg(), alive = ZM.z.filter(z => !z.dead).length;
  if (alive >= 4 + 2 * n + Math.round(prog * 6)) return;
  const W = ZM.windows.filter(w => w.gws && w.q.length < 2); if (!W.length) return;
  // (more often to the side the most of you are on: they come for you)
  const w = W[(Math.random() * W.length) | 0], tx = -w.ny, ty = w.nx;
  const out = 3 + Math.random() * 3, side = (Math.random() - 0.5) * 2.4, sx = w.x + w.nx * out + tx * side, sy = w.y + w.ny * out + ty * side;
  const u = Math.random(), run = 0.05 + prog * 0.3, jog = 0.55, kind = u < run ? 'run' : u < run + jog ? 'jog' : 'walk';
  const hp = zmHp(RAIDC.ROUND + prog * 3) * (0.9 + Math.random() * 0.2) * (1 + 0.25 * (n - 1)), zn = ++ZM.zc;
  const z = {
    drowned: true, zm: true, zn, id: 'z' + zn.toString(36), n: 'a drowned man', x: sx, y: sy, jz: -1.2, fl: 0, zpad: 0.27,
    hp, max: hp, kind, sp: kind === 'run' ? 5.0 + Math.random() * 0.6 : kind === 'jog' ? 3.2 + Math.random() * 0.4 : 1.55 + Math.random() * 0.35,
    st: 'out', win: w, t: 0, ph: Math.random() * 6, hitT: 0, atk: 0.6, swing: -1, stuck: 0, h: bearingOf(w.x - sx, w.y - sy), seed: (Math.random() * 1e6) | 0, rise: 1, hist: [], raid: true,
  };
  w.q.push(z); ZM.z.push(z); FPS.drowned = ZM.z;
  zmSound('moan', Math.hypot(sx - FPS.me.x, sy - FPS.me.y), fpsEar(sx, sy), kind);
  try { if (!soundOff()) sfxSplash(gwsPan(sx - FPSC.CX, sy - FPSC.CY, true), Math.max(0.1, 1 - Math.hypot(sx - FPS.me.x, sy - FPS.me.y) / 30)); } catch (e) {}
}
// how far out she's come, 0 at the Light's foot to 1 at the mark
function gwsProg() { if (GWS_LEG && GWS_LEG.prog) return clamp(+GWS_LEG.prog() || 0, 0, 1);   // [fbsea]
  const B = RAID.st.B, sea = gwsSeaOf(), M = gwsMark(); return B ? clamp(1 - Math.hypot(M[0] - B.x, M[1] - B.y) / sea.len, 0, 1) : 0; }
const gwsToMark = B => { const M = gwsMark(); return Math.hypot(M[0] - B.x, M[1] - B.y); };

// ---------- the props: the cutter (src/fpsisle.js's kinds) ----------
// all of her that never moves, as one prop at the deck's middle: her deck and its floor, the hull's sides down into the
// sea, the bulwarks and their rail, the mast, bowsprit, hatch, the wheel's binnacle, the flare locker, gear about the deck
FPI_K.gwcutter = {
  col: '#3a2c20', noShadow: true,
  sol(p) {
    const D = GWS.D, S = [fpiBox(p, 0, 0.2, GWS.HB + 0.1, (GWS.BOW - GWS.STERN) / 2 + 0.3, D, { z0: D - 0.6, fl: true })];
    // the bulwarks: short straight lengths along her edge (only to walk against: shots go over and past them)
    const rail = (u0, v0, u1, v1) => { const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0); S.push(fpiBox(p, (u0 + u1) / 2, (v0 + v1) / 2, L / 2 + 0.05, 0.09, D + 1.0, { z0: D, ra: a, ray: false })); };
    const st = gwsStations();
    for (let i = 1; i < st.length; i++) for (const s of [-1, 1]) rail(s * (st[i - 1][0] - 0.08), st[i - 1][1], s * (st[i][0] - 0.08), st[i][1]);
    rail(-gwsHw(GWS.STERN) + 0.08, GWS.STERN + 0.08, gwsHw(GWS.STERN) - 0.08, GWS.STERN + 0.08);
    S.push(fpiCirc(p, GWS.MAST[0], GWS.MAST[1], 0.24, D + GWS.MAST_H));
    S.push(fpiBox(p, GWS.WHEEL[0], GWS.WHEEL[1] + 0.25, 0.22, 0.2, D + 0.95, { z0: D }));
    S.push(fpiBox(p, GWS.LOCKER[0], GWS.LOCKER[1], 0.5, 0.33, D + 0.72, { z0: D }));
    S.push(fpiBox(p, 0, -2.2, 0.85, 0.75, D + 0.34, { z0: D, fl: true }));   // (the hatch: a step up)
    S.push(fpiBox(p, -2.2, -9.6, 0.4, 0.4, D + 0.8, { z0: D }));   // (the water cask aft)
    S.push(fpiCirc(p, 2.35, 8.0, 0.34, D + 0.6));   // (the anchor's capstan forward)
    return S;
  },
  b3(p, A) {
    const D = GWS.D, R = seeded(0xc077e), st = gwsStations();
    const PL = ['#5a4632', '#634d37', '#54412e', '#6b533a', '#5e4934'];
    // the deck: planks fore and aft, narrowing with her to the stem, a darker waterway along each side
    for (let u = -GWS.HB + 0.1; u < GWS.HB - 0.1; u += 0.22) {
      let v0 = GWS.STERN + 0.1, v1 = GWS.STERN; for (let v = GWS.STERN; v < GWS.BOW; v += 0.1) if (gwsHw(v) - 0.12 > Math.abs(u) + 0.11) v1 = v;
      if (v1 - v0 < 0.3) continue;
      // (laid in lengths with butts staggered)
      for (let v = v0, k = 0; v < v1; k++) { const L = Math.min(v1 - v, 3.2 + R() * 2.4 - (k === 0 ? R() * 2 : 0)); if (L > 0.1) A.box(PL[(R() * PL.length) | 0], u + 0.11, v + L / 2, D - 0.12, 0.205, L - 0.03, 0.12); v += L; }
    }
    A.box('#2e241a', 0, 0.2, D - 0.62, GWS.HB * 2 - 0.2, (GWS.BOW - GWS.STERN) * 0.9, 0.5);
    // the hull's sides: dark tarred planking from deep under the water up to the deck edge, a white stripe at the
    // sheer, the bulwark above with its cap rail, and her stanchions
    for (let i = 1; i < st.length; i++) for (const s of [-1, 1]) {
      const [a, va] = st[i - 1], [b, vb] = st[i], ua = s * a, ub = s * b, L = Math.hypot(ub - ua, vb - va) + 0.06, ang = Math.atan2(vb - va, ub - ua), mu = (ua + ub) / 2, mv = (va + vb) / 2;
      const inK = Math.min(1, (va + vb) / 2 > 5 ? 0.7 : 1);
      A.box('#1a1714', mu, mv, -2.6, L, 0.2, 2.2, ang);
      A.box('#24201b', mu, mv, -0.4, L, 0.2, D + 0.3, ang);
      A.box('#8c8778', mu + s * 0.02 * inK, mv, D - 0.28, L, 0.22, 0.12, ang);
      A.box('#3b2e22', mu - s * 0.04, mv, D, L, 0.12, 0.92, ang);
      A.box('#5c4632', mu, mv, D + 0.92, L, 0.2, 0.08, ang);
    }
    // (her keel and the deep part of her, so she doesn't look hollow from the rail)
    A.box('#131110', 0, -0.5, -3.2, 1.0, GWS.BOW - GWS.STERN - 2, 1.2);
    for (let v = GWS.STERN + 0.6; v < GWS.BOW - 0.8; v += 1.25) for (const s of [-1, 1]) A.box('#4a3a2a', s * (gwsHw(v) - 0.12), v, D, 0.12, 0.12, 0.92);
    // the transom, across her stern, with her name in pale paint (cut in the wood: a few bars) and the stern lamp's bracket
    { const hw = gwsHw(GWS.STERN); A.box('#24201b', 0, GWS.STERN - 0.05, -2.2, hw * 2 + 0.1, 0.22, D + 2.2); A.box('#3b2e22', 0, GWS.STERN + 0.02, D, hw * 2 - 0.1, 0.14, 0.92); A.box('#5c4632', 0, GWS.STERN + 0.02, D + 0.92, hw * 2, 0.22, 0.08); A.box('#8c8778', 0, GWS.STERN - 0.17, D - 0.28, hw * 2 + 0.1, 0.06, 0.12);
      for (let i = 0; i < 7; i++) A.box('#a49c84', -0.9 + i * 0.3, GWS.STERN - 0.18, D - 0.75, 0.16, 0.03, 0.22); }
    // the stem and bowsprit, its bitts, the forestay's end
    A.box('#24201b', 0, GWS.BOW - 0.1, -2.4, 0.3, 0.5, D + 3.4);
    A.log('#5a4632', 0, (GWS.BOW + GWS.SPRIT) / 2 - 1, D + 0.75, 0.13, GWS.SPRIT - GWS.BOW + 3, Math.PI / 2, -0.07);
    for (const s of [-0.3, 0.3]) A.box('#4a3826', s, GWS.BOW - 2.2, D, 0.22, 0.22, 0.7);
    // the mast, its partners and a hoop or two, the gaff's jaws and the crosstrees
    const [mu, mv] = GWS.MAST;
    A.cyl('#6a5440', mu, mv, D - 0.1, 0.22, GWS.MAST_H, 0, 0, 0, 'cyl8');
    A.cyl('#4a3a2a', mu, mv, D, 0.4, 0.25);
    for (const z of [2.6, 5.0, 7.4]) A.part('torus', '#4a3a2a', mu, mv, D + z, 0.95, 0.95, 0.95, 0, Math.PI / 2, 0);
    A.box('#4a3826', mu, mv, D + GWS.MAST_H - 2.6, 2.2, 0.12, 0.12);
    // a pinrail at the mast's foot, with belaying pins and coils of rope
    A.box('#4a3826', mu, mv - 0.55, D + 0.75, 1.4, 0.12, 0.1);
    for (let i = 0; i < 5; i++) A.cyl('#6a5440', mu - 0.56 + i * 0.28, mv - 0.55, D + 0.62, 0.025, 0.34);
    for (const [u, v] of [[-0.6, mv - 0.95], [0.55, mv - 0.85], [-2.3, -6.4], [2.4, 1.6]]) for (let k = 0; k < 4; k++) A.part('torus', '#7a6a4c', u, v, D + 0.03 + k * 0.04, 0.6 - k * 0.07, 0.6 - k * 0.07, 0.6 - k * 0.07, 0, Math.PI / 2, 0);
    // the hatch: its coaming and a grating
    A.box('#4a3826', 0, -2.2, D, 1.7, 1.5, 0.34);
    for (let i = 0; i < 6; i++) A.box('#2a2018', -0.65 + i * 0.26, -2.2, D + 0.3, 0.08, 1.3, 0.06);
    // the wheel's binnacle (its wheel turns: drawn in the stage's own 3D), with the compass bowl on it
    A.box('#4a3826', GWS.WHEEL[0], GWS.WHEEL[1] + 0.25, D, 0.44, 0.4, 0.95);
    A.cyl('#8a6a2c', GWS.WHEEL[0], GWS.WHEEL[1] + 0.85, D, 0.22, 1.05); A.cyl('#2e3034', GWS.WHEEL[0], GWS.WHEEL[1] + 0.85, D + 1.05, 0.18, 0.06);
    // the flare locker: a red-painted box with brass corners (its lid and its lamp are the stage's)
    A.box('#6a2a22', GWS.LOCKER[0], GWS.LOCKER[1], D, 1.0, 0.66, 0.66);
    for (const [du, dv] of [[-0.5, -0.33], [0.5, -0.33], [-0.5, 0.33], [0.5, 0.33]]) A.box('#8a6a2c', GWS.LOCKER[0] + du, GWS.LOCKER[1] + dv, D, 0.06, 0.06, 0.68);
    // gear about her deck: the water cask, a crate, buckets, the capstan, oars along the rail
    A.cyl('#5a4430', -2.2, -9.6, D, 0.4, 0.8, 0, 0, 0, 'cyl8'); for (const z of [0.12, 0.66]) A.cyl('#2e3034', -2.2, -9.6, D + z, 0.42, 0.04);
    A.box('#4e3c2a', -2.35, -8.5, D, 0.6, 0.6, 0.5, 0.2);
    A.cyl('#4a3826', 2.35, 8.0, D, 0.34, 0.6); A.cyl('#2e3034', 2.35, 8.0, D + 0.6, 0.38, 0.06);
    for (const v of [-4.6, -3.0]) A.log('#6a5440', 2.85 * (v < -4 ? 1 : 1), v + 3.5, D + 0.2, 0.04, 3.6, 0.06);
    A.cyl('#3a3a3c', 1.7, -7.6, D, 0.18, 0.32); A.cyl('#3a3a3c', -1.9, 4.6, D, 0.18, 0.32);
    // the anchor, catted forward on the port bow
    A.log('#2e3034', -1.55, 9.1, D + 0.08, 0.06, 1.3, 0.4); A.log('#2e3034', -1.55, 9.1, D + 0.08, 0.05, 1.0, 0.4 + Math.PI / 2);
    // the boom gallows aft, for the boom to rest on
    for (const s of [-1, 1]) A.box('#4a3826', s * 1.3, -7.0, D, 0.12, 0.12, 2.1);
    A.box('#4a3826', 0, -7.0, D + 2.05, 2.8, 0.14, 0.14);
  },
};
// the hull's stations from the transom to the stem: [half width, v]
function gwsStations() { const s = []; for (let v = GWS.STERN; v < GWS.BOW - 0.6; v += 0.75) s.push([gwsHw(v), v]); s.push([gwsHw(GWS.BOW - 0.6), GWS.BOW - 0.6], [0.05, GWS.BOW]); return s; }

// ---------- laying her out ----------
function gwsLay(H, K, Z) {
  K.put('gwcutter', 0, 0, 0, {});
  // the deck lantern's light is the stage's own (it gutters as she's about to step nearer); the stern lamp's here
  K.light(0, GWS.STERN + 0.4, GWS.D + 1.6, '#ffc070', 8, 'lantern');
  K.light(GWS.LOCKER[0], GWS.LOCKER[1] + 0.4, GWS.D + 1.0, '#ff7060', 3, 'lantern');
  // the low places along the rail they come in over (sea windows: up out of the water, then over)
  for (const [u, v, nx, ny] of GWS_WIN) { const [x, y] = gwsW(u, v); Z.windows.push({ x, y, nx, ny, zone: 'deck', z: GWS.D, boards: 0, sea: true, gws: true, id: Z.windows.length, q: [], hw: 0.9, th: 0.25 }); }
}
FPS_ISLES.gwsail = Object.assign({}, FPS_ISLES.raid, { name: 'the Skerries', fog: ['#070a12', 400, 4200], indoor: true, keep: true, noGround: true, open: true, nLights: 4, sky: '90,110,150', skyA: 0.05 });
FPI_GEN.gwsail = { built: true, set(H) { const Z = H.I.zm = { doors: [], windows: [], buys: [], perks: [], spawns: [], lights: [] }; gwsLay(H, zmKit(H, Z), Z); }, decor() {} };
const GWS_MAP = { start: [0, -4.6], top: GWS.D, isle: 'gwsail', shore: () => -999, nav: [-5, 5, -12, 12.5], zones: { deck: { n: 'the keeper’s cutter', r: [-4, 4, -12, 12], sky: true } } };

// ---------- the word on the water (every side) ----------
function gwsSay(text, warn) { if (ZM.net !== 'client') { const S = RAID.st; S.say = [(S.say ? S.say[0] : 0) + 1, text, warn ? 1 : 0]; } gwsHear(text, warn); }
function gwsHear(text, warn) { fpsFeed(text); if (warn) ZM.banner = { text, t: 2.6, small: true, col: '#d8e6ff' }; }
// a sound's pan from where it is (sea: the sailing frame; local: deck coordinates), against where you're looking
function gwsPan(x, y, local) {
  const S = RAID.st, V = S.V || S.B, m = FPS.me, [mu, mv] = gwsL(m.x, m.y);
  const b = local ? bearingOf(x - mu, y - mv) : bearingOf(x - V.x, y - V.y) - V.h;
  return earDir(angDiff(b, m.h));   // (a direction: panned to its side, muffled astern; src/audio.js)
}
function gwsHitFx() {
  try { if (!soundOff()) { sfxHit(); noise('lowpass', 300, 1, 0.005, 0.7, 0.9, { to: 70 }); tone(70, 'sine', 0.01, 0.3, 0.8, { to: 40 }); } } catch (e) {}
  FPS.hurtT = Math.max(FPS.hurtT || 0, 0.35); RAID.st.jolt = 1;
  if (typeof padRumble === 'function') padRumble(0.8, 0.5, 260);
  ZM.banner = { text: 'She struck a rock', t: 2.6, sub: 'A plank stove in: patch the hole', col: '#ffd8a0' };
}
function gwsBellFx(S) {
  S.bellSwing = 1;
  try { if (!soundOff()) sfxBell(); } catch (e) {}
  if (S.bellSay) fpsFeed((S.bellBy && S.bellBy !== FPS.me.id ? gwsNick(S.bellBy) + ' rang the bell. ' : '') + S.bellSay);
}
function gwsFlareFx(S) {
  const B = S.V || S.B;
  S.flares.push({ x: S.flAt[0], y: S.flAt[1], t: 0 });
  try { if (!soundOff()) sfxFlare(); } catch (e) {}
  fpsFeed((S.flBy && S.flBy !== FPS.me.id ? gwsNick(S.flBy) + ' fired a flare. ' : 'Flare away. ') + `Every rock within ${GWS.FLARE_R} m is lit for a few seconds.`);
  // (every rock within its reach, lit for its time)
  const now = RAID.ct || 0;
  for (const r of gwsSeaOf().rocks) if (Math.hypot(r.x - S.flAt[0], r.y - S.flAt[1]) < GWS.FLARE_R) r.flare = now + GWS.FLARE_T;
  void B;
}

// ---------- the stage ----------
RAID_STAGES.gwsail = {
  n: 'The Skerries', map: GWS_MAP, mend: true, zSpeed: 1, open: true, gws: true,
  music: () => 'gwsail',   // (its own: a tense shanty at night, low strings, the hull creaking, a far-off bell)
  set(H, K, Z) { gwsLay(H, K, Z); },
  enter() {
    const L = GWS_LEG, st0 = L ? L.start : GWS.START, sea = gwsSeaOf(), B = gwsBoat(st0[0], st0[1], L ? L.h0 : GWS.H0);   // [fogrun] (a leg's own start)
    for (const r of sea.rocks) { r.seen = -99; r.flare = 0; }
    const k0 = Math.max(0, sea.path.findIndex(q => Math.hypot(q.x - st0[0], q.y - st0[1]) >= 80)), p0 = sea.path[k0] || sea.path[sea.path.length - 1];
    Object.assign(RAID.st, {
      B, V: Object.assign({}, B), G: null, in: [0, 0], inT: 0, helm: null, myIn: [0, 0], sentIn: null, sentT: 0, ph: 'sail',
      holes: [], flood: 0, hitN: 0, scrN: 0, mar: { st: 0, rb: 0.1, heldT: -99, x: 0, y: 0 }, turn: 0, tellT: 0,
      pl: { x: p0.x, y: p0.y, k: k0 + 1, w: 0, wait: 0, dx: 0, dy: 1, ph: 0 },
      bellCd: 0, bellN: 0, flareCd: 0, flN: 0, flAt: [0, 0], flares: [], spT: 8, riseT: 0, ab: [], abT: 0, firstAb: 0, sinkT: 0,
      useT: 0, useI: -1, pend: 0, take: [0, ''], seenTake: 0, seenBell: 0, seenFl: 0, seenHit: 0, seenSay: 0, say: [0, '', 0],
      bellSwing: 0, jolt: 0, creakT: 3, tellSeen: -1, mSeen: -1, oarT: 2, appT: 0, wake: [], ringT: 0, gBellT: 0, told: {},
    });
    { const [mx, my] = gwsMarenAt(RAID.st, B); RAID.st.mar.x = mx; RAID.st.mar.y = my; }
    FPS.helm = false;
    if (L && L.enter) L.enter(RAID.st);   // [fbsea] her pose, holes and flood, as they were
    if (L) return;   // [fogrun] (a leg says its own)
    ZM.banner = { text: 'The Skerries', t: 4.5, sub: 'Part I · out through the rocks to the Gannet’s mark', col: '#d8e6ff' };
    fpsFeed('The keeper’s cutter, at the foot of the Light. Take the wheel (Use) to sail her: the rocks only show in the beam.');
  },
  tick(dt) { gwsTick(dt); },
  me(dt) { gwsMe(dt); },
  q(sid, k, a) { gwsQ(sid, k, a); },
  pack(o) { gwsPack(o); },
  apply(o) { gwsApply(o); },
  block(x, y, pad) {
    const [u, v] = gwsL(x, y), p = Math.min(pad || 0, 0.4);
    if (v < GWS.STERN + 0.22 + p || v > GWS.BOW - 0.8) return true;
    return Math.abs(u) > gwsHw(v) - 0.18 - p;
  },
  consider(c) { gwsConsider(c); },
  prompt(o) { return gwsPrompt(o); },
  use(o) { return gwsUse(o); },
  hud(phone, mono, fell) { gwsHud(phone, mono, fell); },
  b3(grp) { gws3dBuild(grp); },
  f3(dt) { gws3d(dt); },
  exit() { gwsExit(); },
};
raidAdd('gannet', 'gwsail', 1);

// ---------- hosting or alone, each tick ----------
function gwsTick(dt) {
  const S = RAID.st, B = S.B; if (!B) return;
  if (S.scrT > 0) S.scrT -= dt;
  if (S.bellCd > 0) S.bellCd = Math.max(0, S.bellCd - dt);
  if (S.flareCd > 0) S.flareCd = Math.max(0, S.flareCd - dt);
  // the helm: whoever holds it, while they're here and standing; their keys (alone or hosting, mine straight off)
  if (S.helm && (!ZM.hum.some(h => h[0] === S.helm) || gwsIsDown(S.helm))) S.helm = null;
  if (S.helm === FPS.me.id) S.in = S.myIn.slice(); else if (!S.helm) S.in = [0, 0];
  else { S.inT += dt; if (S.inT > 3.5) S.in = [0, 0]; }
  if (S.ph === 'sunk') { S.sinkT += dt; if (S.sinkT >= GWS.SINK && !ZM.over) { if (GWS_LEG && GWS_LEG.sunk) { const f = GWS_LEG.sunk; GWS_LEG.sunk = null; f(); } else if (!(GWS_LEG && GWS_LEG.sunk === null)) zmEnd(); } return; }   // [fbsea] (sunk: her own say)
  // [fogrun] run up on the island's beach: a moment, and ashore
  if (S.ph === 'beach') { S.beachT = (S.beachT || 0) + dt; if (S.beachT >= GWS.BEACH && GWS_LEG && GWS_LEG.arrive) { const f = GWS_LEG.arrive; GWS_LEG.arrive = null; f(); } return; }
  gwsSail(B, S.in[0], S.in[1], dt, true);
  // the sea coming in at every open hole; the pumps getting it out again when there's none
  S.flood = clamp(S.flood + (S.holes.length ? S.holes.length * GWS.FLOOD : -GWS.PUMP) * dt, 0, 1);
  if (S.flood >= 1) { S.ph = 'sunk'; S.sinkT = 0; gwsSay('She’s going down. The sea has her.', true); return; }
  // Maren: one stage nearer every turn of the beam (a swell a moment before)
  const turn = Math.floor((RAID.t || 0) / GW.PERIOD);
  if (turn > S.turn) { S.turn = turn; if (gwsMaren()) gwsMarenTurn(S); }
  const M = S.mar, [mx, my] = gwsMarenAt(S, B), k = Math.min(1, dt * (0.12 + M.st * 0.06));
  M.x += (mx - M.x) * k; M.y += (my - M.y) * k;
  if (gwsPlim()) gwsPlimTick(S, dt);
  // the drowned: up over the rail all the way out, quicker the further out, quicker again while the Gannet comes up
  if (S.ph === 'sail' || S.ph === 'rise') {
    S.spT -= dt;
    if (S.spT <= 0) { gwsSpawn(S); const n = Math.max(1, ZM.hum.length); S.spT = (S.ph === 'rise' ? 2.2 : 6.5 - 4 * gwsProg()) * (0.75 + Math.random() * 0.5) / Math.sqrt(n); }
  }
  // the mark: hold her inside the ring of spars while the Gannet comes up; then up her side
  const dm = gwsToMark(B);
  if (GWS_LEG) { if (S.ph === 'sail' && dm < GWS_LEG.markIn) { S.ph = 'beach'; S.beachT = 0; gwsSay(GWS_LEG.landSay || 'She runs up on the beach.', true); } return; }   // [fogrun] the island, not the mark
  if (S.ph === 'sail' && dm < GWS.MARK_IN) { S.ph = 'rise'; gwsSay('The Gannet’s mark. Hold her inside the ring of spars: something is coming up.', true); }
  if (S.ph === 'rise') { if (dm < GWS.MARK_IN + 20) S.riseT += dt; if (S.riseT >= GWS.RISE) { S.ph = 'ladder'; gwsSay('The Gannet is alongside, her bell ringing. Climb her side: Use at her ladder, by the port rail.', true); } }
  if (S.ph === 'ladder') {
    const up = (ZM.players || []).map(p => p.sid);
    if (S.ab.length && !S.firstAb) S.firstAb = RAID.t;
    if ((up.length && up.every(id => S.ab.includes(id))) || (S.firstAb && RAID.t - S.firstAb > GWS.BOARD_T)) raidNextStage();
  }
}
const gwsIsDown = sid => sid === FPS.me.id ? zmIsDown() || FPS.me.dead > 0 : !!((FPS.remote.get(sid) || {}).down || (FPS.remote.get(sid) || {}).dead > 0);
// hosting: what a joined player asked
function gwsQ(sid, k, a) {
  const S = RAID.st; if (!S.B) return;
  if (k === 'helm') { if (a) { if (S.helm !== sid) { S.helm = sid; S.in = [0, 0]; S.inT = 0; if (sid !== FPS.me.id) fpsFeed(`${gwsNick(sid)} has the helm.`); } } else if (S.helm === sid) S.helm = null; }
  else if (k === 'st') { if (S.helm === sid && Array.isArray(a)) { S.in = [clamp(+a[0] || 0, -1, 1), clamp(+a[1] || 0, -1, 1)]; S.inT = 0; } }
  else if (k === 'bell') gwsBell(sid);
  else if (k === 'flare') gwsFlare(sid);
  else if (k === 'patch') { const i = S.holes.indexOf(a | 0); if (i >= 0) { S.holes.splice(i, 1); S.patched = (S.patched | 0) | (1 << (a | 0)); if (sid !== FPS.me.id) fpsFeed(`${gwsNick(sid)} patched a hole.`); } }
  else if (k === 'board') { if (S.ph === 'ladder' && !S.ab.includes(sid)) { S.ab.push(sid); if (sid !== FPS.me.id) fpsFeed(`${gwsNick(sid)} is up the Gannet’s side.`); } }
}
// hosting: its word
function gwsPack(o) {
  const S = RAID.st, B = S.B; if (!B) return;
  const r2 = v => Math.round(v * 100) / 100;
  o.gp = [r2(B.x), r2(B.y), Math.round(B.h * 1e4) / 1e4, r2(B.v), Math.round(B.sail * 1e3) / 1e3, Math.round(B.rudder * 1e3) / 1e3, r2(B.held || 0)];
  o.gi = [Math.round(S.in[0] * 100) / 100, Math.round(S.in[1] * 100) / 100]; o.gh = S.helm || '';
  o.gq = S.holes.slice(); o.gpt = S.patched | 0; o.gf = Math.round(S.flood * 1000); o.gn = [S.hitN | 0, S.scrN | 0];
  o.gm = [S.mar.st, Math.round(S.mar.x), Math.round(S.mar.y), Math.round(S.mar.rb * 100)]; o.gtk = S.take;
  o.gl = [Math.round(S.pl.x * 10) / 10, Math.round(S.pl.y * 10) / 10, S.pl.w | 0, Math.round(S.pl.dx * 100) / 100, Math.round(S.pl.dy * 100) / 100];
  o.gb = [S.bellN | 0, Math.round(S.bellCd * 10) / 10, S.bellBy || '', S.bellSay || '']; o.gF = [S.flN | 0, S.flAt[0], S.flAt[1], Math.round(S.flareCd * 10) / 10, S.flBy || ''];
  o.gs = ['sail', 'rise', 'ladder', 'sunk', 'beach'].indexOf(S.ph);   // ([fogrun] beach) o.gr = Math.round(S.riseT * 10) / 10; o.gab = S.ab.slice(); o.gk = Math.round(S.sinkT * 10) / 10; o.gsy = S.say;
}
// joined: the host's word of it
function gwsApply(o) {
  const S = RAID.st; if (!S.B || !Array.isArray(o.gp)) return;
  const p = o.gp.map(v => +v || 0);
  S.G = { x: p[0], y: p[1], h: p[2], v: p[3], sail: p[4], rudder: p[5], held: p[6], inv: 0 };
  Object.assign(S.B, S.G);
  if (Array.isArray(o.gi)) S.in = [+o.gi[0] || 0, +o.gi[1] || 0];
  const was = S.helm; S.helm = o.gh || null;
  if (was !== S.helm && S.helm && S.helm !== FPS.me.id) fpsFeed(`${gwsNick(S.helm)} has the helm.`);
  if (S.helm !== FPS.me.id && FPS.helm && !(S.wantT > 0)) FPS.helm = false;
  if (Array.isArray(o.gq)) S.holes = o.gq.map(v => v | 0);
  S.patched = o.gpt | 0; S.flood = (o.gf | 0) / 1000;
  if (Array.isArray(o.gn)) { const h = o.gn[0] | 0; if (h > S.seenHit) { if (S.seenHit) gwsHitFx(); S.seenHit = h; } S.scrN = o.gn[1] | 0; }
  if (Array.isArray(o.gm)) { const M = S.mar; M.st = o.gm[0] | 0; M.x = +o.gm[1]; M.y = +o.gm[2]; M.rb = (+o.gm[3] || 0) / 100; }
  if (Array.isArray(o.gtk)) { const n = o.gtk[0] | 0; if (n > (S.seenTake | 0)) { const first = !S.seenTake && n > 1; S.seenTake = n; if (!first) gwsTaken(String(o.gtk[1] || '')); } }
  if (Array.isArray(o.gl)) { const P = S.pl; P.x = +o.gl[0]; P.y = +o.gl[1]; P.w = o.gl[2] | 0; P.dx = +o.gl[3] || 0; P.dy = +o.gl[4] || 1; }
  if (Array.isArray(o.gb)) { const n = o.gb[0] | 0; S.bellCd = +o.gb[1] || 0; if (n > S.seenBell) { S.bellBy = String(o.gb[2] || ''); S.bellSay = String(o.gb[3] || ''); if (S.seenBell || n === 1) gwsBellFx(S); S.seenBell = n; } }
  if (Array.isArray(o.gF)) { const n = o.gF[0] | 0; S.flareCd = +o.gF[3] || 0; if (n > S.seenFl) { S.flAt = [+o.gF[1], +o.gF[2]]; S.flBy = String(o.gF[4] || ''); if (S.seenFl || n === 1) gwsFlareFx(S); S.seenFl = n; } }
  const ph = ['sail', 'rise', 'ladder', 'sunk', 'beach'][o.gs | 0] || 'sail'; S.ph = ph;
  S.riseT = +o.gr || 0; if (Array.isArray(o.gab)) S.ab = o.gab.map(String); S.sinkT = +o.gk || 0;
  if (Array.isArray(o.gsy)) { const n = o.gsy[0] | 0; if (n > S.seenSay) { if (S.seenSay || n === 1) gwsHear(String(o.gsy[1] || ''), !!o.gsy[2]); S.seenSay = n; } }
}

// ---------- everyone, each frame ----------
// (fps.js fpsInput, while FPS.helm) what your keys say at the wheel: steer, and make or shorten sail
function gwsHelm(steer, sail) {
  if (!gwsOn()) { FPS.helm = false; return false; }
  const S = RAID.st, q = v => Math.round(clamp(v, -1, 1) * 4) / 4;
  S.myIn = [q(steer), q(sail)];
  return true;
}
function gwsMe(dt) {
  const S = RAID.st, m = FPS.me; if (!S.B) return;
  const alive = !(m.dead > 0) && !zmIsDown() && !ZM.over;
  if (S.wantT > 0) S.wantT -= dt;
  if (S.pend > 0) S.pend -= dt;
  // at the wheel: standing behind it, not walking (your keys are hers); let go when you go down
  if (FPS.helm && (!alive || S.ph === 'sunk')) gwsLetGo();
  if (FPS.helm) {
    const [x, y] = gwsW(GWS.STAND[0], GWS.STAND[1]); m.x += (x - m.x) * Math.min(1, dt * 10); m.y += (y - m.y) * Math.min(1, dt * 10);
    // (joined: what my keys say goes to the host whenever it changes, and once a second besides)
    if (ZM.net === 'client') {
      S.sentT -= dt; const k = S.myIn.join(',');
      if (k !== S.sentIn && S.sentT < 0.85 || S.sentT <= 0) { S.sentIn = k; S.sentT = 1; raidAsk('st', S.myIn.slice()); }
    }
  } else S.myIn = [0, 0];
  // her pose on this side: hosting it's the true one; joined, sailed on between the host's words and eased to them
  if (ZM.net === 'client') {
    const V = S.V, G = S.G || S.B, mine = S.helm === FPS.me.id || FPS.helm;
    gwsSail(G, S.in[0], S.in[1], dt, false);
    gwsSail(V, mine ? S.myIn[0] : S.in[0], mine ? S.myIn[1] : S.in[1], dt, false);
    const e = Math.hypot(G.x - V.x, G.y - V.y);
    if (e > 40) Object.assign(V, G);
    else { const k = Math.min(1, dt * (mine ? 1.6 : 4)); V.x += (G.x - V.x) * k; V.y += (G.y - V.y) * k; V.h = wrapPi(V.h + angDiff(G.h, V.h) * k); V.v += (G.v - V.v) * k; V.sail += (G.sail - V.sail) * k; if (!mine) V.rudder += (G.rudder - V.rudder) * k; }
  } else S.V = S.B;
  const V = S.V, now = RAID.ct || 0;
  // the rocks: lit while the beam's on them (or a flare, or close in the lantern), fading after
  const beam = wrapPi(gwBeam()), sea = gwsSeaOf();
  for (const r of sea.rocks) {
    const dx = r.x - V.x, dy = r.y - V.y; if (Math.abs(dx) > 1300 || Math.abs(dy) > 1300) { r.lit = 0; continue; }
    const d = Math.hypot(r.x, r.y), b = bearingOf(r.x, r.y), inBeam = Math.abs(b) < SK.SHADE && Math.abs(angDiff(b, beam)) < gwsHalf() + r.r / Math.max(30, d) && d < SK.BEAM_RANGE;
    const lan = Math.hypot(dx, dy) < GWS.LANT_R + r.r;
    if (inBeam || r.flare > now) r.seen = now;
    r.lit = Math.max(inBeam || r.flare > now ? 1 : clamp(1 - (now - r.seen - SK.SEEN_HOLD - (typeof frcSpy === 'function' ? frcSpy() : 0)) / SK.SEEN_FADE, 0, 1), lan ? 0.32 : 0);
    if (GWS_LEG && GWS_LEG.fog) { const f = GWS_LEG.fog, e = Math.hypot(dx, dy) - r.r; if (e < f) r.lit = Math.max(r.lit, clamp((f - e) / (f * 0.35), 0, 1)); }   // [fogrun] inside the fog, seen
  }
  // the flares: up from the stern, and slowly down again
  for (const f of S.flares) f.t += dt;
  S.flares = S.flares.filter(f => f.t < GWS.FLARE_T + 1);
  // Maren's tells: a swell from her side a moment before she steps nearer (only while she isn't held); her whisper the
  // first time you see her at each stage; oars when she's close and out of sight; sometimes, on the bowsprit
  const M = S.mar, tellAt = GW.PERIOD - 1.5, into = ((RAID.ct || 0) % GW.PERIOD), turnN = Math.floor((RAID.ct || 0) / GW.PERIOD);
  const held = gwsGuarded(S, V), mOn = gwsMaren();   // [fogrun] (no Maren out there: none of her tells)
  if (mOn && into >= tellAt && S.tellSeen !== turnN && (S.ph === 'sail' || S.ph === 'rise')) {
    S.tellSeen = turnN;
    if (!held) { S.tellT = 1.5; try { if (!soundOff()) sfxSwell(gwsPan(M.x, M.y)); } catch (e) {} }
  }
  if (S.tellT > 0) S.tellT -= dt;
  const mb = bearingOf(M.x - V.x, M.y - V.y) - V.h, look = Math.abs(angDiff(mb, m.h)) < 0.65;
  if (mOn && look && S.mSeen !== M.st && (S.ph === 'sail' || S.ph === 'rise')) { S.mSeen = M.st; try { if (!soundOff()) sfxWhisper(gwsPan(M.x, M.y), 0.6 + M.st * 0.15); } catch (e) {} }
  if (mOn && M.st >= 3 && !look) { S.oarT -= dt; if (S.oarT <= 0) { S.oarT = 2.5 + Math.random() * 1.5; try { if (!soundOff()) sfxRowlock(gwsPan(M.x, M.y)); } catch (e) {} } }
  { const lb = bearingOf(V.x, V.y); if (mOn && M.st >= 1 && Math.abs(angDiff(beam, lb)) < 0.06 && S.appSeen !== turnN) { S.appSeen = turnN; if (Math.random() < 0.3 && Math.abs(m.h) < 0.8) { S.appT = 0.9; try { if (!soundOff()) sfxSting(); } catch (e) {} fpsFeed('Something was standing on the bowsprit.'); } } }
  if (S.appT > 0) S.appT -= dt;
  if (S.abT > 0) S.abT -= dt;
  if (S.bellSwing > 0) S.bellSwing = Math.max(0, S.bellSwing - dt / 3);
  if (S.jolt > 0) S.jolt = Math.max(0, S.jolt - dt * 2);
  // she creaks and works as she goes, more the faster; the Gannet's bell comes over the water, louder nearer the mark
  S.creakT -= dt * (0.6 + Math.min(2, V.v / 12));
  if (S.creakT <= 0) { S.creakT = 3 + Math.random() * 5; try { if (!soundOff()) sfxCreak(); } catch (e) {} }
  if (!GWS_LEG) { const dm = gwsToMark(V); S.gBellT -= dt; if (S.gBellT <= 0 && dm < 1300 && S.ph !== 'sunk') { S.gBellT = S.ph === 'sail' ? 5 + dm / 250 : 2.2; try { if (!soundOff()) sfxBellFar(gwsPan(GWS.MARK[0], GWS.MARK[1]), S.ph === 'sail' ? clamp(1 - dm / 1300, 0.08, 0.7) : 0.9); } catch (e) {} } }
  // Plimsoll's squeaking shoes, as he walks
  if (gwsPlim() && S.pl.w) { S.pl.ph += dt * Math.min(30, 9 + V.v * 0.15); const st = Math.floor(S.pl.ph / Math.PI); if (st !== S.pl.step) { S.pl.step = st; const d = Math.hypot(S.pl.x - V.x, S.pl.y - V.y); if (d < 260) try { if (!soundOff()) sfxSqueak(gwsPan(S.pl.x, S.pl.y), Math.max(0, 1 - d / 260)); } catch (e) {} } } else S.pl.ph += dt * 1.5;
  // holding Use at a hole patches it
  const hold = FPS.keys.KeyF || FPS.keys.KeyE || FPS.touchUse || FPS.padUse, o = ZM.near;
  if (hold && o && o.k === 'gwhole' && alive && !(S.pend > 0) && S.holes.includes(o.i)) {
    if (S.useI !== o.i) { S.useI = o.i; S.useT = 0; }
    S.useT += dt;
    if (S.useT >= GWS.PATCH) { S.useT = 0; S.useI = -1; S.pend = 0.8; if (ZM.net === 'client') { raidAsk('patch', o.i); S.holes = S.holes.filter(h => h !== o.i); } else gwsQ(FPS.me.id, 'patch', o.i); try { if (!soundOff()) { for (let i = 0; i < 3; i++) tone(180, 'square', 0.002, 0.08, 0.06, { delay: i * 0.16, to: 120 }); } } catch (e) {} fpsFeed('Patched. The plank’s back.'); }
  } else if (!(hold && o && o.k === 'gwhole')) { S.useT = 0; S.useI = -1; }
  // aboard the Gannet: you're on her ladder, waiting for the rest
  if (S.ab.includes(m.id) && S.ph === 'ladder') { const [x, y] = gwsW(GWS.LADDER[0] + 0.4, GWS.LADDER[1]); m.x = x; m.y = y; }
}
// let go of the wheel (she holds her course and speed)
function gwsLetGo() { const S = RAID.st; FPS.helm = false; S.myIn = [0, 0]; S.wantT = 0; raidAsk('helm', 0); if (ZM.net !== 'client') S.in = [0, 0]; }

// ---------- what's in front of you to use ----------
function gwsConsider(c) {
  const S = RAID.st, D = GWS.D; if (!S.B || S.ph === 'sunk') return;
  const at = (k, u, v, r, extra) => { const [x, y] = gwsW(u, v); c(Object.assign({ k }, extra || {}), x, y, D, r, false); };
  at('gwhelm', GWS.WHEEL[0], GWS.WHEEL[1] - 0.6, 1.5);
  at('gwbell', GWS.MAST[0], GWS.MAST[1] - 0.2, 1.7);
  at('gwflare', GWS.LOCKER[0], GWS.LOCKER[1] + 0.5, 1.4);
  for (const i of S.holes) at('gwhole', GWS_HOLES[i][0], GWS_HOLES[i][1], 1.3, { i });
  if (S.ph === 'ladder' && !S.ab.includes(FPS.me.id)) at('gwladder', GWS.LADDER[0] + 0.5, GWS.LADDER[1], 2.2);
}
function gwsPrompt(o) {
  const S = RAID.st;
  if (o.k === 'gwhelm') return FPS.helm ? { text: 'Let go of the wheel (she holds her course)' } : { text: S.helm ? `Take the wheel from ${gwsNick(S.helm)}` : 'Take the wheel', free: true };
  if (o.k === 'gwbell') return S.bellCd > 0 ? { text: `The bell: ready in ${Math.ceil(S.bellCd)} s` } : { text: 'Ring the ship’s bell', free: true };
  if (o.k === 'gwflare') return S.flareCd > 0 ? { text: `The flare locker: a flare ready in ${Math.ceil(S.flareCd)} s` } : { text: 'Fire a flare', free: true };
  if (o.k === 'gwhole') return { text: 'Hold to patch the hole', hold: true };
  if (o.k === 'gwladder') return { text: 'Climb the Gannet’s side', free: true };
  return null;
}
function gwsUse(o) {
  const S = RAID.st;
  if (o.k === 'gwhelm') {
    if (FPS.helm) { gwsLetGo(); fpsFeed('You let go of the wheel. She holds her course.'); return true; }
    FPS.helm = true; S.wantT = 1.2; S.sentIn = null; S.sentT = 0; raidAsk('helm', 1);
    fpsFeed('You have the helm: A and D (or the stick) steer, W makes sail, S shortens it. Use to let go.');
    return true;
  }
  if (o.k === 'gwbell') { if (S.bellCd <= 0) raidAsk('bell'); else zmSound('no'); return true; }
  if (o.k === 'gwflare') { if (S.flareCd <= 0) raidAsk('flare'); else zmSound('no'); return true; }
  if (o.k === 'gwhole') return true;
  if (o.k === 'gwladder') { if (FPS.helm) gwsLetGo(); raidAsk('board'); if (!S.ab.includes(FPS.me.id)) S.ab.push(FPS.me.id); fpsFeed('You climb the Gannet’s side and wait at the top for the others.'); return true; }
  return false;
}
function gwsExit() {
  FPS.helm = false;
  if (typeof GFX !== 'undefined') GFX.skyTurn = 0;
  gwsGLReset();
  GW3.on = false;
}

// =====================================================================================================================
// in 3D
// =====================================================================================================================
// Two groups: the deck's (fixed, at the island's middle: the wheel, the bell, the sails, the lantern, the holes and the
// water over the deck, Maren at the stern, the Gannet alongside) and the sea's, placed each frame by the inverse of her
// pose (the rocks, the mark's spars, Plimsoll and his ring, Maren on the water, the flares, the wake, the Light's glare).
const GW3 = { on: false };
// a point of the sea's (sx, sy, height) in the sea group's own frame
const gsv = (x, y, z) => new THREE.Vector3(x, z || 0, -y);
// (a deck point, local u, v and height over the deck's ground)
const gdv = (u, v, z) => new THREE.Vector3(u, z || 0, -v);
// a picture as a texture once it has loaded: pale (Maren, tinted toward moonlight), or as it is; flipped, if asked
function gwsImgTex(img, pale, flip) {
  if (!imgReady(img)) return null;
  const c = document.createElement('canvas'); c.width = Math.min(512, img.naturalWidth); c.height = Math.round(c.width * img.naturalHeight / img.naturalWidth);
  const q = c.getContext('2d');
  if (flip) { q.translate(c.width, 0); q.scale(-1, 1); }
  q.drawImage(img, 0, 0, c.width, c.height);
  if (pale) { q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(190,215,240,0.42)'; q.fillRect(0, 0, c.width, c.height); }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}
// a sail: a grid between four corners (tack, clew, throat, peak; a triangle when the last two are one), bellied out
// to one side by how full it is
function gwsSailMesh(mat, N) {
  const geo = new THREE.BufferGeometry(), n = (N + 1) * (N + 1), idx = [];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.userData.N = N; return m;
}
function gwsSailShape(m, P, side, fill, t) {
  const N = m.userData.N, pos = m.geometry.attributes.position, [ta, cl, th, pk] = P;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const a = i / N, b = j / N, lo = ta.map((v, k) => v + (cl[k] - v) * a), hi = th.map((v, k) => v + (pk[k] - v) * a), p = lo.map((v, k) => v + (hi[k] - v) * b);
    const belly = fill * Math.sin(Math.PI * Math.min(1, a * 1.05)) * Math.pow(Math.sin(Math.PI * (0.08 + b * 0.84)), 0.8) + 0.04 * Math.sin(t * 7 + a * 9 + b * 5) * (1 - fill * 0.5) * a;
    pos.setXYZ(j * (N + 1) + i, p[0] + side * belly, p[2], -p[1]);
  }
  pos.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
}
function gws3dBuild(grp) {
  const sea = gwsSeaOf(), D = GWS.D, B = curBiome();
  GW3.on = true; GW3.T = { maren: null, marenR: null, plim: null, plimF: null };
  const lam = (c, o) => z3Lam(c, o), basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
  const soft = z3Soft('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), add = (p, o, at) => { if (at) o.position.copy(at); p.add(o); return o; };
  const glowSp = (c, s, o) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: soft, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }, o || {}))); sp.scale.setScalar(s); return sp; };
  GW3.soft = soft; GW3.glowSp = glowSp;
  // ---------- the deck's group ----------
  const DG = GW3.DG = new THREE.Group(); DG.position.set(FPSC.CX, FPSC.GROUND, -FPSC.CY); grp.add(DG);
  const wood = lam('#5a4632'), wood2 = lam('#4a3826'), iron = lam('#2a2a2c'), brass = lam('#9a7a34', { emissive: 0x1a1206 }), canvas = lam('#d8ccb0', { side: THREE.DoubleSide }), rope = new THREE.LineBasicMaterial({ color: 0x4a4236, transparent: true, opacity: 0.85 });
  // the wheel: a rim and eight spokes with their handles, on its axle (it turns as the rudder goes over)
  { const W = GW3.wheel = add(DG, new THREE.Group(), gdv(GWS.WHEEL[0], GWS.WHEEL[1] - 0.02, D + 0.98));
    W.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.032, 6, 24), wood));
    W.add(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.02, 5, 18), wood2));
    W.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10).rotateX(Math.PI / 2), brass));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.6), wood); s.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0); s.rotation.z = a - Math.PI / 2; W.add(s);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.16, 6), wood2); h.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0); h.rotation.z = a - Math.PI / 2; W.add(h); } }
  // the ship's bell, on its bracket at the mast's fore side (it swings when rung)
  { const g0 = add(DG, new THREE.Group(), gdv(GWS.BELL[0], GWS.BELL[1], D + 2.2));
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), iron); br.position.set(0, 0.04, 0.15); g0.add(br);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.06), iron); yoke.position.set(0, 0, -0.08); g0.add(yoke);
    const sw = GW3.bell = new THREE.Group(); sw.position.set(0, 0, -0.08); g0.add(sw);
    const prof = [[0.02, 0], [0.11, -0.02], [0.13, -0.1], [0.15, -0.22], [0.2, -0.33], [0.21, -0.36], [0.17, -0.36]].map(([r, y]) => new THREE.Vector2(r, y));
    sw.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 18), new THREE.MeshLambertMaterial({ color: 0x8a6a2c, emissive: 0x1e1406, side: THREE.DoubleSide })));
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), iron); cl.position.y = -0.33; sw.add(cl);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5), rope.clone()); lan.position.set(0.05, -0.55, 0); sw.add(lan); }
  // the deck lantern, hung from the mast; its light gutters when she's about to step nearer
  { const L = GW3.lan = add(DG, new THREE.Group(), gdv(0.42, GWS.MAST[1] - 0.2, D + 2.6));
    L.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 10), brass));
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 10, 1, true), basic(0xffe6a8, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); gl.position.y = 0.14; L.add(gl);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 10), brass); cap.position.y = 0.3; L.add(cap);
    GW3.flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(0xfff0c8)); GW3.flame.position.y = 0.12; GW3.flame.scale.y = 1.8; L.add(GW3.flame);
    GW3.lanHalo = glowSp(0xffd890, 1.1); GW3.lanHalo.position.y = 0.13; L.add(GW3.lanHalo);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), iron); arm.position.set(-0.21, 0.42, 0); L.add(arm);
    GW3.light = new THREE.PointLight(0xffc880, 1.5, 18, 1.2); GW3.light.position.y = 0.1; L.add(GW3.light); }
  // the stern lamp, and the flare locker's red lamp (lit while a flare's ready)
  { const s = glowSp(0xffc070, 0.7); s.position.copy(gdv(0, GWS.STERN + 0.3, D + 1.6)); DG.add(s);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), iron); p.position.copy(gdv(0, GWS.STERN + 0.3, D + 1.25)); DG.add(p);
    GW3.flLamp = glowSp(0xff4a3a, 0.5); GW3.flLamp.position.copy(gdv(GWS.LOCKER[0] + 0.35, GWS.LOCKER[1] + 0.2, D + 0.85)); DG.add(GW3.flLamp);
    // (the locker's lid, its brass hasp and its stencilled word)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 0.7), lam('#7a3226')); lid.position.copy(gdv(GWS.LOCKER[0], GWS.LOCKER[1], D + 0.69)); DG.add(lid);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 256, 64);
    x.font = 'bold 40px "Courier Prime", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(230,214,170,0.85)'; x.fillText('FLARES', 128, 34);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, color: 0x8a8070 }));
    tag.position.copy(gdv(GWS.LOCKER[0], GWS.LOCKER[1] + 0.335, D + 0.42)); tag.rotation.y = Math.PI; DG.add(tag); }
  // the mainsail on its boom and gaff (swung out to leeward), the jib, the rigging
  { const [mu, mv] = GWS.MAST, MS = GW3.main = add(DG, new THREE.Group(), gdv(mu, mv, 0));
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 9.6, 8).rotateX(Math.PI / 2), wood); boom.position.set(0, D + 2.35, 4.75); MS.add(boom);
    const gaff = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 8.7, 8).rotateX(Math.PI / 2), wood); MS.add(gaff);
    { const a = new THREE.Vector3(0, D + 10.6, 0.2), b = new THREE.Vector3(0, D + 13.0, 8.3); gaff.position.copy(a.clone().add(b).multiplyScalar(0.5)); gaff.lookAt(b.clone().add(MS.position)); gaff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize()); }
    GW3.mainS = gwsSailMesh(canvas, 10); MS.add(GW3.mainS);
    GW3.jibS = gwsSailMesh(canvas, 8); DG.add(GW3.jibS);
    const pts = [];
    const line = (a, b) => pts.push(a, b);
    const top = gdv(mu, mv, D + GWS.MAST_H - 0.6);
    for (const s of [-1, 1]) for (const dv of [-0.4, -1.4]) line(top, gdv(s * (gwsHw(mv + dv) - 0.1), mv + dv, D + 0.95));
    line(gdv(mu, mv + 0.2, D + 11.2), gdv(0, GWS.SPRIT - 0.2, D + 1.25));
    line(top, gdv(0, GWS.STERN + 0.5, D + 1.0));
    line(gdv(0, GWS.BOW - 0.2, D + 0.2), gdv(0, GWS.SPRIT - 0.2, D + 1.2));
    DG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), rope));
    // the sheet, from the boom's end down to the deck (moves with the boom)
    GW3.sheet = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), rope); DG.add(GW3.sheet);
    // the pennant at the masthead
    GW3.pen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.22), new THREE.MeshLambertMaterial({ color: 0x8a2a22, side: THREE.DoubleSide })); GW3.pen.position.copy(gdv(mu, mv, D + GWS.MAST_H + 0.1)); GW3.pen.geometry.translate(-0.6, 0, 0); DG.add(GW3.pen); }
  // the holes she can be stove in at: broken planks round a black gap and the sea welling up through it; and once
  // patched, a board nailed over
  GW3.holes = GWS_HOLES.map(([u, v], i) => {
    const g0 = add(DG, new THREE.Group(), gdv(u, v, D + 0.005)), R = seeded(0x401e + i * 31);
    const hole = new THREE.Group(); g0.add(hole);
    const sh = new THREE.Shape(); for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2, r = 0.42 + (R() - 0.5) * 0.28; if (k) sh.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.8); else sh.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.8); }
    const gap = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), basic(0x020406)); gap.position.y = 0.006; hole.add(gap);
    const wet = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x0c2230, specular: 0x8aa8c0, shininess: 70, transparent: true, opacity: 0.8 })); wet.scale.setScalar(0.85); wet.position.y = -0.04; hole.add(wet);
    for (let k = 0; k < 9; k++) { const a = R() * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(0.06 + R() * 0.05, 0.05, 0.25 + R() * 0.35), wood); s.position.set(Math.cos(a) * 0.48, 0.05, Math.sin(a) * 0.32); s.rotation.set(0.5 + R() * 0.7, a + Math.PI / 2, (R() - 0.5) * 0.6); hole.add(s); }
    const spray = glowSp(0x9ac8e8, 0.9, { opacity: 0.5 }); spray.position.y = 0.25; hole.add(spray);
    const patch = new THREE.Group(); g0.add(patch);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.26), lam(['#8a7050', '#7e6446', '#94785a'][k])); b.position.set((R() - 0.5) * 0.1, 0.03, -0.27 + k * 0.27); b.rotation.y = (R() - 0.5) * 0.15; patch.add(b); }
    for (let k = 0; k < 6; k++) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), iron); n.position.set(k % 2 ? 0.55 : -0.55, 0.065, -0.27 + Math.floor(k / 2) * 0.27); patch.add(n); }
    return { hole, patch, spray, wet };
  });
  // the sea on her deck: a sheet of water over it, as high as she's flooded, slopping about
  { const sh = new THREE.Shape(), st = gwsStations();
    st.forEach(([w, v], i) => { const x = Math.max(0.05, w - 0.22); if (i) sh.lineTo(x, v); else sh.moveTo(x, v); });
    for (let i = st.length - 1; i >= 0; i--) sh.lineTo(-Math.max(0.05, st[i][0] - 0.22), st[i][1]);
    const geo = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2);
    GW3.flood = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x0a1a24, specular: 0x9ab0c8, shininess: 80, transparent: true, opacity: 0.6, depthWrite: false }));
    GW3.flood.renderOrder = 2; DG.add(GW3.flood); }
  // Maren, at the stern when she comes aboard; and the shape of her on the bowsprit, a moment, in the beam
  GW3.mDeck = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0.9, fog: false })); GW3.mDeck.scale.set(1.9 * SK.MAREN_ASPECT * 1.6, 3.0, 1); GW3.mDeck.position.copy(gdv(0, GWS.STERN + 1.4, D + 1.5)); GW3.mDeck.visible = false; DG.add(GW3.mDeck);
  GW3.mSprit = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0.85, fog: false })); GW3.mSprit.scale.set(2.8 * SK.MAREN_ASPECT, 2.8, 1); GW3.mSprit.position.copy(gdv(0, GWS.SPRIT - 1.8, D + 2.3)); GW3.mSprit.visible = false; DG.add(GW3.mSprit);
  // the Gannet, risen alongside to port: her black hull, two masts and their rags of sail, the weed on her, her lamps
  // and her bell, and the boarding ladder down her side to your rail
  { const G = GW3.gan = add(DG, new THREE.Group(), gdv(-9.6, 1.0, 0)); G.visible = false;
    const hullM = lam('#1c1a16'), hull2 = lam('#2a2620'), weed = lam('#1e3020'), rag = lam('#6e6a5a', { side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    const L = 34, BW = 4.6;
    for (let i = 0; i < 16; i++) { const v = -L / 2 + (i + 0.5) * L / 16, k = 1 - Math.pow(Math.abs(v) / (L / 2), 2.4) * 0.85, w = BW * k;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 7.5, L / 16 + 0.05), i % 3 ? hullM : hull2); seg.position.set(0, -1.6, -v); G.add(seg);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 0.2, 0.25, L / 16 + 0.05), hull2); rail.position.set(0, 3.1 + (Math.abs(v) > L / 2 - 6 ? 1.2 : 0), -v); G.add(rail);
      if (i % 2) { const wd = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 0.06, 0.9, L / 16 * 0.8), weed); wd.position.set(0, -0.6 + (i % 4) * 0.2, -v); G.add(wd); } }
    // (gun ports, shut and streaming)
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.7), lam('#0e0c0a')); p.position.set(s * (BW * (1 - Math.pow(Math.abs(-12 + i * 4) / 17, 2.4) * 0.85) + 0.02), 1.4, 12 - i * 4); G.add(p); }
    for (const [v, h] of [[6, 22], [-7, 19]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, h, 8), lam('#2e2820')); m.position.set(0, 2 + h / 2, -v); m.rotation.z = 0.04; G.add(m);
      for (const y of [h * 0.45, h * 0.75]) { const yd = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9 - y * 0.15, 6).rotateZ(Math.PI / 2), lam('#2e2820')); yd.position.set(0, 2 + y, -v); yd.rotation.y = 0.15; G.add(yd);
        const s = new THREE.Mesh(new THREE.PlaneGeometry(7.6 - y * 0.15, h * 0.24, 6, 4), rag); const P = s.geometry.attributes.position; for (let q = 0; q < P.count; q++) { if (P.getY(q) < -h * 0.06 && Math.sin(P.getX(q) * 3.1 + y) > 0.2) P.setY(q, P.getY(q) + h * 0.08); P.setZ(q, Math.sin(P.getX(q) * 0.9) * 0.3); }
        s.position.set(0, 2 + y - h * 0.13, -v + 0.2); s.rotation.y = Math.PI / 2 + 0.15; G.add(s); } }
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 12, 6).rotateX(Math.PI / 2 - 0.35), lam('#2e2820')); bow.position.set(0, 4.5, -(L / 2 + 4)); G.add(bow);
    // the ladder down her starboard side, to your rail (rungs, and its ropes)
    for (let k = 0; k < 9; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.8), wood); r.position.set(BW + 0.12, -0.2 + k * 0.38, -(GWS.LADDER[1] - 1.0)); G.add(r); }
    for (const dz of [-0.4, 0.4]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5), rope.clone()); r.position.set(BW + 0.14, 1.4, -(GWS.LADDER[1] - 1.0) + dz); G.add(r); }
    // her lamps, burning green-white, and the glow of her
    GW3.ganLamps = [];
    for (const [x, y, v] of [[0, 4.4, -15], [0, 6.0, 15.5], [BW, 3.4, 0]]) { const s = glowSp(0xb8ffd8, 1.6); s.position.set(x, y, -v); G.add(s); GW3.ganLamps.push(s); }
    GW3.ganLight = new THREE.PointLight(0x9affc8, 0, 30, 1.4); GW3.ganLight.position.set(BW, 4, 0); G.add(GW3.ganLight);
    // the water pouring off her as she comes up
    GW3.pour = []; for (let k = 0; k < 26; k++) { const s = glowSp(0xa8c8e0, 1.4, { opacity: 0 }); G.add(s); GW3.pour.push({ s, u: (k % 2 ? 1 : -1) * BW, v: -L / 2 + (k / 26) * L, ph: k * 0.61 }); } }
  // ---------- the sea's group ----------
  const SG = GW3.SG = new THREE.Group(); grp.add(SG);
  // the rocks: the sailing game's own (src/gl3d.js rockMesh), shown only while lit
  GW3.rocks = sea.rocks.map(r => { const M = rockMesh(r, B); M.root.position.set(r.x, 0, -r.y); M.root.visible = false; SG.add(M.root); for (const m of M.mats) m.emissive = new THREE.Color(0, 0, 0); return { r, M }; });
  // the mark: a ring of the Gannet's old spars standing out of the water, weed and gulls' white on them
  { const sp = lam('#3a3026'), wh = lam('#a8a490'), wd = lam('#1e3020');
    for (const s of sea.spars) { const g0 = new THREE.Group(); g0.position.set(s.x, 0, -s.y); g0.rotation.set(s.lx, s.ph, s.ly); SG.add(g0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.7, s.r, s.h + 2, 7), sp); m.position.y = s.h / 2 - 1; g0.add(m);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.72, s.r * 0.72, 0.4, 7), wh); tip.position.y = s.h - 0.8; g0.add(tip);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 1.08, s.r * 1.12, 0.9, 7), wd); w.position.y = 0.2; g0.add(w);
      if (s.yard) { const y = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, s.h * 0.6, 6).rotateZ(Math.PI / 2 - 0.3), sp); y.position.y = s.h * 0.7; g0.add(y); } }
    GW3.markGlow = glowSp(0x9affc8, 70, { opacity: 0 }); GW3.markGlow.position.copy(gsv(gwsMark()[0], gwsMark()[1], 3)); SG.add(GW3.markGlow); }
  if (GWS_LEG && GWS_LEG.b3) GWS_LEG.b3(SG, GW3);   // [fogrun] the island she's to beach on
  // Plimsoll: his drawing, walking upright on the water, his blue shoes glowing; and his ring, faint on the sea
  { const P = GW3.plim = new THREE.Group(); SG.add(P);
    GW3.plimS = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false })); GW3.plimS.scale.set(3.4 * SK.PLIM_ASPECT, 3.4, 1); GW3.plimS.position.y = 1.7; P.add(GW3.plimS);
    GW3.shoes = [glowSp(0x6ed7ff, 1.4), glowSp(0x6ed7ff, 1.4)]; GW3.shoes.forEach((s, i) => { s.position.set(i ? 0.35 : -0.35, 0.15, 0); P.add(s); });
    GW3.plimGlow = glowSp(0x5fd3ff, 6, { opacity: 0.25 }); GW3.plimGlow.position.y = 1.6; P.add(GW3.plimGlow);
    GW3.ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96).rotateX(-Math.PI / 2), basic(0x5fd3ff, { transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); GW3.ring.position.y = 0.4; SG.add(GW3.ring); }
  // Maren on the water: her drawing, pale as moonlight, a cold glow round her and her reflection under her
  { const M = GW3.mar = new THREE.Group(); SG.add(M);
    GW3.marS = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false })); GW3.marS.scale.set(4.6 * SK.MAREN_ASPECT, 4.6, 1); GW3.marS.position.y = 2.3; M.add(GW3.marS);
    GW3.marR = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, opacity: 0.2 })); GW3.marR.scale.set(4.6 * SK.MAREN_ASPECT, -2.2, 1); GW3.marR.position.y = -1.0; M.add(GW3.marR);
    GW3.marG = glowSp(0xc8dcff, 9, { opacity: 0.3 }); GW3.marG.position.y = 2.2; M.add(GW3.marG); }
  // the flares: a bright star and its light, high over the water; the Light's glare when the beam's on you
  GW3.fl = [0, 1].map(() => { const s = glowSp(0xffd0a0, 22); s.visible = false; SG.add(s); const L = new THREE.PointLight(0xffc890, 0, 520, 1.1); SG.add(L); const c = glowSp(0xfff4e0, 5); s.add(c); c.scale.setScalar(0.25); return { s, L }; });
  GW3.glare = glowSp(0xffe6b0, 120, { opacity: 0 }); GW3.glare.position.set(0, 56, 0); SG.add(GW3.glare);
  // the wake: patches of foam laid on the sea along her sides and under her stern, left behind as she goes
  GW3.foam = []; const fm = z3Soft('rgba(230,240,255,0.7)', 'rgba(230,240,255,0)');
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: fm, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.position.y = 0.32; m.visible = false; SG.add(m); GW3.foam.push({ m, t: 9, life: 3, s: 1 }); }
  GW3.foamI = 0; GW3.foamD = 0; GW3.last = null;
}
// put a patch of foam at local (u, v), the sea's own place at this moment
function gwsFoam(V, u, v, s, life) {
  const F = GW3.foam[GW3.foamI = (GW3.foamI + 1) % GW3.foam.length], c = Math.cos(V.h), sn = Math.sin(V.h);
  const x = V.x + u * c + v * sn, y = V.y - u * sn + v * c;
  F.m.position.set(x, 0.3 + Math.random() * 0.05, -y); F.t = 0; F.life = life; F.s = s; F.m.rotation.y = Math.random() * 6.28; F.m.visible = true;
}
function gws3d(dt) {
  const S = RAID.st, V = S.V || S.B; if (!GW3.on || !GW3.SG || !V) return;
  const t = g.t, D = GWS.D, m = FPS.me, now = RAID.ct || 0, c = Math.cos(V.h), sn = Math.sin(V.h);
  // the sea's group, placed by the inverse of her pose: the Light's place in the deck's frame, and turned by her heading
  const Lx = FPSC.CX - (V.x * c - V.y * sn), Ly = FPSC.CY - (V.x * sn + V.y * c);
  GW3.SG.position.set(Lx, 0, -Ly); GW3.SG.rotation.set(0, V.h, 0); GW3.Lw = [Lx, Ly];
  // ---------- the deck ----------
  GW3.wheel.rotation.z = -V.rudder * 2.6;
  if (S.bellSwing > 0 && !reduceMotion) GW3.bell.rotation.x = Math.sin((1 - S.bellSwing) * 30) * 0.7 * S.bellSwing; else GW3.bell.rotation.x *= 0.9;
  // the lantern: steady but for a flicker, guttering and reddening when she's about to step nearer
  { const gut = S.tellT > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(t * 31) * Math.sin(t * 7)) : 1, fl = reduceMotion ? 1 : (0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 4.7)) * gut;
    GW3.light.intensity = 1.6 * fl; GW3.light.color.setRGB(1, S.tellT > 0 ? 0.55 : 0.78, S.tellT > 0 ? 0.35 : 0.5); GW3.flame.scale.set(fl, 1.8 * fl, fl); GW3.lanHalo.material.opacity = 0.85 * fl;
    GW3.lan.rotation.z = reduceMotion ? 0 : Math.sin(t * 1.1) * 0.06; GW3.lan.rotation.x = reduceMotion ? 0 : Math.sin(t * 0.8) * 0.05; }
  GW3.flLamp.visible = S.flareCd <= 0; GW3.flLamp.material.opacity = 0.6 + 0.3 * Math.sin(t * 3);
  // the sails: the main swung out to leeward on its boom, full as she's making sail; the jib the same; the pennant
  { const fill = clamp(0.25 + V.sail * 0.55, 0.25, 1.15), side = 1, swing = 0.32 + V.rudder * 0.12 + (reduceMotion ? 0 : Math.sin(t * 0.5) * 0.02);
    GW3.main.rotation.y = -swing;
    gwsSailShape(GW3.mainS, [[0, -0.15, D + 2.45], [0, -9.4, D + 2.45], [0, -0.15, D + 10.5], [0, -8.2, D + 12.9]], side, fill * 0.9, t);
    const [mu, mv] = GWS.MAST, hd = [mu, mv + 0.25, D + 11.0], tk = [0, GWS.SPRIT - 0.3, D + 1.3], cl = [0.9 + 0.3 * fill, mv + 3.4, D + 1.75];
    gwsSailShape(GW3.jibS, [tk, cl, hd, hd], side, fill * 0.55, t + 1);
    const be = new THREE.Vector3(Math.sin(swing) * -9.4 * -1, D + 2.35, 0), bx = mu + Math.sin(swing) * 9.4, bz = -(mv - Math.cos(swing) * 9.4);
    const P = GW3.sheet.geometry.attributes.position; P.setXYZ(0, bx, D + 2.3, bz); P.setXYZ(1, 0.9, D + 0.95, -(mv - 9.6)); P.needsUpdate = true; void be;
    GW3.pen.rotation.y = Math.PI / 2 + (reduceMotion ? 0 : Math.sin(t * 6) * 0.25); }
  // the holes, the patches, the water welling up; the sea over her deck, as high as she's flooded
  GW3.holes.forEach((h, i) => { const open = S.holes.includes(i); h.hole.visible = open; h.patch.visible = !open && !!((S.patched | 0) & (1 << i)); if (open) { h.spray.material.opacity = 0.3 + 0.25 * Math.abs(Math.sin(t * 5 + i)); h.spray.scale.setScalar((0.7 + 0.3 * Math.sin(t * 3.3 + i)) * (1 + S.flood * 0.8)); h.spray.position.y = 0.25 + S.flood * 0.5; h.wet.position.y = -0.04 + 0.025 * Math.sin(t * 2.4 + i); } });
  { const sunk = S.ph === 'sunk' ? clamp(S.sinkT / GWS.SINK, 0, 1) : 0, f = Math.max(S.flood, sunk);
    GW3.flood.visible = f > 0.015; GW3.flood.material.opacity = 0.32 + 0.4 * f; GW3.flood.position.y = D + 0.02 + f * 0.45 + sunk * 2.4;
    if (!reduceMotion) { GW3.flood.rotation.x = Math.sin(t * 0.9) * 0.012 * f; GW3.flood.rotation.z = Math.sin(t * 0.7 + 1) * 0.016 * f; } }
  // Maren on the deck, or on the bowsprit
  if (!GW3.T.maren) { GW3.T.maren = gwsImgTex(IMG.maren, true); if (GW3.T.maren) { for (const s of [GW3.marS, GW3.marR, GW3.mDeck, GW3.mSprit]) { s.material.map = GW3.T.maren; s.material.needsUpdate = true; } } }
  GW3.mDeck.visible = S.abT > 0 && !!GW3.T.maren; if (GW3.mDeck.visible) GW3.mDeck.material.opacity = Math.min(1, S.abT * 2) * (reduceMotion ? 0.9 : 0.75 + 0.25 * Math.random());
  GW3.mSprit.visible = S.appT > 0 && !!GW3.T.maren; if (GW3.mSprit.visible) GW3.mSprit.material.opacity = Math.min(1, S.appT * 3) * 0.85;
  // the Gannet: up out of the sea alongside while you hold her in the ring, then lying there with her lamps lit
  { const G = GW3.gan, k = S.ph === 'rise' ? clamp(S.riseT / GWS.RISE, 0, 1) : S.ph === 'ladder' ? 1 : 0, e = 1 - Math.pow(1 - k, 2.2);
    G.visible = k > 0; if (k > 0) {
      G.position.y = -13 + e * 13 + (reduceMotion ? 0 : Math.sin(t * 0.6) * 0.12); G.rotation.z = (1 - e) * 0.45 + (reduceMotion ? 0 : Math.sin(t * 0.5) * 0.01); G.rotation.x = (1 - e) * -0.12;
      const lit = clamp((k - 0.55) / 0.45, 0, 1); GW3.ganLamps.forEach((s, i) => { s.material.opacity = lit * (0.6 + 0.3 * Math.sin(t * 2 + i)); }); GW3.ganLight.intensity = lit * 1.4;
      for (const P of GW3.pour) { const a = clamp(1 - Math.abs(k - 0.6) * 2.2, 0, 1) * (S.ph === 'ladder' ? 0.25 : 1); const y = 3 - ((t * 3 + P.ph) % 1) * 6; P.s.position.set(P.u * 1.02, y, -P.v); P.s.material.opacity = a * 0.35; P.s.scale.set(0.8, 2.6, 1); } } }
  // ---------- the sea ----------
  // the rocks: shown as they're lit, warm in the beam
  const beam = wrapPi(gwBeam());
  for (const R of GW3.rocks) {
    const r = R.r, k = r.lit || 0, root = R.M.root; root.visible = k > 0.01;
    if (!root.visible) continue;
    const warm = r.flare > now ? 0.7 : Math.abs(angDiff(bearingOf(r.x, r.y), beam)) < gwsHalf() * 1.6 ? 1 : 0.05;
    for (const mt of R.M.mats) { mt.opacity = k; mt.emissive.setRGB(0.22 * k * warm, 0.19 * k * warm, 0.13 * k * warm); }
    R.M.foamM.opacity = 0.3 * k;
  }
  if (GWS_LEG && GWS_LEG.f3) GWS_LEG.f3(dt, V);   // [fogrun]
  GW3.markGlow.material.opacity = GWS_LEG ? 0 : S.ph === 'sail' ? clamp(1 - gwsToMark(V) / 900, 0, 1) * 0.22 * (0.7 + 0.3 * Math.sin(t * 1.3)) : S.ph === 'rise' ? 0.35 : 0;
  // Plimsoll (turned to walk the way he's going, across your view) and his ring while he's keeping her off you
  { if (!GW3.T.plim) { GW3.T.plim = gwsImgTex(IMG.plim, false); GW3.T.plimF = gwsImgTex(IMG.plim, false, true); if (GW3.T.plim) { GW3.plimS.material.map = GW3.T.plim; GW3.plimS.material.needsUpdate = true; } }
    const P = S.pl, bob = P.w ? Math.abs(Math.sin(P.ph)) * 0.25 : Math.sin(P.ph) * 0.05;
    GW3.plim.position.set(P.x, bob, -P.y); GW3.plim.visible = gwsPlim();   // [fogrun]
    // (the picture faces left: flipped when he's walking to the right across where you're looking)
    if (GW3.T.plim) { const dirL = (P.dx || 0) * c - (P.dy || 1) * sn, dirLy = (P.dx || 0) * sn + (P.dy || 1) * c, look = m.h, right = dirL * Math.cos(look) - dirLy * Math.sin(look);
      const want = right > 0 ? GW3.T.plimF : GW3.T.plim; if (GW3.plimS.material.map !== want) { GW3.plimS.material.map = want; GW3.plimS.material.needsUpdate = true; } }
    GW3.plimS.material.rotation = reduceMotion ? 0 : P.w ? Math.sin(P.ph) * 0.06 : Math.sin(P.ph * 0.7) * 0.015;
    const d = Math.hypot(P.x - V.x, P.y - V.y), vis = clamp(1.25 - d / 700, 0.35, 1); GW3.plimS.material.opacity = vis;
    GW3.shoes.forEach((s, i) => { s.material.opacity = 0.75 + 0.25 * Math.sin(t * 4 + i); s.position.y = 0.15 + (P.w ? Math.max(0, Math.sin(P.ph + i * Math.PI)) * 0.25 : 0); });
    const guard = gwsGuarded(S, V), R = gwsGuardR(V.v);
    GW3.ring.visible = guard && gwsPlim() && (S.ph === 'sail' || S.ph === 'rise'); GW3.ring.position.set(P.x, 0.4, -P.y); GW3.ring.scale.set(R, 1, R); GW3.ring.material.opacity = reduceMotion ? 0.16 : 0.14 + 0.05 * Math.sin(t * 2.4); }
  // Maren, out on the water (pale, swaying, a flicker to her as she comes close)
  { const M = S.mar; GW3.mar.position.set(M.x, 0, -M.y); GW3.mar.visible = gwsMaren() && !!GW3.T.maren && S.ph !== 'ladder' && S.ph !== 'sunk' && !(S.abT > 0);
    const sway = reduceMotion ? 0 : Math.sin(t * 1.3) * 0.035 + (M.st >= 3 ? Math.sin(t * 17) * 0.012 : 0);
    let a = 0.85; if (M.st >= 3 && !reduceMotion && Math.random() < 0.12) a *= 0.35;
    GW3.marS.material.rotation = sway; GW3.marS.material.opacity = a; GW3.marR.material.opacity = a * 0.18; GW3.marG.material.opacity = 0.22 + 0.1 * Math.sin(t * 1.7);
    const sc = 1 + Math.sin(t * 0.9) * 0.015; GW3.marS.scale.set(4.6 * SK.MAREN_ASPECT * sc, 4.6 * sc, 1); }
  // the flares, up from where she was and slowly down
  GW3.fl.forEach((F, i) => { const f = S.flares[S.flares.length - 1 - i]; F.s.visible = !!f; F.L.intensity = 0; if (!f) return;
    const up = Math.min(1, f.t / 1.2), z = 8 + up * 70 - Math.max(0, f.t - 1.2) * 5, k = f.t < GWS.FLARE_T ? 1 : Math.max(0, GWS.FLARE_T + 1 - f.t);
    F.s.position.set(f.x, z, -f.y); F.L.position.copy(F.s.position); F.L.intensity = 3.2 * k * (reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 23)); F.s.material.opacity = k; });
  // the Light's glare, when the beam's turned on you
  { const fb = 1 - Math.min(1, Math.abs(angDiff(beam, bearingOf(V.x, V.y))) / 0.32), on = Math.abs(beam) < SK.SHADE + gwsHalf();
    GW3.glare.material.opacity = on ? fb * fb * 0.9 * (typeof flashK === 'function' ? flashK() : 1) : 0; GW3.glare.scale.setScalar(80 + 240 * fb); }
  // the wake: foam along her sides and under her stern, more the faster she goes
  { const L0 = GW3.last; GW3.last = { x: V.x, y: V.y };
    if (L0) GW3.foamD += Math.hypot(V.x - L0.x, V.y - L0.y);
    const gap = clamp(5 / Math.max(1, V.v), 0.25, 1.6);
    while (GW3.foamD > gap) { GW3.foamD -= gap; for (const s of [-1, 1]) gwsFoam(V, s * (gwsHw(7) + 0.2), 7 + Math.random() * 2, 1.4 + V.v * 0.05, 2.5); gwsFoam(V, (Math.random() - 0.5) * 2.5, GWS.STERN - 0.6, 2 + V.v * 0.08, 4); }
    if (GW3.foamD > 50) GW3.foamD = 0;
    for (const F of GW3.foam) { if (F.t >= F.life) { F.m.visible = false; continue; } F.t += dt; const k = F.t / F.life; F.m.material.opacity = 0.5 * (1 - k) * Math.min(1, F.t * 6); const s = F.s * (1 + k * 2.2); F.m.scale.set(s, 1, s * 0.7); } }
}

// ---------- the sea in her frame (src/gl3d.js gl3dRender, just before it draws) ----------
// The sea's waves, the beam on the water and the Light's glint on it are worked out in the sailing frame (uGw, uGp:
// her heading and the deck's middle, her place; uLt: the Light's place in the deck's frame); the sailing game's own
// coast and lighthouse put where the Light is from here and turned with her; its beam and spotlight too; no island's
// cut in the sea, no coast's; the moon turned with the sky. Put back as they were once she's gone.
// [fogrun] the Light's beam is three times as wide on a fog run (its half-width, radians): it lights rocks for three
// times as long a sweep, and draws that wide on the water and in the air
function gwsHalf() { return SK.HALF_BEAM * (typeof FR !== 'undefined' && FR.on && typeof RAID !== 'undefined' && RAID.map === 'fogrun' ? 3 : 1); }
function gwsGL(u) {
  if (!gwsOn() || !GW3.on || !GW3.Lw) { if (GW3.gl) gwsGLReset(u); return; }
  const S = RAID.st, V = S.V || S.B, c = Math.cos(V.h), s = Math.sin(V.h), [Lx, Ly] = GW3.Lw, beam = wrapPi(gwBeam());
  GW3.gl = true;
  if (u.uGw) { u.uGw.value.set(c, s, FPSC.CX, FPSC.CY); u.uGp.value.set(V.x, V.y); u.uLt.value.set(Lx, Ly); }
  u.uIsle.value.set(0, 0, 1, 0); u.uCap.value = 1e3; u.uCoast.value = -1e9;
  u.uBeam.value = beam; u.uBeamOn.value = 1; u.uShip.value.set(FPSC.CX + 0.4, FPSC.CY + GWS.MAST[1]); u.uLR.value = 22; u.uLamp.value = 1.2;
  const mb = MOON.b - V.h, me = MOON.e; u.uMoonDir.value.set(Math.sin(mb) * Math.cos(me), Math.sin(me), -Math.cos(mb) * Math.cos(me)).normalize();
  GL3D.moon.position.set(FPSC.CX + Math.sin(mb) * 1000, 400, -FPSC.CY - Math.cos(mb) * 1000); GL3D.moon.target.position.set(FPSC.CX, 0, -FPSC.CY); GL3D.moon.target.updateMatrixWorld();
  if (typeof GFX !== 'undefined') GFX.skyTurn = V.h;
  // (going down: the sea comes up over her)
  GL3D.sea.position.y = S.ph === 'sunk' ? clamp(S.sinkT / GWS.SINK, 0, 1) * (GWS.D + FPSC.GROUND + 2.6) : 0;
  if (GL3D.coast) { GL3D.coast.position.set(Lx, 0, -Ly); GL3D.coast.rotation.set(0, V.h, 0); }
  if (GL3D.tower) GL3D.tower.visible = true;
  const on = Math.abs(beam) < SK.SHADE + gwsHalf(), wb = beam - V.h, bw = gwsHalf() / SK.HALF_BEAM;
  if (u.uHalf) u.uHalf.value = gwsHalf();
  if (GL3D.beam) { GL3D.beam.visible = on; GL3D.beam.position.set(Lx, 54, -Ly); GL3D.beam.rotation.set(0, -wb, 0); GL3D.beam.scale.set(bw, 1, 1); }
  if (GL3D.spot) { GL3D.spot.visible = true; GL3D.spot.position.set(Lx, 54, -Ly); GL3D.spot.target.position.set(Lx + Math.sin(wb) * 3000, 0, -(Ly + Math.cos(wb) * 3000)); GL3D.spot.target.updateMatrixWorld(); GL3D.spot.intensity = on ? 2.2 : 0; GL3D.spot.angle = Math.min(1.2, gwsHalf()); }
  GL3D.amb.intensity = GWS_LEG && GWS_LEG.amb ? GWS_LEG.amb[0] : 0.36; GL3D.moon.intensity = GWS_LEG && GWS_LEG.amb ? GWS_LEG.amb[1] : 0.16;   // [fbsea] (a brighter night)
}
function gwsGLReset(u) {
  if (typeof GL3D === 'undefined' || !GL3D.sea) return;
  u = u || GL3D.sea.material.uniforms; GW3.gl = false;
  if (u.uGw) { u.uGw.value.set(1, 0, 0, 0); u.uGp.value.set(0, 0); u.uLt.value.set(0, 0); }
  GL3D.sea.position.y = 0;
  if (GL3D.coast) { GL3D.coast.position.set(0, 0, 0); GL3D.coast.rotation.set(0, 0, 0); }
  if (GL3D.spot) { GL3D.spot.position.set(0, 54, 0); GL3D.spot.angle = SK.HALF_BEAM; }
  if (GL3D.beam) GL3D.beam.scale.set(1, 1, 1); if (u.uHalf) u.uHalf.value = SK.HALF_BEAM;
  if (typeof GFX !== 'undefined') GFX.skyTurn = 0;
}

// ---------- painted on top ----------
// What she's doing, under the raid's own line; the ship's panel (planks, flood, the bell, a flare, Maren, her speed);
// a bearing strip along the top, as at sea (the Light, Plimsoll and his ring, Maren, the mark, which way her bow is);
// at the wheel, her rudder and her sail; a hole being patched; Maren about to step, or aboard; going down.
function gwsHud(phone, mono, fell) {
  const S = RAID.st, V = S.V || S.B, m = FPS.me; if (!V) return;
  const L = Math.max(14, FPS.safeLeft || 0), top = fpsHudTop() + (phone ? 32 : 44), t = g.t;
  const dm = gwsToMark(V);
  let line;
  if (GWS_LEG && GWS_LEG.line) line = GWS_LEG.line(S, dm);   // [fogrun]
  else if (S.ph === 'sail') line = `Out through the skerries to the Gannet’s mark: ${Math.round(dm).toLocaleString('en')} m`;
  else if (S.ph === 'rise') line = `Hold her inside the ring of spars: the Gannet is coming up (${Math.round(S.riseT / GWS.RISE * 100)}%)`;
  else if (S.ph === 'ladder') { const n = (ZM.net === 'client' ? ZM.hum.length : (ZM.players || []).length) || 1; line = S.ab.includes(m.id) ? `Aboard the Gannet: ${S.ab.length} of ${n}. Waiting for the others${S.firstAb || S.ab.length ? '' : ''}` : `The Gannet is alongside: climb her side (Use at her ladder, port rail) · ${S.ab.length} of ${n} aboard`; }
  else line = 'She’s going down.';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 10 : 13); ctx.fillStyle = S.ph === 'sail' ? 'rgba(236,228,207,0.8)' : '#bfe4ff';
  ctx.fillText(line, L, top, W * 0.55); fpsHudNote(top + (phone ? 14 : 18));
  // ---------- the ship's panel ----------
  { const x = L, y = top + (phone ? 20 : 28), w = phone ? 150 : 214, rh = phone ? 14 : 18, F = mono(phone ? 9 : 11);
    ctx.fillStyle = 'rgba(8,10,14,0.5)'; ctx.fillRect(x - 6, y - 6, w + 12, rh * 5 + 12);
    ctx.font = F; ctx.textBaseline = 'middle';
    const lab = (s, yy, col) => { ctx.fillStyle = col || 'rgba(236,228,207,0.62)'; ctx.textAlign = 'left'; ctx.fillText(s, x, yy); };
    const val = (s, yy, col) => { ctx.fillStyle = col || 'rgba(236,228,207,0.9)'; ctx.textAlign = 'right'; ctx.fillText(s, x + w, yy); };
    // planks and the flood
    let yy = y + rh / 2; const pl = gwsPlanks();
    lab('PLANKS', yy);
    for (let i = 0; i < GWS.PLANKS; i++) { ctx.fillStyle = i < pl ? '#c8a878' : `rgba(200,80,60,${0.5 + 0.3 * Math.sin(t * 6)})`; ctx.fillRect(x + (phone ? 52 : 66) + i * (phone ? 12 : 15), yy - 4, phone ? 9 : 12, 8); }
    { const fx = x + (phone ? 104 : 136), fw = w - (fx - x), f = S.flood; ctx.fillStyle = 'rgba(80,70,60,0.6)'; ctx.fillRect(fx, yy - 4, fw, 8); ctx.fillStyle = f > 0.66 ? `rgba(220,90,70,${0.75 + 0.25 * Math.sin(t * 8)})` : '#4a90c0'; ctx.fillRect(fx, yy - 4, fw * f, 8); ctx.fillStyle = 'rgba(236,228,207,0.5)'; ctx.font = mono(phone ? 7 : 9); ctx.textAlign = 'left'; ctx.fillText('FLOOD', fx + 2, yy - (phone ? 9 : 11)); ctx.font = F; }
    // the bell and a flare
    yy += rh; lab('BELL', yy); val(S.bellCd > 0 ? `${Math.ceil(S.bellCd)} s` : 'READY · AT THE MAST', yy, S.bellCd > 0 ? 'rgba(236,228,207,0.55)' : '#ffd88a');
    yy += rh; lab('FLARE', yy); val(S.flareCd > 0 ? `${Math.ceil(S.flareCd)} s` : 'READY · THE LOCKER AFT', yy, S.flareCd > 0 ? 'rgba(236,228,207,0.55)' : '#ff9a7a');
    // Maren
    yy += rh; const M = S.mar, md = Math.round(Math.hypot(M.x - V.x, M.y - V.y)), held = gwsGuarded(S, V);
    if (GWS_LEG && GWS_LEG.row) { const r = GWS_LEG.row(); lab(r[0], yy); val(r[1], yy, r[2] || '#c8d4e0'); } else   // [fbsea] (its own line)
    if (!gwsMaren()) { lab('FOG', yy); val(`YOU CAN SEE ${Math.round(GWS_LEG.fog)} m`, yy, '#c8d4e0'); } else {   // [fogrun] (no Maren: how far the fog lets you see)
    lab('MAREN', yy, M.st >= 3 ? `rgba(216,230,255,${0.7 + 0.3 * Math.sin(t * 5)})` : null);
    val(S.abT > 0 ? 'ABOARD' : `${md} m ${gwsSide(S, md)}${held ? ' · HELD' : ''}`, yy, M.st >= 3 ? '#d8e6ff' : held ? '#8fd8ff' : 'rgba(236,228,207,0.85)'); }
    // her speed and sail, and who has the helm
    yy += rh; lab('HELM', yy); val(`${S.helm ? gwsNick(S.helm).toUpperCase() : 'NOBODY'} · ${V.v.toFixed(1)} m/s`, yy, S.helm ? 'rgba(236,228,207,0.9)' : '#e8b080');
    ctx.textBaseline = 'alphabetic'; }
  // ---------- the bearing strip ----------
  { const sw = phone ? Math.min(300, W * 0.42) : Math.min(560, W * 0.5), sx = cx - sw / 2, sy = phone ? Math.max(10, FPS.safeTop || 0) + 44 : 84, sh = phone ? 20 : 26, span = 1.9;
    const lb = sb => angDiff(wrapPi(sb - V.h), m.h), xb = d => cx + d / span * sw, inS = d => Math.abs(d) < span / 2 - 0.02;
    ctx.fillStyle = 'rgba(6,10,20,0.6)'; ctx.fillRect(sx, sy, sw, sh); ctx.strokeStyle = 'rgba(236,228,207,0.16)'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
    ctx.fillStyle = 'rgba(255,216,138,0.9)'; ctx.fillRect(cx - 0.75, sy, 1.5, 5);
    ctx.font = mono(phone ? 9 : 10); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let i = 0; i < 32; i++) { if (phone && i % 8) continue; const d = lb(i / 32 * Math.PI * 2); if (!inS(d)) continue; const xx = xb(d), card = i % 4 === 0; if (card) { ctx.fillStyle = 'rgba(143,152,171,0.9)'; ctx.fillText(names[i / 4], xx, sy + sh - 7); } ctx.fillStyle = 'rgba(143,152,171,0.5)'; ctx.fillRect(xx - 0.5, sy, 1, card ? 4 : 2.5); }
    const edge = (d, col) => { const left = d < 0, ex = left ? sx + 8 : sx + sw - 8, ym = sy + sh / 2; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex + (left ? -4 : 4), ym); ctx.lineTo(ex + (left ? 3 : -3), ym - 5); ctx.lineTo(ex + (left ? 3 : -3), ym + 5); ctx.closePath(); ctx.fill(); };
    // her bow
    { const d = angDiff(0, m.h); if (inS(d)) { ctx.fillStyle = 'rgba(236,228,207,0.85)'; ctx.fillRect(xb(d) - 1, sy + sh - 4, 2, 4); ctx.fillText('BOW', xb(d), sy + sh + 7); } }
    // the Light
    { const d = lb(bearingOf(-V.x, -V.y)); if (inS(d)) { const f = 1 - Math.min(1, Math.abs(angDiff(wrapPi(gwBeam()), bearingOf(V.x, V.y))) / 0.6); ctx.fillStyle = `rgba(255,216,138,${0.5 + 0.5 * f})`; const xx = xb(d); ctx.beginPath(); ctx.moveTo(xx, sy + 4); ctx.lineTo(xx + 3.5, sy + 14); ctx.lineTo(xx - 3.5, sy + 14); ctx.closePath(); ctx.fill(); } }
    // the mark ([fbsea] its label clears BOW by the label's own width, and stays under the strip)
    { const MK = gwsMark(), d = lb(bearingOf(MK[0] - V.x, MK[1] - V.y)); if (inS(d)) { const xx = xb(d); ctx.fillStyle = '#86cfae'; ctx.fillRect(xx - 5, sy + 7, 10, 6); if (!phone) { ctx.font = mono(9); const lab = GWS_LEG && GWS_LEG.markLab ? GWS_LEG.markLab() : `${Math.round(dm)} m`, lw = ctx.measureText(lab).width, lx = clamp(xx, sx + lw / 2, sx + sw - lw / 2); ctx.fillText(lab, lx, sy + sh + (inS(angDiff(0, m.h)) && Math.abs(lx - xb(angDiff(0, m.h))) < lw / 2 + 16 ? 19 : 7)); ctx.font = mono(10); } } else edge(d, '#86cfae'); }
    // Plimsoll, and his ring while he's keeping her off you
    if (gwsPlim()) { const P = S.pl, d = lb(bearingOf(P.x - V.x, P.y - V.y)), py = sy + sh * 0.68;
      if (inS(d)) { const xx = xb(d); ctx.fillStyle = '#5fd3ff'; ctx.beginPath(); ctx.arc(xx, py, 3, 0, 6.28); ctx.fill();
        const dd = Math.hypot(P.x - V.x, P.y - V.y), R = gwsGuardR(V.v);
        if (dd < R) { ctx.fillStyle = 'rgba(95,211,255,0.35)'; ctx.beginPath(); ctx.arc(xx, py, 6, 0, 6.28); ctx.fill(); ctx.strokeStyle = 'rgba(95,211,255,0.9)'; ctx.stroke(); }
        else if (dd < R * 1.5) { ctx.strokeStyle = 'rgba(95,211,255,0.6)'; ctx.beginPath(); ctx.arc(xx, py, 6, 0, 6.28); ctx.stroke(); } }
      else edge(d, '#5fd3ff'); }
    // Maren
    if (gwsMaren()) { const M = S.mar, d = lb(bearingOf(M.x - V.x, M.y - V.y)); if (inS(d)) { const xx = xb(d), a = M.st >= 3 ? 0.7 + 0.3 * Math.sin(t * 6) : 0.75; ctx.fillStyle = `rgba(216,230,255,${a})`; ctx.fillRect(xx - 1.5, sy + 5, 3, sh - 12); ctx.beginPath(); ctx.arc(xx, sy + 5, 2.5, 0, 6.28); ctx.fill(); } else if (M.st >= 2) edge(d, 'rgba(216,230,255,0.8)'); }
    ctx.textBaseline = 'alphabetic'; }
  // ---------- at the wheel ----------
  if (FPS.helm) {
    const bw = phone ? 160 : 240, x0 = cx - bw / 2, y0 = H - (phone ? 168 : 128);
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(x0 - 10, y0 - 22, bw + 20, phone ? 62 : 70);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 9 : 11); ctx.fillStyle = '#ffd88a';
    ctx.fillText(FPS.touch ? 'AT THE HELM · THE STICK STEERS AND SETS SAIL' : FPS.padLast ? 'AT THE HELM · LEFT STICK STEERS AND SETS SAIL' : 'AT THE HELM · A / D STEER · W MAKES SAIL · S SHORTENS', cx, y0 - 17);
    // the rudder: where it lies, across
    ctx.fillStyle = 'rgba(80,70,60,0.7)'; ctx.fillRect(x0, y0, bw, 6); ctx.fillStyle = 'rgba(236,228,207,0.5)'; ctx.fillRect(cx - 0.5, y0 - 2, 1, 10);
    ctx.fillStyle = '#ffd88a'; ctx.fillRect(cx + V.rudder * bw / 2 - 3, y0 - 2, 6, 10);
    // the sail: how much she's carrying
    const sk = clamp(V.sail / 3, 0, 1);
    ctx.fillStyle = 'rgba(80,70,60,0.7)'; ctx.fillRect(x0, y0 + 16, bw, 6); ctx.fillStyle = '#d8ccb0'; ctx.fillRect(x0, y0 + 16, bw * sk, 6);
    ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = 'rgba(236,228,207,0.7)'; ctx.textAlign = 'left'; ctx.fillText('RUDDER', x0, y0 + 7); ctx.fillText(`SAIL · ${V.v.toFixed(1)} m/s`, x0, y0 + 24); ctx.textAlign = 'right'; ctx.fillText('USE TO LET GO', x0 + bw, y0 + 24);
    ctx.textBaseline = 'alphabetic';
  }
  // patching a hole: a ring round the sights filling
  if (S.useI >= 0 && S.useT > 0) {
    const k = Math.min(1, S.useT / GWS.PATCH);
    ctx.strokeStyle = 'rgba(200,168,120,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, H / 2, 26, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#c8a878'; ctx.beginPath(); ctx.arc(cx, H / 2, 26, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
  }
  // Maren about to step nearer: the edges go cold; aboard, a flash of white
  if (S.tellT > 0 && !reduceMotion) { const a = 0.22 * Math.min(1, S.tellT), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.3, cx, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(120,20,20,0)'); gr.addColorStop(1, `rgba(120,20,20,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  if (S.abT > 1.6) { ctx.fillStyle = `rgba(220,230,255,${(S.abT - 1.6) * 0.5 * (typeof flashK === 'function' ? flashK() : 1)})`; ctx.fillRect(0, 0, W, H); }
  // going down: the sea closing over
  if (S.ph === 'sunk') { const k = clamp(S.sinkT / GWS.SINK, 0, 1); ctx.fillStyle = `rgba(4,14,22,${k * 0.85})`; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 26 : 40); ctx.fillStyle = `rgba(190,220,240,${k})`; ctx.fillText('She’s gone down', cx, H * 0.4); ctx.textBaseline = 'alphabetic'; }
  // the flood, big, when it's getting high
  if (S.flood > 0.5 && S.ph !== 'sunk') { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = mono(phone ? 11 : 14); ctx.fillStyle = `rgba(255,140,110,${0.7 + 0.3 * Math.sin(t * 6)})`; ctx.fillText(`TAKING WATER · ${Math.round(S.flood * 100)}% · PATCH THE HOLES`, cx, phone ? 74 : 130); ctx.textBaseline = 'alphabetic'; }
}
