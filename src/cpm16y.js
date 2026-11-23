'use strict';
// The Chronicle of the Light, mission 16 (The Harbour Pool): parts II and III, out in the fog (src/cpm16.js has the
// pool, the ball, the ships and part I; src/cpm16x.js the 3D).
//  II.  Out through the Gap (cp_m16tow). The boom's hauled aside (Orange's crew did it). Shove the buoy out of the gap
//       and north through the fog to the Hound's mooring (C16.MOOR, its spar and a faint ring on the water), and hold
//       it inside the ring, slow, for a moment: Holm shackles it to the chain. The packet Sorrel's bell comes nearer all
//       the while (M.sor, seconds until she's on the Hound: at nothing, she strikes and the mission is lost). Kittow's
//       gigs pull out of the fog: some to get a line on the buoy and row it off into the dark (ram the gig, or shoot
//       the men at her oars, and the line's gone), some to lay alongside the cutter and put two of the gang over her
//       rail (src/cpm02g.js's wreckers, on the deck). The rocks show only as close as the fog lets you see.
//  III. The Rook (cp_m16rook). Kittow's lugger has the buoy off the chain on a grapnel line and tows it off into the fog.
//       Ram her: the harder the knock the more it breaks her (the Gale behind it, harder still); shots at her crew do a
//       little. Her muskets: a glint along her rail, a moment's warning, a volley at the cutter's deck (crouch, or be
//       behind the mast); now and then her grapnels and two more of the gang over the rail. Broken to half she slips
//       the tow, the Patience comes out of the fog to take the buoy back to the Hound (and the Sorrel goes by it,
//       safe), and the Rook comes about to ram the cutter herself (a plank stove in, each time she lands one). Broken
//       through, she lays alongside and Kittow comes over the rail (m16_board): take him alive (he can't be brought
//       below a tenth of his strength, and yields at an eighth).
// Together it's host-authoritative, as part I: the gigs and the Rook in the stage's word (m16g, m16r); a joined
// player's shot at a gig or at the Rook goes to the host (raidAsk 'm16hit'), and every screen judges the volley's
// shot at its own player (as the gang's pistols are judged: src/cpm02g.js).

const C16Y = { SOR_T: 330, GIG_V: 4.6, TOW_V: 3.0, GIG_FIRST: 22, GIG_GAP: 17, GIG_MAX: 3, ROOK_HP: 130, SLIP: 0.55, VOL_CD: 7.5, VOL_WARN: 1.3, VOL_R: 75, GRAP_CD: 22, TOW_LEN: 16, KIT_HP: 7 };
// the packet's way in: from the north, down past the Hound to the harbour (p: 0 far out, 1 on the Hound)
const m16SorrelAt = p => p < 1 ? [430 - 40 * (1 - p), C16.HOUND[1] + 30 + 700 * (1 - p)] : [430 - 140 * (p - 1), C16.HOUND[1] + 30 - 520 * (p - 1)];
const m16Gang = () => ZM.z.filter(z => z.bt === 'cpgang' && !z.dead && !z.gone);
// (hosting) two of the gang over the cutter's rail, at the low place nearest (sx, sy) in the sea's frame
function m16Boarders(sx, sy, n, o) {
  const [lu, lv] = m16Loc(sx, sy); let best = null;
  for (const w of GWS_WIN) { const d = Math.hypot(w[0] - lu, w[1] - lv); if (!best || d < best.d) best = { w, d }; }
  const w = best.w, out = [];
  for (let i = 0; i < n; i++) { const u = w[0] - w[2] * (0.75 + i * 0.5), v = w[1] - w[3] * 0.75 + (i ? 0.9 : -0.2); const z = cpgSpawn(u, v, Object.assign({ aware: 1, gun: Math.random() < 0.45, h: bearingOf(-w[2], -w[3]) }, o || {})); if (z) { z.jz = z.fl = GWS.D; out.push(z); } }
  return out;
}
// a shot along (lh, lp) from (x, y, z), the world: does it pass within r of (sx, sy) in the sea, between z0 and z1 high?
function m16RayHits(x, y, z, lh, lp, sx, sy, r, z0, z1) {
  const [wx, wy] = m16Wd(sx, sy), cp = Math.cos(lp), dx = Math.sin(lh) * cp, dy = Math.cos(lh) * cp, dz = Math.sin(lp);
  const qx = wx - x, qy = wy - y, t = (qx * dx + qy * dy) / Math.max(1e-6, dx * dx + dy * dy); if (t < 0 || t > 260) return false;
  const hz = z + dz * t - FPSC.GROUND; if (hz < z0 || hz > z1) return false;
  return Math.hypot(qx - dx * t, qy - dy * t) < r;
}

// ---------- II. Out through the Gap ----------
function m16TowFresh() {
  const M = m16MatchFresh();
  Object.assign(M, { ph: 'tow', phT: 0, ball: m16Ball(C16.PC[0], m16Y1() - 16), gale: 100, boomOff: 1, sor: C16Y.SOR_T, moorT: 0, gigs: [], gigT: C16Y.GIG_FIRST, gigN: 0, markN: 'THE BUOY' });
  M.ships = [m16Ship('patience', C16.PC[0] - 62, m16Y1() - 22, Math.PI / 2, C16.BRIG)]; M.ships[0].v = 0;
  return M;
}
// (hosting) a gig out of the fog, a way off the buoy (or the cutter), on open water
function m16GigSpawn(M) {
  const b = M.ball, S = RAID.st, B = S.B, board = M.gigN % 2 === 1, ax = board ? B.x : b.x, ay = board ? B.y : b.y;
  for (let tries = 0; tries < 30; tries++) {
    const a = (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 1.4) + (board ? B.h : 0), d = 95 + Math.random() * 30, x = ax + Math.sin(a) * d, y = ay + Math.cos(a) * d;
    if (y < m16Y1() + 20 && x > m16X0() - 30 && x < m16X1() + 30) continue;
    let bad = false; m16Solid(x, y, 6, () => { bad = true; }); if (bad) continue;
    const G = { x, y, h: bearingOf(ax - x, ay - y), st: board ? 'board' : 'hook', hp: zmHp(RAIDC.ROUND + 2) * CPG.HP * 1.4 * (1 + 0.25 * (m16N() - 1)), t: 0, hx: x, hy: y, id: ++M.gigN };
    G.max = G.hp; M.gigs.push(G);
    if (M.gigN === 1) cpSay('kittow', 'There’s the keeper’s cutter, boys. Take that buoy off him.', 'cp_m16_25');
    m16Ev('oars', [Math.round(x), Math.round(y)]);
    return G;
  }
  return null;
}
// (hosting) a gig rows: for the buoy (to put a line on it and pull it off home), or for the cutter (to put men aboard
// her); rammed, she's stove in; her oarsmen shot, she's adrift
function m16GigTick(G, M, dt) {
  const S = RAID.st, B = S.B, b = M.ball; G.t += dt;
  if (G.st === 'sunk' || G.st === 'adrift') { G.t2 = (G.t2 || 0) + dt; if (b.tow === G.id) b.tow = 0; return; }
  let tx, ty, v = C16Y.GIG_V;
  if (G.st === 'hook') { if (b.moor || (b.tow && b.tow !== G.id)) { G.st = 'board'; } else { tx = b.x; ty = b.y; if (Math.hypot(b.x - G.x, b.y - G.y) < C16.R + 4) { G.st = 'tow'; b.tow = G.id; m16Ev('gigtow', G.id); cpaOnce('gt', 'holm', 'They’ve a line on the buoy! Ram that gig, or shoot the men at the oars.', 'cp_m16_26'); } } }
  if (G.st === 'tow') {
    if (b.moor) { G.st = 'off'; b.tow = 0; }
    else { const a = bearingOf(G.hx - b.x, G.hy - b.y) + Math.sin(G.t * 0.3) * 0.4; tx = G.x + Math.sin(a) * 30; ty = G.y + Math.cos(a) * 30; v = C16Y.TOW_V;
      // (the line: taut past its length, pulling the buoy after her)
      const dx = G.x - b.x, dy = G.y - b.y, d = Math.hypot(dx, dy); if (d > C16Y.TOW_LEN) { const k = (d - C16Y.TOW_LEN) * 2.4 * dt; b.vx += dx / d * k; b.vy += dy / d * k; const back = Math.min(d - C16Y.TOW_LEN, 2) * 0.5; G.x -= dx / d * back; G.y -= dy / d * back; } }
  }
  if (G.st === 'board') { tx = B.x; ty = B.y; v = C16Y.GIG_V * 1.15;
    if (gwsHullPts(B).some(p => Math.hypot(p.x - G.x, p.y - G.y) < p.w + 4.5)) { G.st = 'off'; const n = m16Gang().length; if (n < 3 + m16N()) { m16Boarders(G.x, G.y, Math.min(2, 4 + m16N() - n)); m16Ev('board', G.id); cpaOnce('bd', 'holm', 'Boarders! Over the rail with them!', 'cp_m16_27'); } } }
  if (G.st === 'off') { tx = G.x + (G.x - B.x); ty = G.y + (G.y - B.y); if (Math.hypot(G.x - B.x, G.y - B.y) > 160) G.gone = 1; }
  if (tx != null) { const want = bearingOf(tx - G.x, ty - G.y); G.h = wrapPi(G.h + clamp(angDiff(want, G.h), -1.2 * dt, 1.2 * dt)); G.x += Math.sin(G.h) * v * dt; G.y += Math.cos(G.h) * v * dt; }
  m16Solid(G.x, G.y, 3, o => { const dx = G.x - o.x, dy = G.y - o.y, d = Math.hypot(dx, dy), rr = o.r + 2; if (d < rr && d > 1e-4) { G.x += dx / d * (rr - d); G.y += dy / d * (rr - d); } });
  // (the cutter: a touch at any way on her and the gig's stove in, unless she's laid alongside to board)
  if (G.st !== 'board' || B.v > 9) for (const p of gwsHullPts(B)) if (Math.hypot(p.x - G.x, p.y - G.y) < p.w + 2) { m16GigSink(G, M, 'ram'); break; }
}
function m16GigSink(G, M, how, sid) {
  if (G.st === 'sunk' || G.st === 'adrift') return;
  const b = M.ball; if (b.tow === G.id) b.tow = 0;
  G.st = how === 'ram' ? 'sunk' : 'adrift'; G.t2 = 0;
  m16Ev(how === 'ram' ? 'gigsunk' : 'gigshot', [G.id, sid || '']);
}
const C16Y_GST = ['hook', 'tow', 'board', 'off', 'sunk', 'adrift'];
function m16PackGigs(o) { const M = RAID.st.m16; if (!M || !M.gigs) return; o.m16g = M.gigs.filter(G => !G.gone).map(G => [G.id, Math.round(G.x * 10) / 10, Math.round(G.y * 10) / 10, Math.round(G.h * 100) / 100, C16Y_GST.indexOf(G.st), Math.round(G.hp / G.max * 100)]); }
function m16ApplyGigs(o) {
  const M = RAID.st.m16; if (!M || !Array.isArray(o.m16g)) return;
  const was = new Map((M.gigs || []).map(G => [G.id, G]));
  M.gigs = o.m16g.map(a => { const G = was.get(a[0] | 0) || { id: a[0] | 0, x: +a[1], y: +a[2], h: +a[3], t: 0 }; G.x += (+a[1] - G.x) * 0.5; G.y += (+a[2] - G.y) * 0.5; G.h = +a[3]; G.st = C16Y_GST[a[4] | 0] || 'hook'; G.hpk = (a[5] | 0) / 100; return G; });
}
// a shot of yours at a gig, or at the Rook's crew
function m16Shot(x, y, z, lh, lp, by, dmg) {
  const S = RAID.st, M = S.m16; if (!M) return;
  const d = dmg == null ? 1 : dmg;
  for (const G of M.gigs || []) { if (G.st === 'sunk' || G.st === 'adrift' || G.gone) continue; if (m16RayHits(x, y, z, lh, lp, G.x, G.y, 2.3, 0.4, 2.4)) { FPS.hitT = 0.2; try { fpsHitSound(false); } catch (e) {} if (ZM.net === 'client') raidAsk('m16hit', ['g', G.id, d]); else m16Hit(FPS.me.id, 'g', G.id, d); return; } }
  const R = M.ships && M.ships[1]; if (R && !R.gone && (M.ph === 'rook' || M.ph === 'slip')) { const sh = Math.sin(R.h), ch = Math.cos(R.h); for (const t of [-R.L * 0.6, 0, R.L * 0.6]) if (m16RayHits(x, y, z, lh, lp, R.x + sh * t, R.y + ch * t, R.R * 1.1, 0.5, 4.5)) { FPS.hitT = 0.2; try { fpsHitSound(false); } catch (e) {} if (ZM.net === 'client') raidAsk('m16hit', ['r', 0, d]); else m16Hit(FPS.me.id, 'r', 0, d); return; } }
}
// (hosting) what a shot did
function m16Hit(sid, k, id, d) {
  const M = RAID.st.m16; if (!M) return; d = clamp(+d || 0, 0, 40);
  if (k === 'g') { const G = (M.gigs || []).find(q => q.id === (id | 0)); if (!G) return; G.hp -= d; if (G.hp <= 0) m16GigSink(G, M, 'shot', sid); }
  else if (k === 'r' && typeof m16RookDamage === 'function') m16RookDamage(d * 0.32, sid, false);
}
cpStage('m16tow', m16Hooks({
  n: 'Out through the Gap',
  banner: () => ({ text: 'Out through the Gap', t: 4.5, sub: 'Part II · the old marker, to the Hound, in the fog', col: '#c8d4e0' }),
  music: () => 'cpm16fog',
  prep() { m16Leg('tow'); },
  enter() {
    if (!GWS_LEG) m16Leg('tow');
    RAID_STAGES.gwsail.enter();
    RAID.st.m16 = m16TowFresh();
    if (ZM.net !== 'client') { cpObjective(''); cpWaypoint(null); }
    ZM.banner = this.banner();
    fpsFeed('The boom is hauled aside. Shove the buoy out through the gap and north to the Hound’s mooring, before the Sorrel comes in on it.');
    ZM.round = Math.max(ZM.round, 6);
  },
  tick(dt) {
    const S = RAID.st, M = S.m16, B = S.B; if (!M || !B) return;
    gwsTick(dt); m16GaleTick(dt); M.t += dt;
    if (M.t > 1.5) cpaOnce('t1', 'holm', 'Out through the gap, and keep the buoy before her. The Hound lies north, beyond the harbour mouth.', 'cp_m16_23');
    if (B.y > m16Y1() + 40) cpaOnce('t2', 'holm', 'Keep her close. In this, you’ll see the rocks when you’re on them.', 'cp_m16_24');
    // the packet's clock (it waits while a cinematic plays: the stage's clock does)
    if (!M.ball.moor) { M.sor -= dt; if (M.sor < C16Y.SOR_T * 0.4) cpaOnce('t5', 'holm', 'There’s the Sorrel’s bell. Closer now.', 'cp_m16_28'); if (M.sor <= 0 && !ZM.over) { cpFail('The Sorrel struck on the Hound in the fog'); return; } }
    // the gigs
    if (!M.ball.moor && M.ball.y > m16Y1() - 4) { M.gigT -= dt; if (M.gigT <= 0) { M.gigT = C16Y.GIG_GAP / Math.sqrt(1 + 0.4 * (m16N() - 1)) * (0.8 + Math.random() * 0.4); if (M.gigs.filter(G => G.st !== 'sunk' && G.st !== 'adrift' && !G.gone).length < C16Y.GIG_MAX) m16GigSpawn(M); } }
    const step = Math.min(dt, 0.05), n = Math.max(1, Math.ceil(step / (1 / 90)));
    for (let k = 0; k < n; k++) { const h = step / n; for (const G of M.gigs) if (!G.gone) m16GigTick(G, M, h); m16ShipVsCutter(M.ships[0], B); m16BallStep(M.ball, h, true); }
    M.gigs = M.gigs.filter(G => !G.gone && !((G.st === 'sunk' || G.st === 'adrift') && G.t2 > 12));
    // the mooring: the buoy inside the ring, slow, for a moment, and Holm has it on the chain
    const b = M.ball, dm = Math.hypot(b.x - C16.MOOR[0], b.y - C16.MOOR[1]);
    if (dm < 90) cpaOnce('t6', 'holm', 'There’s the Hound’s spar. Lay the buoy on the mark and hold it there.', 'cp_m16_29');
    if (!b.moor) { if (dm < C16.MOOR_R && Math.hypot(b.vx, b.vy) < 4.5 && !b.tow) { M.moorT += dt; if (M.moorT >= C16.MOOR_HOLD) { b.moor = 1; M.ph = 'moor'; M.phT = 3.2; m16Ev('moored'); cpaOnce('t7', 'holm', 'She’s on the chain! Fast as the rock itself.', 'cp_m16_30'); for (const G of M.gigs) if (G.st !== 'sunk' && G.st !== 'adrift') G.st = 'off'; } } else M.moorT = Math.max(0, M.moorT - dt * 2); }
    else { M.phT -= dt; if (M.phT <= 0 && m16Gang().length === 0 && !M.doneSent) { M.doneSent = 1; cpDone(); } else if (M.phT <= 0 && !M.gangSay) { M.gangSay = 1; fpsFeed('Clear the deck of the last of Kittow’s men.'); } }
  },
  qq(sid, k, a) { if (k === 'm16hit' && Array.isArray(a)) { m16Hit(sid, String(a[0]), a[1] | 0, +a[2] || 0); return true; } if (typeof cpgAsk === 'function' && cpgAsk(k, a)) return true; return false; },
  shot(x, y, z, lh, lp, by, dmg) { m16Shot(x, y, z, lh, lp, by, dmg); if (typeof cpgShot === 'function') cpgShot(x, y); },
  pack(o) { gwsPack(o); m16PackCommon(o); m16PackGigs(o); const M = RAID.st.m16; if (M) o.m16t = [Math.round(M.sor), Math.round(M.moorT * 10) / 10]; },
  apply(o) { gwsApply(o); m16ApplyCommon(o); m16ApplyGigs(o); const M = RAID.st.m16, a = o.m16t; if (M && Array.isArray(a)) { M.sor = +a[0] || 0; M.moorT = +a[1] || 0; } },
  me(dt) { gwsMe(dt); m16GaleMe(dt); m16GaleKeys(); m16MeCommon(dt); const M = RAID.st.m16; if (M && ZM.net === 'client' && !M.ball.moor) M.sor = Math.max(0, M.sor - dt); },
  hud(phone, mono, fell) {
    gwsHud(phone, mono, fell); const M = RAID.st.m16; if (!M || ZM.over || cpCineOn()) return;
    m16ClockHud(phone, mono, fell, M);
    if (!M.ball.moor) m16Marker(M.ball.x, M.ball.y, 9, M.ball.tow ? 'The buoy · on their line' : 'The buoy', M.ball.tow ? '#ff9a7a' : null, phone, mono);
    const b = M.ball; if (!b.moor && Math.hypot(b.x - C16.MOOR[0], b.y - C16.MOOR[1]) < 260) m16Marker(C16.MOOR[0], C16.MOOR[1], 2, 'The Hound’s mooring', '#a8e0c0', phone, mono);
  },
}));
// the packet's clock and the mooring's hold, under the bearing strip
function m16ClockHud(phone, mono, fell, M) {
  const y = phone ? 82 : 128, w = phone ? 220 : 320;
  ctx.fillStyle = 'rgba(6,10,20,0.62)'; ctx.fillRect(cx - w / 2, y, w, phone ? 30 : 38);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = fell(phone ? 15 : 20);
  const low = M.sor < 60, sec = Math.max(0, Math.ceil(M.sor));
  ctx.fillStyle = M.ball.moor ? '#a8e0c0' : low ? `rgba(255,140,110,${0.75 + 0.25 * Math.sin(g.t * 6)})` : '#e8dcc0';
  ctx.fillText(M.ball.moor ? 'The Hound is marked' : `The Sorrel is on the Hound in ${raidClock(sec)}`, cx, y + (phone ? 15 : 19));
  if (M.moorT > 0 && !M.ball.moor) { const k = clamp(M.moorT / C16.MOOR_HOLD, 0, 1); ctx.fillStyle = 'rgba(80,70,60,0.7)'; ctx.fillRect(cx - w / 2 + 10, y + (phone ? 32 : 42), w - 20, 5); ctx.fillStyle = '#a8e0c0'; ctx.fillRect(cx - w / 2 + 10, y + (phone ? 32 : 42), (w - 20) * k, 5); ctx.font = mono(phone ? 8 : 10); ctx.fillStyle = 'rgba(236,228,207,0.8)'; ctx.fillText('HOLD IT ON THE MARK · HOLM HAS THE SHACKLE', cx, y + (phone ? 46 : 58)); }
  ctx.textBaseline = 'alphabetic';
}
function m16LineMore(S, M) {
  if (M.ph === 'tow') { const b = M.ball; if (b.tow) return 'Kittow’s gig has a line on the buoy: ram her, or shoot her oarsmen'; return `Shove the buoy north to the Hound’s mooring · ${Math.round(Math.hypot(b.x - C16.MOOR[0], b.y - C16.MOOR[1]))} m`; }
  if (M.ph === 'moor') return m16Gang().length ? 'The buoy’s on the chain: clear the deck of the gang' : 'The buoy’s on the chain';
  if (M.ph === 'rook') return 'The Rook has the buoy in tow: ram her, and break her';
  if (M.ph === 'slip') return 'The Rook is coming about to ram you: meet her bow on, and break her';
  if (M.ph === 'board') return 'Kittow is aboard: take him alive';
  if (M.ph === 'taken') return 'Kittow yields';
  return '';
}

// ---------- III. The Rook ----------
function m16RookFresh() {
  const M = m16MatchFresh();
  Object.assign(M, { ph: 'rook', phT: 0, ball: m16Ball(C16.MOOR[0] + 22, C16.MOOR[1] + 12), gale: 100, boomOff: 1, rhp: C16Y.ROOK_HP, rmax: C16Y.ROOK_HP, volT: 5, volW: 0, volN: 0, grapT: 12, ramCd: 0, hitCd: 0, wp: 0, gigs: [], sorP: 0, markN: 'THE ROOK', kz: 0, kk: 1, tug: 0 });
  M.ball.tow = 1;
  M.ships = [m16Ship('patience', 300, 420, 0.6, C16.BRIG), m16Ship('rook', C16.MOOR[0] + 36, C16.MOOR[1] + 22, Math.PI / 2, C16.ROOK)];
  M.ships[0].gone = 1; M.ships[1].v = 6;
  return M;
}
// her way round in the fog while she tows: open water east and north of the Hound
const C16Y_LOOP = [[600, 600], [720, 690], [780, 560], [690, 430], [560, 400], [520, 500]];
// (hosting) damage to her: a ram (hard: a banner and her timbers flying) or her crew shot
function m16RookDamage(d, sid, ram) {
  const M = RAID.st.m16; if (!M || (M.ph !== 'rook' && M.ph !== 'slip') || d <= 0) return;
  M.rhp = Math.max(0, M.rhp - d); if (typeof raidBossDamage === 'function' && sid === FPS.me.id) raidBossDamage(d);
  if (ram) m16Ev('rookhit', Math.round(Math.min(1, d / 30) * 100));
  if (M.ph === 'rook' && M.rhp <= M.rmax * C16Y.SLIP) m16RookSlip(M);
  if (M.rhp <= 0) m16RookBroken(M);
}
// (hosting) she slips the tow and comes about for the cutter; the Patience out of the fog for the buoy
function m16RookSlip(M) {
  M.ph = 'slip'; M.ball.tow = 0; M.tug = 0;
  const P = M.ships[0]; Object.assign(P, { gone: 0, x: M.ball.x - 160, y: M.ball.y - 120, h: 0.9, v: 10 });
  m16Ev('slip');
  cpSay('dunn', 'Leave the mark to Orange, keeper! We’ll have it back on the chain. Get after him!', 'cp_m16_38');
  setTimeout(() => { if (RAID.st.m16 === M && !ZM.over && M.ph === 'slip') cpSay('kittow', 'If I can’t have the mark, I’ll have the cutter.', 'cp_m16_39'); }, 5200);
  setTimeout(() => { if (RAID.st.m16 === M && !ZM.over && M.ph === 'slip') cpSay('holm', 'He’s coming about to ram us! Meet him bow on, or get out of his way!', 'cp_m16_40'); }, 9500);
}
// (hosting) broken through: she lays alongside, and Kittow comes over the rail
function m16RookBroken(M) {
  if (M.ph === 'board' || M.ph === 'taken') return;
  M.ph = 'board'; M.volW = 0;
  const R = M.ships[1], B = RAID.st.B; R.v = 0;
  // (alongside, to port, her head the cutter's way)
  const a = B.h - Math.PI / 2; R.x = B.x + Math.sin(a) * (GWS.HB + R.R + 1.5); R.y = B.y + Math.cos(a) * (GWS.HB + R.R + 1.5); R.h = B.h;
  cpCine('m16_board', () => {
    const n = m16N(), z = cpgSpawn(-1.6, 1.0, { aware: 1, gun: true, n: 'Kittow', hp: zmHp(RAIDC.ROUND + 2) * CPG.HP * C16Y.KIT_HP * (1 + 0.5 * (n - 1)), h: Math.PI / 2 });
    if (z) { z.jz = z.fl = GWS.D; z.kit = 1; z.sp *= 0.92; M.kz = z.zn; }
    m16Boarders(R.x, R.y, Math.min(3, n + 1));
    cpSay('holm', 'Kittow’s aboard! Bring him down, but alive. The magistrate will want him.', 'cp_m16_44');
  });
}
// (hosting) the Rook sails: towing round her loop, or coming for the cutter; her muskets, her grapnels
function m16RookTick(M, dt) {
  const S = RAID.st, B = S.B, R = M.ships[1], b = M.ball; if (!R || R.gone) return;
  // (boarded: lashed alongside by her grapnels, to port, going the cutter's way)
  if (M.ph === 'board' || M.ph === 'taken') { const a = B.h - Math.PI / 2, o = GWS.HB + R.R + 1.5; R.x = B.x + Math.sin(a) * o; R.y = B.y + Math.cos(a) * o; R.h = B.h; R.v = B.v; R.w = 0; return; }
  const d = Math.hypot(B.x - R.x, B.y - R.y);
  if (M.ph === 'rook') {
    let [tx, ty] = C16Y_LOOP[M.wp % C16Y_LOOP.length]; if (Math.hypot(tx - R.x, ty - R.y) < 40) M.wp++;
    m16Helm(R, tx, ty, d < 60 ? 9.5 : 7.5, dt);
    // (the tow: the line taut from her stern, the buoy after her)
    const sx = R.x - Math.sin(R.h) * R.L, sy = R.y - Math.cos(R.h) * R.L, dx = sx - b.x, dy = sy - b.y, dd = Math.hypot(dx, dy);
    if (dd > C16Y.TOW_LEN) { const k = (dd - C16Y.TOW_LEN) * 3 * dt; b.vx += dx / dd * k; b.vy += dy / dd * k; }
  } else {
    // (for the cutter: where she'll be, a little ahead, to take her amidships)
    const lead = clamp(d / 25, 0, 2.2), tx = B.x + Math.sin(B.h) * B.v * lead, ty = B.y + Math.cos(B.h) * B.v * lead;
    m16Helm(R, tx, ty, d > 30 ? 15 : 12.5, dt);
  }
  // her hull against the cutter's: a ram either way
  const r = m16ShipVsCutter(R, B);
  if (M.ramCd > 0) M.ramCd -= dt;
  if (r.ram > 5 && M.ramCd <= 0) { M.ramCd = 0.9; m16RookDamage(Math.min(14, (r.ram - 3) * 1.25) * (M.galeT > 0 ? 1.6 : 1), S.helm || FPS.me.id, true); if (M.galeT > 0) cpaOnce('rg', 'kittow', 'Again, keeper? You’ll stave your own planks before mine.', 'cp_m16_37'); }
  else if (M.ph === 'slip' && r.rammed > 5 && M.ramCd <= 0 && r.at) { M.ramCd = 2.6; gwsStove(r.at.off, r.at.side); m16Ev('ram', 90); }
}
// (hosting) her muskets: a glint along her rail, and the volley a moment later; her grapnels, alongside
function m16RookGuns(M, dt) {
  const S = RAID.st, B = S.B, R = M.ships[1]; if (!R || R.gone || (M.ph !== 'rook' && M.ph !== 'slip')) return;
  const d = Math.hypot(B.x - R.x, B.y - R.y);
  if (M.volW > 0) { M.volW -= dt; if (M.volW <= 0) { M.volN++; m16Ev('vol', M.volN); } }
  else { M.volT -= dt; if (M.volT <= 0 && d < C16Y.VOL_R) { M.volT = C16Y.VOL_CD * (0.85 + Math.random() * 0.3) / Math.sqrt(1 + 0.25 * (m16N() - 1)); M.volW = C16Y.VOL_WARN; m16Ev('vol0'); cpaOnce('v0', 'holm', 'Down! Their muskets!', 'cp_m16_36'); } }
  M.grapT -= dt;
  if (M.grapT <= 0 && d < R.L + 16 && m16Gang().length < 2 + m16N()) { M.grapT = C16Y.GRAP_CD; m16Ev('grapnel'); m16Boarders(R.x, R.y, 2); cpaOnce('bd', 'holm', 'Boarders! Over the rail with them!', 'cp_m16_27'); }
}
// (hosting) the Patience takes the buoy back to the chain: to it, a line on it, and in to the mooring
function m16PatienceTick(M, dt) {
  const P = M.ships[0], b = M.ball; if (!P || P.gone || M.ph === 'rook') return;
  if (b.moor) { m16Helm(P, C16.MOOR[0] - 40, C16.MOOR[1] - 30, 3, dt); return; }
  if (!M.tug) { m16Helm(P, b.x, b.y, 12, dt); if (Math.hypot(P.x - b.x, P.y - b.y) < P.L + C16.R + 6) { M.tug = 1; m16Ev('grapnel'); fpsFeed('The Patience has a line on the buoy.'); } return; }
  m16Helm(P, C16.MOOR[0], C16.MOOR[1], 6, dt);
  const sx = P.x - Math.sin(P.h) * P.L, sy = P.y - Math.cos(P.h) * P.L, dx = sx - b.x, dy = sy - b.y, dd = Math.hypot(dx, dy);
  if (dd > 12) { const k = (dd - 12) * 3 * dt; b.vx += dx / dd * k; b.vy += dy / dd * k; }
  if (Math.hypot(b.x - C16.MOOR[0], b.y - C16.MOOR[1]) < C16.MOOR_R + 4) { b.moor = 1; M.tug = 0; m16Ev('moored'); cpaOnce('pm', 'dunn', 'She’s on the chain again, keeper! Orange has your mark.', 'cp_m16_41'); M.sorP = 0.001; }
}
cpStage('m16rook', m16Hooks({
  n: 'The Rook',
  banner: () => ({ text: 'The Rook', t: 4.5, sub: 'Part III · Kittow’s lugger, in the fog off the Hound', col: '#e8b090' }),
  music: () => { const M = RAID.st.m16; return M && (M.ph === 'board' || M.ph === 'taken') ? 'cpm16kittow' : 'cpm16rook'; },
  prep() { m16Leg('rook'); },
  enter() {
    if (!GWS_LEG) m16Leg('rook');
    RAID_STAGES.gwsail.enter();
    RAID.st.m16 = m16RookFresh();
    if (ZM.net !== 'client') { cpObjective(''); cpWaypoint(null); }
    ZM.banner = this.banner();
    fpsFeed('Kittow’s lugger has the buoy on a grapnel line. Ram her (the Gale makes it hurt), and break her.');
    ZM.round = Math.max(ZM.round, 7);
  },
  tick(dt) {
    const S = RAID.st, M = S.m16, B = S.B; if (!M || !B) return;
    gwsTick(dt); m16GaleTick(dt); M.t += dt;
    if (M.t > 1.5) cpaOnce('r1', 'holm', 'Put your bow into her! Use the Gale, and hit her hard.', 'cp_m16_35');
    const step = Math.min(dt, 0.05), n = Math.max(1, Math.ceil(step / (1 / 90)));
    for (let k = 0; k < n; k++) { const h = step / n; m16RookTick(M, h); m16PatienceTick(M, h); if (!M.ships[0].gone) m16ShipVsCutter(M.ships[0], B); m16BallStep(M.ball, h, true); }
    m16RookGuns(M, dt);
    if (M.ball.moor && M.sorP > 0) { M.sorP += dt / 26; if (M.sorP > 0.5) cpaOnce('sp', 'holm', 'There goes the Sorrel, past the Hound, safe as a church.', 'cp_m16_42'); }
    if (M.ph === 'board') {
      const K = ZM.z.find(z => z.zn === M.kz); M.kk = K ? clamp(K.hp / K.max, 0, 1) : (M.kz ? 0 : 1);
      if (M.kz && (!K || K.hp <= K.max * 0.125)) {
        M.ph = 'taken';
        if (K) { K.act = null; K.aware = 0; K.goal = null; K.dead = 1; K.deadT = 0; K.gone = true; }
        for (const z of m16Gang()) { z.dead = 1; z.deadT = 0; }
        cpSay('kittow', 'Enough. Enough! The sea can keep its marks.', 'cp_m16_45');
        setTimeout(() => { if (RAID.st.m16 === M && !ZM.over) cpDone(); }, 2600);
      }
    }
  },
  // (Kittow can't be killed: nothing takes him below a tenth of his strength)
  hurt(d, dmg) { if (d.kit && ZM.net !== 'client' && d.hp - dmg <= d.max * 0.1) return Math.max(0, d.hp - d.max * 0.1); return dmg; },
  qq(sid, k, a) { if (k === 'm16hit' && Array.isArray(a)) { m16Hit(sid, String(a[0]), a[1] | 0, +a[2] || 0); return true; } if (typeof cpgAsk === 'function' && cpgAsk(k, a)) return true; return false; },
  shot(x, y, z, lh, lp, by, dmg) { m16Shot(x, y, z, lh, lp, by, dmg); if (typeof cpgShot === 'function') cpgShot(x, y); },
  pack(o) { gwsPack(o); m16PackCommon(o); const M = RAID.st.m16; if (M) o.m16r = [Math.round(M.rhp * 10) / 10, Math.round(M.volW * 10) / 10, M.volN | 0, M.tug | 0, Math.round(M.kk * 1000), Math.round(M.sorP * 1000)]; },
  apply(o) { gwsApply(o); m16ApplyCommon(o); const M = RAID.st.m16, a = o.m16r; if (M && Array.isArray(a)) { M.rhp = +a[0] || 0; M.volW = +a[1] || 0; M.volN = a[2] | 0; M.tug = a[3] | 0; M.kk = (a[4] | 0) / 1000; M.sorP = (a[5] | 0) / 1000; } },
  me(dt) { gwsMe(dt); m16GaleMe(dt); m16GaleKeys(); m16MeCommon(dt); const M = RAID.st.m16; if (M && M.volW > 0 && ZM.net === 'client') M.volW = Math.max(0, M.volW - dt); },
  hud(phone, mono, fell) {
    gwsHud(phone, mono, fell); const M = RAID.st.m16; if (!M || ZM.over || cpCineOn()) return;
    const y = phone ? 82 : 128, w = phone ? 200 : 300, R = M.ships[1];
    const bar = (label, k, col) => { ctx.fillStyle = 'rgba(6,10,20,0.62)'; ctx.fillRect(cx - w / 2 - 8, y, w + 16, phone ? 30 : 36); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = fell(phone ? 14 : 18); ctx.fillStyle = col; ctx.fillText(label, cx, y + 3); ctx.fillStyle = 'rgba(80,70,60,0.7)'; ctx.fillRect(cx - w / 2, y + (phone ? 21 : 26), w, 5); ctx.fillStyle = col; ctx.fillRect(cx - w / 2, y + (phone ? 21 : 26), w * clamp(k, 0, 1), 5); ctx.textBaseline = 'alphabetic'; };
    if (M.ph === 'rook' || M.ph === 'slip') { bar('The Rook', M.rhp / M.rmax, '#e8b090'); if (R && !R.gone) m16Marker(R.x, R.y, 6, M.ph === 'rook' ? 'The Rook · ram her' : 'The Rook · she’s coming for you', M.ph === 'slip' ? '#ff9a7a' : '#e8b090', phone, mono); }
    else if (M.ph === 'board') bar('Kittow · alive', 1 - (1 - M.kk) / 0.875, '#c89878');
    // her muskets levelled: the edges go red, and the word to get down
    if (M.volW > 0) { const a = 0.3 * Math.min(1, M.volW * 2), gr = ctx.createRadialGradient(cx, H / 2, Math.min(W, H) * 0.3, cx, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(160,40,20,0)'); gr.addColorStop(1, `rgba(160,40,20,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.font = mono(phone ? 12 : 15); ctx.fillStyle = `rgba(255,150,110,${0.8 + 0.2 * Math.sin(g.t * 10)})`; ctx.fillText(FPS.crouch ? 'DOWN BEHIND THE BULWARK' : 'THEIR MUSKETS · CROUCH (C)', cx, H * 0.3); }
  },
}));

// ---------- the parts' own events, sounds and sights (every screen) ----------
function m16EvMore(k, a) {
  const M = RAID.st.m16;
  if (k === 'oars') m16Snd('oars');
  else if (k === 'gigtow' || k === 'grapnel') m16Snd('grapnel');
  else if (k === 'gigsunk') { m16Snd('ram', 0.6); m16Snd('splash'); fpsFeed('Stove in: the gig goes over, and her men with her.'); }
  else if (k === 'gigshot') { m16Snd('splash'); fpsFeed((Array.isArray(a) && a[1] && a[1] !== FPS.me.id ? m16Nick(a[1]) + ' shot the oarsmen. ' : 'Her oarsmen are down. ') + 'The gig drifts off into the fog.'); }
  else if (k === 'board') { m16Snd('grapnel'); fpsFeed('A gig alongside: two of Kittow’s men over the rail!'); }
  else if (k === 'moored') { m16Snd('chain'); ZM.banner = { text: 'On the chain', t: 3, sub: 'The Hound is marked', col: '#a8e0c0' }; }
  else if (k === 'rookhit') { m16Snd('ram', (a | 0) / 100); RAID.st.jolt = 1; ZM.banner = { text: (a | 0) > 60 ? 'A smashing blow!' : 'A knock to the Rook', t: 1.6, small: true, col: '#ffd0a0' }; if (M) M.rookFx = g.t; }
  else if (k === 'slip') { m16Snd('grapnel'); ZM.banner = { text: 'She slips the tow', t: 3, sub: 'The Patience is coming for the buoy', col: '#ffb070' }; }
  else if (k === 'vol0') { m16Snd('cock'); if (M) M.volFx = g.t; }
  else if (k === 'vol') m16Volley();
}
// (every screen) the volley: judged here for my own player, as the gang's pistols are
function m16Volley() {
  const S = RAID.st, M = S.m16, R = M && M.ships[1], m = FPS.me; if (!R) return;
  m16Snd('musket'); if (M) M.fireFx = g.t;
  if (m.dead > 0 || zmIsDown() || ZM.over || cpCineOn()) return;
  const [rx, ry] = m16Wd(R.x, R.y), d = Math.hypot(rx - m.x, ry - m.y);
  // (the mast between you and her: covered)
  const mw = gwsW(GWS.MAST[0], GWS.MAST[1]), tx = rx - m.x, ty = ry - m.y, tl = Math.hypot(tx, ty) || 1, px = mw[0] - m.x, py = mw[1] - m.y, along = (px * tx + py * ty) / tl, off = Math.abs(px * ty - py * tx) / tl;
  const covered = along > 0 && along < tl && off < 0.5;
  const ch = covered ? 0 : clamp(0.62 - d * 0.004 - (FPS.crouch ? 0.42 : 0), 0.06, 0.65);
  if (Math.random() < ch) { fpsHurt(1, null, null); zmSound('hit'); FPS.hurtT = 0.7; FPS.tracers.push({ a: [rx, ry, FPSC.GROUND + 3], b: [m.x, m.y, FPSC.GROUND + (m.jz || 0) + 1.3], t: 0.09, k: 'p' }); }
  else for (let i = 0; i < 3; i++) FPS.tracers.push({ a: [rx, ry, FPSC.GROUND + 3], b: [m.x + (Math.random() - 0.5) * 6, m.y + (Math.random() - 0.5) * 6, FPSC.GROUND + 1 + Math.random() * 3], t: 0.08, k: 'p' });
}
function m16SndMore(k, v, play, syn) {
  if (k === 'oars') { if (play('oars', 0.55)) return; try { if (!soundOff()) sfxRowlock(0, 0.5); } catch (e) {} return; }
  if (k === 'grapnel') { if (play('grapnel', 0.85)) return; syn(() => { tone(1400, 'square', 0.001, 0.05, 0.05); noise('highpass', 2000, 1, 0.005, 0.1, 0.4); }); return; }
  if (k === 'chain') { if (play('gibbet_chain', 0.8)) return; syn(() => { for (let i = 0; i < 5; i++) tone(900 + i * 70, 'square', 0.001, 0.03, 0.06, { delay: i * 0.07 }); }); return; }
  if (k === 'musket') { if (play('rchmusket', 0.9)) return; try { if (!soundOff()) { fpsWeaponSound('p', 20, 0); fpsWeaponSound('p', 24, 0.3); } } catch (e) {} return; }
  if (k === 'cock') { syn(() => { tone(1300, 'square', 0.001, 0.05, 0.03); tone(900, 'square', 0.001, 0.04, 0.03, { delay: 0.08 }); tone(1100, 'square', 0.001, 0.04, 0.03, { delay: 0.2 }); }); return; }
}

// ---------- in 3D: the gigs, the Rook, the packet, the chain (src/cpm16x.js m16F3 calls this) ----------
function m16F3More(dt, V, k, Q, S, M) {
  const t = g.t, b = M.ball;
  // the gigs, rowing, their lines to the buoy, adrift or going down
  if (Q.gigs) Q.gigs.forEach((G3, i) => { const G = (M.gigs || [])[i]; G3.g.visible = !!G && !G.gone; G3.line.visible = false; if (!G3.g.visible) return;
    const down = G.st === 'sunk' ? clamp((G.t2 || 0) / 5, 0, 1) : 0;
    G3.g.position.set(G.x, -down * 2.2 + (reduceMotion ? 0 : Math.sin(t * 1.7 + i) * 0.1), -G.y); G3.g.rotation.set(down * 0.5, -G.h, (G.st === 'adrift' ? Math.sin(t * 0.8) * 0.1 : 0) + down * 0.4);
    const row = G.st !== 'sunk' && G.st !== 'adrift'; for (const O of G3.oars) { const a = row ? Math.sin(t * 3.4 + O.ph) : 0.2; O.g.rotation.set(0, a * 0.5, O.s * (0.25 + (row ? Math.cos(t * 3.4 + O.ph) * 0.15 : -0.1))); }
    G3.lan.material.opacity = G.st === 'sunk' ? 1 - down : 0.85;
    if (G.st === 'tow' && b.tow === G.id) { G3.line.visible = true; m16LineSet(G3.line, [G.x, G.y, 1.0], [b.x, b.y, b.z + 1], 0.8); } });
  // the chain from the mooring up to the buoy, once it's shackled
  if (Q.chain) { Q.chain.visible = !!b.moor; if (b.moor) m16LineSet(Q.chain, [C16.MOOR[0], C16.MOOR[1], -3], [b.x, b.y, b.z - C16.R * 0.6], -1); }
  if (Q.moorRing) Q.moorRing.material.opacity = b.moor ? 0.08 : 0.2 + 0.1 * Math.sin(t * 2) + (M.moorT > 0 ? 0.3 : 0);
  // the packet: her lamps out in the fog, coming down on the Hound, or past it once it's marked
  if (Q.sorrel) { let p, show = 1;
    if (k === 'tow') p = clamp(1 - M.sor / C16Y.SOR_T, 0, 1) * 0.92; else if (M.sorP > 0) p = 0.92 + M.sorP * 0.9; else { p = 0.88; show = 0.6; }
    const [sx, sy] = m16SorrelAt(p), [nx, ny] = m16SorrelAt(p + 0.01); Q.sorrel.position.set(sx, 0, -sy); Q.sorrel.rotation.y = -bearingOf(nx - sx, ny - sy);
    const d = Math.hypot(sx - V.x, sy - V.y), vis = clamp(1.4 - d / 380, 0, 1) * show; Q.sorrel.children.forEach((c, i) => { if (c.material) c.material.opacity = i < 4 ? vis * (0.7 + 0.3 * Math.sin(t * 2 + i)) : vis * 0.25; }); }
  // the Rook: her lantern, her muskets' flash, the tow line
  const R = M.ships && M.ships[1], R3 = Q.ships && Q.ships[1];
  if (R && R3) {
    const sh = Math.sin(R.h), ch = Math.cos(R.h), hurt = 1 - clamp(M.rhp / M.rmax, 0, 1);
    R3.rotation.z += hurt * 0.08 + (M.ph === 'board' ? 0.06 : 0);
    if (Q.rookLan) { Q.rookLan.position.set(R.x - sh * R.L * 0.8, 5, -(R.y - ch * R.L * 0.8)); Q.rookLan.material.opacity = 0.8 + 0.2 * Math.sin(t * 7); }
    if (Q.rookFire) Q.rookFire.forEach((f, i) => { const tt = -R.L * 0.6 + i * R.L * 0.4, side = 1; f.position.set(R.x + sh * tt + ch * side * R.R * 0.2, 3.2, -(R.y + ch * tt - sh * side * R.R * 0.2));
      const warn = M.volW > 0 ? 0.25 + 0.25 * Math.sin(t * 20 + i) : 0, fire = M.fireFx && t - M.fireFx < 0.35 ? 1 - (t - M.fireFx) / 0.35 : 0; f.material.opacity = Math.max(warn, fire); f.scale.setScalar(2 + fire * 5); });
    if (Q.rookLine) { const on = (M.ph === 'rook' && b.tow) || (M.ph === 'slip' && M.tug); Q.rookLine.visible = !!on; if (on) { const P = M.ph === 'rook' ? R : M.ships[0]; m16LineSet(Q.rookLine, [P.x - Math.sin(P.h) * P.L, P.y - Math.cos(P.h) * P.L, 1.6], [b.x, b.y, b.z + 1], 1.2); } }
  }
}
