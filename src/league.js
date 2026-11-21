'use strict';
// Skerry League: ships and a ball. An eleventh game, on its own card on the title screen (id lgTitle, the eleventh on
// the desk menu). Two sides, Blue and Orange, one to three ships each, in the Harbour Pool: a walled square of
// still water under the cliffs with a goal at each end and a lighthouse behind each goal. Sail into the ball (a great
// striped buoy) and knock it into the other side's goal. You sail alone with bots on your side and against you.
//
// The ships are the game's own four (src/crates.js BOATS: the Brig, the Cutter, the Barque and the Carrier), in the
// skin you have on each, and they handle as they do on a voyage: the same sail that climbs the longer you hold it, no
// top speed, the same accel for how fast she gathers way and turn for how fast she answers the helm (src/game.js, the
// helm). Never slowed. Two things are added, both only ever faster or handier:
//  - the helm answers LGC.TURN times as hard as at sea (a pool is small and the ball doesn't wait), each boat in
//    proportion to her own turn;
//  - the Gale (boost): Shift, Space, A or the Gale button blows her on at up to LGC.GALE m/s more for as long as the
//    gauge lasts. The gauge refills from the gale buoys on the water (the small ones a third, the big ones in full),
//    which come back a few seconds after they're taken.
// S (or LT) shortens sail as ever; hold it with the sail already short and she backs her sails and goes astern.
//
// The ball (LG.ball) is 2D on the water with a height: it floats, it's knocked up into the air by a hard hit, it
// bounces off the sea walls and the goal frames and slows on the water. A ship is a line from stern to bow with her
// beam round it; the ball takes the ship's speed where it's struck (and a little more, so a good hit flies), and a
// heavy ship hardly notices (the Carrier least of all). Ships bump each other off by their weight.
// Goals count when the whole ball is over the line, under the crossbar. Then the lighthouse behind it flashes and the
// bell rings, and after a moment everyone's back on their kickoff marks for a count of three.
// The match: three, five or seven minutes; ahead at the end and you've won. Level and it's golden goal overtime.
// The arena's frame: x across (east), y along it, towards Orange's goal; Blue (your side) defends y = -AY. Headings as
// at sea: h is from +y, turning to +x (x = sin h, y = cos h).
// Bots (lgBot): the one of a side nearest the ball goes for it, lining up behind it on the line to the goal; one
// keeps goal; any other waits behind the play. Their skill (Easy, Fair, Hard) sets how fast they'll go, how quickly
// they see where the ball is going, and whether they use the Gale.
// What's kept (localStorage 'skerry-league'): the settings and your record (wins, draws, losses, goals).
// Debug and tests: lgDebug(o) starts a match (o as lgStart's); LG is the state; lgDebugGoal(team) scores one.
// Played online (src/lgnet.js): lgStart({ net: { role, seats, g } }) seats everyone from the host's list, and LG.net is
// set. Then each screen sails only its own ship (and the host the bots too: lgOwn), places the others from what it
// hears, and only the host's screen decides the ball, the clock, the score and the goals; everyone else's ball is a
// forecast, put right by the host's snapshots, and a hit there is sent to the host as a claim (lgnHit).

const LGC = { AX: 85, AY: 140, CH: 26, GW: 52, GD: 16, BAR: 16, WALLH: 9, R: 6, FLOAT: 3.4, G: 26, TURN: 2.4, GALE: 30, GALE_USE: 30, SAIL0: 0.15, KICK: 3, CELEB: 3.2, HIT: 0.45 };
const LG_TEAMS = [{ id: 'blue', name: 'Blue', col: '#4aa8ff', hex: 0x4aa8ff, dark: '#1d4f86' }, { id: 'orange', name: 'Orange', col: '#ff8c3a', hex: 0xff8c3a, dark: '#8a3f12' }];
const LG_SKILL = { easy: { v: 30, see: 0.35, gale: 0, err: 0.35, react: 0.45 }, fair: { v: 46, see: 0.7, gale: 0.5, err: 0.15, react: 0.22 }, hard: { v: 70, see: 1, gale: 1, err: 0.04, react: 0.1 } };
const LG_MASS = { cutter: 1, brig: 1.5, barque: 2.3, carrier: 4.2 };
const LG_BOTNAMES = ['Gull', 'Tern', 'Skua', 'Petrel', 'Shag', 'Fulmar', 'Puffin', 'Gannet', 'Kittiwake', 'Eider', 'Scoter', 'Curlew'];
const LG = { net: null, ko: 0, lastHitT: -9, lastHitBy: null, on: false, ph: 'off', ships: [], ball: null, pads: [], score: [0, 0], clock: 0, len: 300, ot: false, t: 0, phT: 0, keys: {}, cam: 'ball', msg: '', msgT: 0, set: null, me: 0, last: null, touch: {}, hits: 0, goals: [] };
const lgStore = { get() { try { return JSON.parse(localStorage.getItem('skerry-league') || '{}') || {}; } catch (e) { return {}; } }, set(v) { try { localStorage.setItem('skerry-league', JSON.stringify(v)); } catch (e) {} } };
const lgClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lgAng = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// ---------- the arena ----------
// the sea walls as segments, each with its inward normal: the long sides, the chamfered corners, the ends either side
// of the goal mouths, and each goal's box (its sides and its back)
function lgWalls() {
  if (LG.walls) return LG.walls;
  const { AX, AY, CH, GW, GD } = LGC, gw = GW / 2, W = [];
  const seg = (ax, ay, bx, by, goal) => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); W.push({ ax, ay, bx, by, nx: -dy / L, ny: dx / L, L, goal: !!goal }); };
  // the outline anticlockwise (so the normal, to the left of each run, points in)
  const P = [[gw, -AY], [AX - CH, -AY], [AX, -AY + CH], [AX, AY - CH], [AX - CH, AY], [gw, AY]];
  for (let i = 0; i < P.length - 1; i++) seg(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
  const Q = [[-gw, AY], [-AX + CH, AY], [-AX, AY - CH], [-AX, -AY + CH], [-AX + CH, -AY], [-gw, -AY]];
  for (let i = 0; i < Q.length - 1; i++) seg(Q[i][0], Q[i][1], Q[i + 1][0], Q[i + 1][1]);
  // the goal boxes, open to the pool
  seg(gw, AY, gw, AY + GD, 1); seg(gw, AY + GD, -gw, AY + GD, 1); seg(-gw, AY + GD, -gw, AY, 1);
  seg(-gw, -AY, -gw, -AY - GD, 1); seg(-gw, -AY - GD, gw, -AY - GD, 1); seg(gw, -AY - GD, gw, -AY, 1);
  return (LG.walls = W);
}
// the gale buoys: small ones along the sides and ends, big ones at the middle of each side and the four corners
function lgPadsNew() {
  const { AX, AY } = LGC, P = [];
  const big = [[-AX + 10, 0], [AX - 10, 0], [-AX + 20, -AY + 28], [AX - 20, -AY + 28], [-AX + 20, AY - 28], [AX - 20, AY - 28]];
  const small = [[0, -AY * 0.55], [0, AY * 0.55], [-AX * 0.5, -AY * 0.3], [AX * 0.5, -AY * 0.3], [-AX * 0.5, AY * 0.3], [AX * 0.5, AY * 0.3], [-AX * 0.25, 0], [AX * 0.25, 0], [-AX * 0.55, -AY * 0.75], [AX * 0.55, -AY * 0.75], [-AX * 0.55, AY * 0.75], [AX * 0.55, AY * 0.75]];
  for (const [x, y] of big) P.push({ x, y, big: true, amt: 100, back: 10, t: 0 });
  for (const [x, y] of small) P.push({ x, y, big: false, amt: 34, back: 4, t: 0 });
  return P;
}

// ---------- a match ----------
function lgBoatOf(id) { return (typeof BOAT_BY_ID !== 'undefined' && BOAT_BY_ID[id]) || (typeof BOATS !== 'undefined' && BOATS[0]) || { id: 'brig', accel: 1.3, turn: 1.2, len: 20, beam: 2.6, masts: [-0.2, 0.18] }; }
function lgSkinOf(boatId, mine) {
  try {
    if (mine && typeof CRATES !== 'undefined' && typeof SKIN_BY_ID !== 'undefined') { const s = SKIN_BY_ID[CRATES.equipped[boatId]] || SKIN_BY_ID[PLAIN[boatId]]; if (s) return s; }
    if (typeof SKIN_BY_ID !== 'undefined' && typeof PLAIN !== 'undefined' && SKIN_BY_ID[PLAIN[boatId]]) return SKIN_BY_ID[PLAIN[boatId]];
  } catch (e) {}
  return { hull: '#4b3a2b', sail: '#d8cdb0', rail: '#1e140c', deck: ['#1a130d', '#0c0806'], wood: '#140d08', lantern: '#ffcf86' };
}
// a skin by its id (someone else's, online), else the boat's plain one
function lgSkinById(boatId, skId) { try { if (skId && typeof SKIN_BY_ID !== 'undefined' && SKIN_BY_ID[skId] && (!SKIN_BY_ID[skId].boat || SKIN_BY_ID[skId].boat === boatId)) return SKIN_BY_ID[skId]; } catch (e) {} return lgSkinOf(boatId, false); }
// my skin's id on a boat, for the others online
function lgMySkinId(boatId) { try { if (typeof CRATES !== 'undefined' && CRATES.equipped && typeof CRATES.equipped[boatId] === 'string') return CRATES.equipped[boatId]; } catch (e) {} return ''; }
// which ships this screen sails: alone, all of them; online, my own (and on the host's screen the bots too)
function lgOwn(s) { return !LG.net || s.me || (LG.net.role === 'host' && s.bot); }
const lgHost = () => !LG.net || LG.net.role === 'host';
function lgMyName() { const v = ($('lgNick') && $('lgNick').value) || (typeof NET !== 'undefined' && NET.nick) || ''; return String(v).replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16) || 'You'; }
// o: { size: ships a side (1 to 3), mins, skill, boat (yours), fleet ('mixed' or 'same') }
function lgStart(o) {
  o = Object.assign({}, lgStore.get().set || {}, o || {});
  const size = lgClamp(o.size | 0 || 2, 1, 3), skill = LG_SKILL[o.skill] ? o.skill : 'fair', mins = [3, 5, 7].includes(+o.mins) ? +o.mins : 5;
  const myBoatId = lgBoatOf(o.boat || (typeof CRATES !== 'undefined' && CRATES.boat) || 'brig').id;
  LG.set = { size, skill, mins, boat: myBoatId, fleet: o.fleet === 'same' ? 'same' : 'mixed' };
  LG.net = o.net || null;
  const st = lgStore.get(); if (!LG.net) { st.set = LG.set; lgStore.set(st); }
  const ids = (typeof BOATS !== 'undefined' ? BOATS.map(b => b.id) : ['brig']), names = LG_BOTNAMES.slice().sort(() => Math.random() - 0.5);
  LG.ships = [];
  const mk = (tm, i, me, bot, bid, nm, skin, sid) => ({ i: LG.ships.length, team: tm, slot: i, bot, me, sid: sid || '', nm, boat: lgBoatOf(bid), skin, m: LG_MASS[bid] || 1.5, x: 0, y: 0, h: 0, v: 0, sail: LGC.SAIL0, rudder: 0, held: 0, astern: 0, bv: 0, gale: 33, galeOn: false, px: 0, py: 0, bob: Math.random() * 9, w: 0, goals: 0, saves: 0, touches: 0, ai: { t: 0, steer: 0, sail: 0, gale: false, stuck: 0, back: 0, role: 'go' } });
  // online: the seats the host dealt, [sid ('' for a bot), team, slot, boat, skin, name], in order
  if (LG.net) {
    for (const z of LG.net.seats) {
      const sid = z[0] || '', me = !!sid && typeof NET !== 'undefined' && sid === NET.sid, bid = lgBoatOf(z[3]).id;
      LG.ships.push(mk(z[1], z[2], me, !sid, bid, me ? lgMyName() : String(z[5] || 'A sailor'), me ? lgSkinOf(bid, true) : lgSkinById(bid, z[4]), sid));
    }
    LG.me = Math.max(0, LG.ships.findIndex(s => s.me));
  }
  for (let tm = 0; tm < 2 && !LG.net; tm++) for (let i = 0; i < size; i++) {
    const me = tm === 0 && i === 0;
    // the bots sail the handier ships more often than the Carrier
    const pick = LG.set.fleet === 'same' ? myBoatId : ids[Math.floor(Math.random() * ids.length)] === 'carrier' && Math.random() < 0.6 ? 'brig' : ids[Math.floor(Math.random() * ids.length)];
    const bid = me ? myBoatId : pick, boat = lgBoatOf(bid);
    LG.ships.push({ i: LG.ships.length, team: tm, slot: i, bot: !me, me, nm: me ? lgMyName() : names[LG.ships.length % names.length], boat, skin: lgSkinOf(bid, me), m: LG_MASS[bid] || 1.5, x: 0, y: 0, h: 0, v: 0, sail: LGC.SAIL0, rudder: 0, held: 0, astern: 0, bv: 0, gale: 33, galeOn: false, px: 0, py: 0, bob: Math.random() * 9, w: 0, goals: 0, saves: 0, touches: 0, ai: { t: 0, steer: 0, sail: 0, gale: false, stuck: 0, back: 0, role: 'go' } });
  }
  if (!LG.net) LG.me = 0;
  LG.score = [0, 0]; LG.ko = 0; LG.lastHitT = -9; LG.lastHitBy = null; LG.len = mins * 60; LG.clock = LG.len; LG.ot = false; LG.t = 0; LG.hits = 0; LG.goals = []; LG.last = null;
  LG.ball = { x: 0, y: 0, z: LGC.FLOAT, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, q: null, gone: false };
  LG.pads = lgPadsNew(); LG.keys = {}; LG.touch = {};
  LG.cam = st.cam === 'ship' ? 'ship' : 'ball';
  LG.on = true;
  lgEnter();
  if (typeof lg3dMatch === 'function') lg3dMatch();
  lgKickoff();
}
// everyone to their marks: the ball in the middle, each side's ships spread on their own half facing the middle
function lgKickoff() {
  const marks = { 1: [[0, -0.62]], 2: [[-0.34, -0.62], [0.34, -0.62]], 3: [[-0.4, -0.6], [0.4, -0.6], [0, -0.86]] }[LGC_size()];
  for (const s of LG.ships) {
    const m = marks[s.slot] || [0, -0.6], sg = s.team === 0 ? 1 : -1;
    s.x = m[0] * LGC.AX * sg; s.y = m[1] * LGC.AY * sg; s.h = s.team === 0 ? 0 : Math.PI;
    s.v = 0; s.sail = LGC.SAIL0; s.rudder = 0; s.held = 0; s.astern = 0; s.bv = 0; s.px = 0; s.py = 0; s.w = 0; s.gale = Math.max(s.gale, 33); s.galeOn = false;
    s.ai.back = 0; s.ai.stuck = 0;
  }
  const B = LG.ball; Object.assign(B, { x: 0, y: 0, z: LGC.FLOAT, vx: 0, vy: 0, vz: 0, gone: false });
  for (const p of LG.pads) p.t = 0;
  LG.ph = 'count'; LG.phT = LGC.KICK; LG.last = null; LG.ko++;
  lgSnd('tick');
}
function LGC_size() { return LG.set ? LG.set.size : 2; }
function lgMeShip() { return LG.ships[LG.me]; }

// ---------- every frame ----------
function lgFrame(dt) {
  LG.t += dt;
  lgPadPoll(dt);
  lgSim(dt);
  if (typeof lg3dDraw === 'function') lg3dDraw(dt);
  lgHud();
  if (LG.net && typeof lgnTags === 'function') lgnTags();
}
// the match, without drawing it (the host's screen in a background tab runs this on a timer: src/lgnet.js)
function lgSim(dt) {
  // (alone, the pause card stops the match; online it never stops for one sailor)
  const paused = !$('lgPause').hidden && !LG.net;
  if (!paused && LG.on) {
    if (!lgHost()) lgGuestPhase(dt);
    else if (LG.ph === 'count') { LG.phT -= dt; const n = Math.ceil(LG.phT); if (n !== LG.cn) { LG.cn = n; if (n > 0) lgSnd('tick'); } if (LG.phT <= 0) { LG.ph = 'play'; lgSnd('go'); lgSay('Go!', 0.8); } }
    else if (LG.ph === 'goal') { LG.phT -= dt; if (LG.phT <= 0) { if (lgOver()) lgEnd(); else lgKickoff(); } }
    else if (LG.ph === 'play') { LG.clock = LG.ot ? LG.clock + dt : LG.clock - dt; if (!LG.ot && LG.clock <= 0) { LG.clock = 0; if (LG.score[0] !== LG.score[1]) { lgEnd(); } else { LG.ot = true; LG.clock = 0; lgSay('Overtime! Next goal wins', 2.5); lgSnd('horn'); lgKickoff(); } } }
    // the ships sail through the countdown only on their marks (held), and freely the rest of the time
    const step = Math.min(dt, 0.05), n = Math.max(1, Math.ceil(step / (1 / 120)));
    for (let k = 0; k < n; k++) lgStep(step / n);
    if (LG.msgT > 0) { LG.msgT -= dt; if (LG.msgT <= 0) { const el = $('lgMsg'); if (el) el.classList.remove('on'); } }
  }
  if (LG.net && LG.on && typeof lgnTick === 'function') lgnTick(dt);
}
// online, on everyone's screen but the host's: the phase, the count and the clock run on between the host's snapshots
// (which set them: lgnApply), and nothing here ends a phase
function lgGuestPhase(dt) {
  if (LG.ph === 'count') { LG.phT = Math.max(0, LG.phT - dt); const n = Math.ceil(LG.phT); if (n !== LG.cn) { LG.cn = n; if (n > 0) lgSnd('tick'); } }
  else if (LG.ph === 'goal') LG.phT = Math.max(0, LG.phT - dt);
  else if (LG.ph === 'play') LG.clock = LG.ot ? LG.clock + dt : Math.max(0, LG.clock - dt);
}
function lgStep(dt) {
  const frozen = LG.ph === 'count' || LG.ph === 'end';
  for (const s of LG.ships) {
    if (!lgOwn(s)) { s.bob += dt; continue; }   // (someone else's ship: src/lgnet.js puts her where she's heard to be)
    let steer = 0, sailIn = 0, gale = false;
    if (s.bot) { lgBot(s, dt); steer = s.ai.steer; sailIn = s.ai.sail; gale = s.ai.gale; }
    else { const K = LG.keys, T = LG.touch; steer = (K.r || T.r ? 1 : 0) - (K.l || T.l ? 1 : 0) + (LG.padSteer || 0); sailIn = (K.u || T.u ? 1 : 0) - (K.d || T.d ? 1 : 0) + (LG.padSail || 0); gale = !!(K.g || T.g || LG.padGale); }
    steer = lgClamp(steer, -1, 1); sailIn = lgClamp(sailIn, -1, 1);
    if (frozen) { s.rudder += (steer - s.rudder) * Math.min(1, dt * 4); s.bob += dt; continue; }
    lgSail(s, dt, steer, sailIn, gale);
  }
  if (frozen) return;
  lgShipsBump();
  lgBall(dt);
  for (const p of LG.pads) if (p.t > 0) p.t -= dt;
}
// her helm and sail, as at sea (src/game.js), the Gale on top, then she moves and meets the walls
function lgSail(s, dt, steer, sailIn, gale) {
  const b = s.boat, turnK = b.turn || 1, accel = b.accel || 1;
  s.rudder += (steer - s.rudder) * Math.min(1, dt * 4 * turnK);
  if (sailIn > 0) s.held += dt; else s.held = 0;
  const rate = (sailIn > 0 ? 1.6 * (1 + s.held * 1.2) : 1.6) * accel;
  s.sail = Math.max(LGC.SAIL0, s.sail + (sailIn > 0 ? sailIn * rate : sailIn * (1.6 + s.sail * 1.8)) * dt);
  // backing her sails: hold shorten with the sail already short and she gathers sternway
  if (sailIn < -0.3 && s.sail <= LGC.SAIL0 + 0.01) s.astern = Math.min(1, s.astern + dt * 1.6 * accel); else s.astern = Math.max(0, s.astern - dt * 3 * accel);
  const vT = (3 + s.sail * 12) * (b.top || 1) * (1 - s.astern) - 11 * s.astern;
  s.v += (vT - s.v) * Math.min(1, dt * 4 * accel);
  // the Gale
  s.galeOn = gale && s.gale > 0 && s.astern < 0.2;
  if (s.galeOn) { s.gale = Math.max(0, s.gale - LGC.GALE_USE * dt); s.bv += (LGC.GALE - s.bv) * Math.min(1, dt * 3 * Math.max(1, accel)); }
  else s.bv += (0 - s.bv) * Math.min(1, dt * 1.2);
  const V = s.v + s.bv;
  s.w = s.rudder * 0.55 * turnK * LGC.TURN * (0.35 + 0.65 * Math.min(1, Math.abs(V) / 10)) * (V < 0 ? -1 : 1);
  s.h = lgAng(s.h + s.w * dt);
  s.x += (Math.sin(s.h) * V + s.px) * dt; s.y += (Math.cos(s.h) * V + s.py) * dt;
  const k = Math.exp(-dt * 2.2); s.px *= k; s.py *= k;
  s.bob += dt;
  lgShipWalls(s);
  // the gale buoys
  for (const p of LG.pads) if (p.t <= 0 && s.gale < 100 && Math.hypot(p.x - s.x, p.y - s.y) < (p.big ? 7 : 5) + s.boat.len * 0.3) { s.gale = Math.min(100, s.gale + p.amt); p.t = p.back; if (s.me) lgSnd('pad', p.big ? 1 : 0.6); if (LG.net && !lgHost() && s.me && typeof lgnPad === 'function') lgnPad(LG.pads.indexOf(p)); }
}
// three circles along her (bow, waist, stern) against the walls: pushed back in, and the way she had into the wall
// taken off her as a knock on a rock is at sea (src/game.js: never below steerage way), the rest kept as she glances off
function lgHullPts(s) { const L = s.boat.len * 0.42, r = Math.max(2.2, s.boat.beam * 0.75), sh = Math.sin(s.h), ch = Math.cos(s.h); return [[s.x + sh * L, s.y + ch * L, r], [s.x, s.y, r * 1.15], [s.x - sh * L, s.y - ch * L, r]]; }
function lgShipWalls(s) {
  const W = lgWalls();
  for (let pass = 0; pass < 2; pass++) for (const c of lgHullPts(s)) for (const w of W) {
    const d = lgSegHit(w, c[0], c[1], c[2]); if (!d) continue;
    s.x += d.nx * d.pen; s.y += d.ny * d.pen;
    const V = s.v + s.bv, ux = Math.sin(s.h) * V + s.px, uy = Math.cos(s.h) * V + s.py, vn = ux * d.nx + uy * d.ny;
    if (vn < -0.5) {
      const closing = -vn;
      s.v = s.v >= 0 ? Math.max(2, s.v - closing * 0.6) : Math.min(-2, s.v + closing * 0.6); s.bv *= 0.5;
      s.px += d.nx * closing * 0.35; s.py += d.ny * closing * 0.35;
      // she's turned along the wall a little
      const tx = -d.ny, ty = d.nx, along = ux * tx + uy * ty, want = Math.atan2(along >= 0 ? tx : -tx, along >= 0 ? ty : -ty);
      if (V > 0) s.h = lgAng(s.h + lgAng(want - s.h) * 0.25);
      if (closing > 8 && s.me) lgSnd('thud', Math.min(1, closing / 40));
    }
  }
}
// a circle (x, y, r) against a wall segment: how far in and which way out, or null
function lgSegHit(w, x, y, r) {
  const dx = w.bx - w.ax, dy = w.by - w.ay, t = lgClamp(((x - w.ax) * dx + (y - w.ay) * dy) / (w.L * w.L), 0, 1);
  const cx = w.ax + dx * t, cy = w.ay + dy * t, ex = x - cx, ey = y - cy, d = Math.hypot(ex, ey);
  // behind the wall's face (it's thick): pushed out along its normal
  const side = (x - w.ax) * w.nx + (y - w.ay) * w.ny;
  if (side < r && side > -6 && t > 0 && t < 1) return { nx: w.nx, ny: w.ny, pen: r - side };
  if (d < r && d > 1e-6) return { nx: ex / d, ny: ey / d, pen: r - d };
  return null;
}
// ship on ship: their circles pushed apart by weight, a knock each along the line between them
function lgShipsBump() {
  const S = LG.ships;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j]; if (Math.hypot(a.x - b.x, a.y - b.y) > (a.boat.len + b.boat.len) * 0.6 + 8) continue;
    for (const p of lgHullPts(a)) for (const q of lgHullPts(b)) {
      const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy), rr = p[2] + q[2];
      if (d >= rr || d < 1e-4) continue;
      const nx = dx / d, ny = dy / d, pen = rr - d, ma = a.m, mb = b.m, ta = mb / (ma + mb), tb = ma / (ma + mb);
      const oa = lgOwn(a), ob = lgOwn(b); if (!oa && !ob) continue;
      if (oa) { a.x -= nx * pen * ta; a.y -= ny * pen * ta; } if (ob) { b.x += nx * pen * tb; b.y += ny * pen * tb; }
      const Va = a.v + a.bv, Vb = b.v + b.bv;
      const rel = (Math.sin(b.h) * Vb + b.px - Math.sin(a.h) * Va - a.px) * nx + (Math.cos(b.h) * Vb + b.py - Math.cos(a.h) * Va - a.py) * ny;
      if (rel < 0) {
        const J = -rel * 1.2 / (1 / ma + 1 / mb);
        if (oa) { a.px -= nx * J / ma; a.py -= ny * J / ma; } if (ob) { b.px += nx * J / mb; b.py += ny * J / mb; }
        if ((a.me || b.me) && -rel > 6) lgSnd('bump', Math.min(1, -rel / 30));
      }
    }
  }
}
// the ball: flight, the water, the walls (and the goal frames), the ships, and goals
function lgBall(dt) {
  const B = LG.ball, R = LGC.R; if (B.gone) return;
  // in the air it falls; on the water it floats and the water slows it
  if (B.z > LGC.FLOAT + 0.05 || B.vz > 0) { B.vz -= LGC.G * dt; const k = Math.exp(-dt * 0.08); B.vx *= k; B.vy *= k; }
  else { const k = Math.exp(-dt * 0.32); B.vx *= k; B.vy *= k; B.vz = 0; B.z = LGC.FLOAT; }
  B.x += B.vx * dt; B.y += B.vy * dt; B.z += B.vz * dt;
  if (B.z < LGC.FLOAT) { B.z = LGC.FLOAT; if (B.vz < -3) { if (B.vz < -9) lgSnd('splash', Math.min(1, -B.vz / 25)); B.vz = -B.vz * 0.42; } else B.vz = 0; }
  if (B.z > 70) { B.z = 70; B.vz = -Math.abs(B.vz) * 0.5; }
  // the walls (high enough that the ball never goes out), and over each goal mouth the end wall above the crossbar
  for (const w of lgWalls()) { const d = lgSegHit(w, B.x, B.y, R); if (d) lgBallBounce(B, d, 0.78); }
  for (const sg of [1, -1]) {
    const line = LGC.AY * sg, gw = LGC.GW / 2;
    if (Math.abs(B.x) < gw && B.z > LGC.BAR - R * 0.3 && (B.y - line) * sg > -R && (B.y - line) * sg < R) { const pen = R - (line - B.y) * sg; if (pen > 0) lgBallBounce(B, { nx: 0, ny: -sg, pen }, 0.7); }
    // the posts
    for (const px of [gw, -gw]) { const dx = B.x - px, dy = B.y - line, d = Math.hypot(dx, dy); if (d < R + 0.8 && d > 1e-4 && B.z < LGC.BAR + R) lgBallBounce(B, { nx: dx / d, ny: dy / d, pen: R + 0.8 - d }, 0.8, true); }
  }
  // the ships (on the host's screen, a ship sailed elsewhere strikes the ball only by her own screen's claim: lgnHit)
  for (const s of LG.ships) if (!LG.net || lgOwn(s) || !lgHost()) lgBallShip(B, s);
  // a goal: the whole ball over the line, inside the box (online, only the host's screen says so)
  if (lgHost() && (LG.ph === 'play' || LG.ph === 'count')) for (const sg of [1, -1]) if (sg * B.y > LGC.AY + R && Math.abs(B.x) < LGC.GW / 2) { lgGoal(sg > 0 ? 0 : 1); break; }
  // the ball's roll, for the view
  const sp = Math.hypot(B.vx, B.vy); if (sp > 0.01) { B.rx += B.vy * dt / R; B.ry += B.vx * dt / R; }
}
function lgBallBounce(B, d, e, post) {
  B.x += d.nx * d.pen; B.y += d.ny * d.pen;
  const vn = B.vx * d.nx + B.vy * d.ny;
  if (vn < 0) { B.vx -= (1 + e) * vn * d.nx; B.vy -= (1 + e) * vn * d.ny; if (-vn > 7) lgSnd(post ? 'post' : 'wall', Math.min(1, -vn / 40)); }
}
// a ship strikes the ball: the nearest point of her (stern to bow, her beam round it) and the ball's centre
function lgBallShip(B, s) {
  const R = LGC.R, L = s.boat.len * 0.5, sh = Math.sin(s.h), ch = Math.cos(s.h), r = Math.max(2.2, s.boat.beam * 0.8);
  if (B.z - R > 4.5 + s.boat.len * 0.06) return;   // over her (her rigging lets it through)
  const ox = B.x - s.x, oy = B.y - s.y, t = lgClamp(ox * sh + oy * ch, -L, L);
  const cx = s.x + sh * t, cy = s.y + ch * t, dx = B.x - cx, dy = B.y - cy, d = Math.hypot(dx, dy), rr = R + r;
  if (d >= rr || d < 1e-4) return;
  const nx = dx / d, ny = dy / d;
  B.x = cx + nx * rr; B.y = cy + ny * rr;
  // her speed at that point: her way through the water, her knock, and her swing (turning, the ends move sideways)
  const V = s.v + s.bv, svx = sh * V + s.px + ch * s.w * t, svy = ch * V + s.py - sh * s.w * t;
  const rvx = B.vx - svx, rvy = B.vy - svy, vn = rvx * nx + rvy * ny;
  if (vn >= 0) return;
  const mb = 0.35, J = -(1 + 0.55) * vn / (1 / mb + 1 / s.m);
  // and a little more, so a good clean hit flies (Rocket League's own trick)
  const push = Math.max(0, svx * nx + svy * ny) * LGC.HIT;
  B.vx += nx * (J / mb + push); B.vy += ny * (J / mb + push);
  s.px -= nx * J / s.m * 0.5; s.py -= ny * J / s.m * 0.5;
  const hard = -vn; if (hard > 10) B.vz = Math.max(B.vz, Math.min(26, (hard - 10) * 0.45 + (s.galeOn ? 4 : 0)));
  const sp = Math.hypot(B.vx, B.vy); if (sp > 120) { B.vx *= 120 / sp; B.vy *= 120 / sp; }
  // (online, a strike by someone else's ship on my screen is only a forecast: the host's word on it is coming)
  if (LG.net && !lgHost()) { if (s.me && typeof lgnHit === 'function') lgnHit(B); if (hard > 3 && s.me) lgSnd('hit', Math.min(1, hard / 45)); return; }
  if (LG.last !== s || hard > 4) { s.touches++; LG.hits++; }
  LG.prev = LG.last && LG.last !== s ? LG.last : LG.prev; LG.last = s; LG.lastHitT = LG.t; LG.lastHitBy = s;
  if (hard > 3) lgSnd('hit', Math.min(1, hard / 45));
}
function lgGoal(team) {
  if (LG.ph !== 'play') { // a goal in the count can't happen, but keep it safe
    lgKickoff(); return;
  }
  LG.score[team]++;
  const by = LG.last && LG.last.team === team ? LG.last : (LG.prev && LG.prev.team === team ? LG.prev : null);
  if (by) by.goals++;
  const own = !by && LG.last && LG.last.team !== team;
  LG.goals.push({ team, by: by ? by.nm : null, byI: by ? by.i : null, own, t: LG.ot ? LG.len : LG.len - LG.clock });
  LG.ph = 'goal'; LG.phT = LGC.CELEB;
  lgGoalShow(team, by, own);
}
// a goal, as everyone sees and hears it (online, the others' screens call this from the host's word: src/lgnet.js)
function lgGoalShow(team, by, own) {
  const T = LG_TEAMS[team];
  lgSay(own ? `Own goal! ${T.name} scores` : by ? `${by.me ? 'You score!' : by.nm + ' scores for ' + T.name}` : `${T.name} scores!`, LGC.CELEB);
  LG.ball.gone = true; LG.goalAt = { team, x: LG.ball.x, y: LG.ball.y, t: LG.t };
  lgSnd('goal', team === lgMeShip().team ? 1 : 0.6);
  if (typeof lg3dGoal === 'function') lg3dGoal(team);
  if (typeof padRumble === 'function') padRumble(0.6, 0.6, 400);
}
function lgOver() { return LG.ot || (LG.clock <= 0 && LG.score[0] !== LG.score[1]); }
function lgEnd() {
  LG.ph = 'end'; LG.msgT = 0; { const el = $('lgMsg'); if (el) el.classList.remove('on'); }
  const me = lgMeShip(), mine = LG.score[me.team], theirs = LG.score[1 - me.team], res = mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw';
  // (online matches are kept apart from those against bots alone)
  const st = lgStore.get(), rk = LG.net ? 'onl' : 'rec'; st[rk] = st[rk] || { w: 0, d: 0, l: 0, g: 0, m: 0 };
  st[rk].m++; st[rk].g += me.goals; if (res === 'win') st[rk].w++; else if (res === 'loss') st[rk].l++; else st[rk].d++;
  lgStore.set(st);
  lgSnd(res === 'win' ? 'win' : 'horn');
  $('lgEndHead').textContent = res === 'win' ? 'Victory' : res === 'loss' ? 'Defeat' : 'A draw';
  $('lgEndSub').textContent = `Blue ${LG.score[0]} · ${LG.score[1]} Orange${LG.ot ? ' (after overtime)' : ''}`;
  const rows = LG.ships.slice().sort((a, b) => a.team - b.team || b.goals - a.goals || b.touches - a.touches);
  $('lgAgain').textContent = LG.net ? 'Back to the lobby' : 'Play again';
  $('lgEndTable').innerHTML = '<tr><th>Ship</th><th>Side</th><th>Goals</th><th>Touches</th></tr>' + rows.map(s => `<tr class="${s.me ? 'me' : ''}"><td>${lgEsc(s.nm)} <small>${lgEsc(s.boat.name || s.boat.id)}${LG.net && s.bot ? ' · bot' : ''}</small></td><td style="color:${LG_TEAMS[s.team].col}">${LG_TEAMS[s.team].name}</td><td>${s.goals}</td><td>${s.touches}</td></tr>`).join('');
  $('lgEnd').hidden = false;
  setTimeout(() => { const b = $('lgAgain'); if (b && !$('lgEnd').hidden) b.focus({ preventScroll: true }); }, 60);
  lgCardRender();
}
const lgEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- the bots ----------
// where the ball will be in t seconds (it slows on the water)
function lgBallAt(t) { const B = LG.ball, k = (1 - Math.exp(-0.32 * t)) / 0.32; return [lgClamp(B.x + B.vx * k, -LGC.AX + 6, LGC.AX - 6), lgClamp(B.y + B.vy * k, -LGC.AY - 4, LGC.AY + 4)]; }
function lgBot(s, dt) {
  const A = s.ai, sk = LG_SKILL[LG.set.skill] || LG_SKILL.fair, B = LG.ball;
  A.t -= dt; if (A.t > 0 && LG.ph === 'play') return; A.t = sk.react * (0.6 + Math.random() * 0.8);
  const sg = s.team === 0 ? 1 : -1, goal = [0, (LGC.AY + 8) * sg], home = [0, -(LGC.AY - 4) * sg];
  const V = s.v + s.bv, Vs = Math.max(12, Math.abs(V));
  // who on my side goes for it: the one who'd get there first (and a human on my side counts)
  const mates = LG.ships.filter(o => o.team === s.team);
  const eta = o => Math.hypot(B.x - o.x, B.y - o.y) / Math.max(12, Math.abs(o.v + o.bv)) + (((B.y - o.y) * sg) < 0 ? 1.2 : 0);
  const order = mates.slice().sort((a, b) => eta(a) - eta(b)), rank = order.indexOf(s);
  const deep = mates.slice().sort((a, b) => (a.y - b.y) * sg)[0];
  A.role = rank === 0 ? 'go' : mates.length > 1 && s === deep && rank > 0 ? 'keep' : 'wait';
  if (mates.length === 1) A.role = 'go';
  // the ball's coming at my goal fast and close: whoever's nearest goes for it whatever
  const danger = (B.y * sg < -LGC.AY * 0.45) && (B.vy * sg < -8);
  if (danger && rank <= 1) A.role = 'go';
  let tx, ty, want;
  const tLead = Math.min(2.5, Math.hypot(B.x - s.x, B.y - s.y) / Vs) * sk.see, [bx, by] = lgBallAt(tLead);
  if (A.role === 'go') {
    // line up behind the ball on the line to their goal; close in and drive through it
    let gx = goal[0] - bx, gy = goal[1] - by; const gl = Math.hypot(gx, gy) || 1; gx /= gl; gy /= gl;
    // defending deep: just clear it away from my goal, out to the side
    if (by * sg < -LGC.AY * 0.6) { gx = Math.sign(bx || 1) * 0.6; gy = sg * 0.8; }
    const toB = [bx - s.x, by - s.y], dB = Math.hypot(toB[0], toB[1]) || 1, behind = (toB[0] * gx + toB[1] * gy) / dB;
    if (behind > 0.55 || dB < 14) { tx = bx - gx * LGC.R * 0.7; ty = by - gy * LGC.R * 0.7; want = sk.v * (behind > 0.8 ? 1.15 : 0.85); }
    else {
      // round to the right side of it first: a point behind it, swung out
      const back = 22 + s.boat.len * 0.6; tx = bx - gx * back; ty = by - gy * back;
      const side = (s.x - bx) * gy - (s.y - by) * gx > 0 ? 1 : -1; tx += gy * side * 10; ty -= gx * side * 10;
      want = sk.v * 0.8;
    }
    want = Math.min(want, 14 + dB * 1.1);
  } else if (A.role === 'keep') {
    // stand in front of my goal, on the line to the ball
    const kx = lgClamp(bx * 0.35, -LGC.GW * 0.45, LGC.GW * 0.45), ky = home[1] + sg * 20;
    tx = kx; ty = ky; const d = Math.hypot(tx - s.x, ty - s.y); want = Math.min(sk.v * 0.8, 3 + d * 0.9);
    if (d < 10) { tx = bx; ty = by; want = 6; }
  } else {
    // wait behind the play, between the ball and my goal, off to one side
    tx = lgClamp(bx * 0.5 + (s.slot % 2 ? 22 : -22), -LGC.AX + 15, LGC.AX - 15); ty = lgClamp(by - sg * 55, -LGC.AY + 20, LGC.AY - 20);
    const d = Math.hypot(tx - s.x, ty - s.y); want = Math.min(sk.v * 0.7, 3 + d * 0.8);
  }
  // a little error in the aim
  tx += (Math.random() - 0.5) * sk.err * 30; ty += (Math.random() - 0.5) * sk.err * 30;
  let des = Math.atan2(tx - s.x, ty - s.y), diff = lgAng(des - s.h);
  // stuck on a wall, or the target behind and close: back off a moment
  const near = lgWalls().some(w => lgSegHit(w, s.x + Math.sin(s.h) * s.boat.len * 0.55, s.y + Math.cos(s.h) * s.boat.len * 0.55, 6));
  if (near && Math.abs(V) < 6) A.stuck += A.t > 0 ? A.t : dt; else A.stuck = Math.max(0, A.stuck - dt);
  if (A.stuck > 1.2) { A.back = 1.3; A.stuck = 0; }
  if (A.back > 0) { A.back -= Math.max(dt, A.t); A.steer = -Math.sign(diff || 1); A.sail = -1; A.gale = false; return; }
  A.steer = lgClamp(diff * 2.6, -1, 1);
  if (Math.abs(diff) > 1.3) want = Math.min(want, 13);
  if (LG.ph === 'count') { A.sail = 0; A.gale = false; return; }
  A.sail = V < want - 2 ? 1 : V > want + 5 ? -1 : 0;
  A.gale = sk.gale > 0 && Math.abs(diff) < 0.22 && s.gale > 10 && V < want + 6 && (A.role === 'go' || danger) && Math.random() < sk.gale;
}

// ---------- the screen ----------
function lgEnter() {
  try { audioInit(); } catch (e) {}
  if (typeof lg3dInit === 'function' && !lg3dInit()) { if (typeof toast === 'function') toast('Skerry League needs WebGL, which this browser has turned off.', 'No 3D'); }
  state = 'league'; paused = false;
  $('titleCard').hidden = true; $('hud').hidden = true; $('logbox').hidden = true; $('biomeBanner').hidden = true;
  $('lgUI').hidden = false; $('lgPause').hidden = true; $('lgEnd').hidden = true;
  document.body.classList.add('lgon');
  const coarse = matchMedia && matchMedia('(pointer: coarse)').matches; $('lgPadBox').hidden = !coarse;
  if (typeof lg3dResize === 'function') lg3dResize();
  lgHud(true);
}
function lgExit() {
  const wasNet = !!LG.net;
  LG.on = false; LG.ph = 'off'; LG.net = null;
  if (wasNet && typeof lgnStop === 'function') lgnStop();
  $('lgUI').hidden = true; document.body.classList.remove('lgon');
  state = 'title'; toTitle();
  setTimeout(() => { const c = $('lgTitle'); if (c) c.scrollIntoView({ block: 'start' }); lgCardRender(); }, 60);
}
function lgQuit() { if (!LG.on) return; lgExit(); }
function lgPauseOpen(on) { if (!LG.on || LG.ph === 'end') return; $('lgPause').hidden = !on; $('lgRestart').hidden = !!LG.net; if (on) setTimeout(() => $('lgResume').focus({ preventScroll: true }), 30); }
function lgSay(t, s) { LG.msg = t; LG.msgT = s || 2; const el = $('lgMsg'); if (el) { el.textContent = t; el.classList.add('on'); } }
const lgTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function lgHud(full) {
  if (!LG.on) return;
  const me = lgMeShip(); if (!me) return;
  $('lgSB').textContent = LG.score[0]; $('lgSO').textContent = LG.score[1];
  $('lgClock').textContent = LG.ot ? '+' + lgTime(LG.clock) : lgTime(LG.clock);
  $('lgClock').classList.toggle('ot', LG.ot);
  const big = $('lgCount');
  if (LG.ph === 'count') { big.hidden = false; big.textContent = String(Math.max(1, Math.ceil(LG.phT))); } else big.hidden = true;
  const g = Math.round(me.gale); if (g !== LG.hudG) { LG.hudG = g; $('lgGale').style.setProperty('--p', g + '%'); $('lgGaleN').textContent = g; }
  $('lgGaleBox').classList.toggle('on', me.galeOn);
  const kn = Math.round(Math.abs(me.v + me.bv) * 1.944); if (kn !== LG.hudK) { LG.hudK = kn; $('lgSpeed').textContent = (me.v + me.bv < -0.5 ? '−' : '') + kn; }
  $('lgCamBtn').textContent = LG.cam === 'ball' ? 'Ball cam' : 'Ship cam';
  lgMap();
}
// the little chart of the pool in the corner: the walls, the goals, the ball and every ship
function lgMap() {
  const cv = $('lgMap'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 90, h = cv.clientHeight || 140;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const k = Math.min((w - 8) / (LGC.AX * 2), (h - 8) / ((LGC.AY + LGC.GD) * 2)), X = x => w / 2 + x * k, Y = y => h / 2 - y * k;
  c.fillStyle = 'rgba(10,26,40,0.72)'; c.strokeStyle = 'rgba(220,230,240,0.55)'; c.lineWidth = 1;
  c.beginPath(); const { AX, AY, CH } = LGC; [[-AX + CH, -AY], [AX - CH, -AY], [AX, -AY + CH], [AX, AY - CH], [AX - CH, AY], [-AX + CH, AY], [-AX, AY - CH], [-AX, -AY + CH]].forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(X(-AX), Y(0)); c.lineTo(X(AX), Y(0)); c.stroke();
  for (const [sg, T] of [[-1, LG_TEAMS[0]], [1, LG_TEAMS[1]]]) { c.fillStyle = T.col; c.fillRect(X(-LGC.GW / 2), Y(sg > 0 ? AY + LGC.GD : -AY), LGC.GW * k, LGC.GD * k); }
  for (const s of LG.ships) { c.save(); c.translate(X(s.x), Y(s.y)); c.rotate(s.h); c.fillStyle = LG_TEAMS[s.team].col; c.beginPath(); const L = Math.max(4, s.boat.len * k * 0.6); c.moveTo(0, -L); c.lineTo(L * 0.55, L * 0.7); c.lineTo(-L * 0.55, L * 0.7); c.closePath(); c.fill(); if (s.me) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); } c.restore(); }
  if (!LG.ball.gone) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X(LG.ball.x), Y(LG.ball.y), Math.max(2.5, LGC.R * k), 0, 7); c.fill(); }
}
function lgCam() { LG.cam = LG.cam === 'ball' ? 'ship' : 'ball'; const st = lgStore.get(); st.cam = LG.cam; lgStore.set(st); lgSnd('tick'); lgHud(true); }

// ---------- keys, the controller, touch ----------
function lgKey(e, down) {
  if (state !== 'league') return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Escape') return;
  const k = e.key, K = LG.keys;
  if (k === 'Escape') { if (down) { e.preventDefault(); if ($('lgEnd').hidden) lgPauseOpen($('lgPause').hidden); } e.stopImmediatePropagation(); return; }
  if (!$('lgPause').hidden || !$('lgEnd').hidden) { if (!down) for (const x in K) K[x] = false; return; }
  e.stopImmediatePropagation();
  const set = (n) => { K[n] = down; e.preventDefault(); };
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') set('l');
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') set('r');
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') set('u');
  else if (k === 'ArrowDown' || k === 's' || k === 'S') set('d');
  else if (k === 'Shift' || k === ' ') set('g');
  else if ((k === 'c' || k === 'C' || k === 'v' || k === 'V') && down && !e.repeat) lgCam();
}
addEventListener('keydown', e => lgKey(e, true), true);
addEventListener('keyup', e => lgKey(e, false), true);
addEventListener('blur', () => { for (const x in LG.keys) LG.keys[x] = false; });
// the controller: left stick or D-pad steers, RT makes sail, LT shortens it (and backs her), A or B the Gale, Y the
// camera, Start the menu
function lgPadPoll(dt) {
  const p = typeof firstPad === 'function' ? firstPad() : null; if (!p) { LG.padSteer = 0; LG.padSail = 0; LG.padGale = false; return; }
  const now = p.buttons.map(b => b.pressed), prev = LG.padPrev || [], down = i => now[i] && !prev[i]; LG.padPrev = now;
  const ov = !$('lgPause').hidden ? 'lgPause' : !$('lgEnd').hidden ? 'lgEnd' : null;
  if (ov) {
    if (ov === 'lgPause' && (down(1) || down(9))) { lgPauseOpen(false); return; }
    const bs = [...$(ov).querySelectorAll('button:not([hidden])')], i = bs.indexOf(document.activeElement);
    if (down(12) || down(14)) (bs[(i - 1 + bs.length) % bs.length] || bs[0]).focus(); if (down(13) || down(15)) (bs[(i + 1) % bs.length] || bs[0]).focus();
    if (down(0) && document.activeElement && bs.includes(document.activeElement)) document.activeElement.click();
    LG.padSteer = 0; LG.padSail = 0; LG.padGale = false; return;
  }
  const ax = Math.abs(p.axes[0] || 0) > 0.18 ? p.axes[0] : 0;
  LG.padSteer = ax + (now[15] ? 1 : 0) - (now[14] ? 1 : 0);
  const lt = p.buttons[6] ? p.buttons[6].value : 0, rt = p.buttons[7] ? p.buttons[7].value : 0;
  LG.padSail = (rt > 0.15 ? rt : 0) - (lt > 0.15 ? lt : 0) + (now[12] ? 1 : 0) - (now[13] ? 1 : 0);
  LG.padGale = !!(now[0] || now[1]);
  if (down(3)) lgCam();
  if (down(9)) lgPauseOpen(true);
}

// ---------- sound (Web Audio, src/audio.js) ----------
function lgSnd(k, v) {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  v = v == null ? 1 : v;
  try {
    if (k === 'tick') tone(880, 'square', 0.002, 0.05 * 1, 0.12);
    else if (k === 'go') { tone(1320, 'square', 0.002, 0.06, 0.4); tone(660, 'triangle', 0.002, 0.08, 0.5); }
    else if (k === 'hit') { noise('lowpass', 500 + 900 * v, 1, 0.001, 0.25 * v + 0.05, 0.18); tone(140 + 90 * v, 'sine', 0.001, 0.2 * v + 0.05, 0.2); }
    else if (k === 'wall' || k === 'thud') noise('lowpass', 300, 1, 0.001, 0.18 * v + 0.04, 0.22);
    else if (k === 'post') { tone(520, 'triangle', 0.001, 0.14 * v + 0.05, 0.6); tone(780, 'sine', 0.001, 0.06, 0.5); }
    else if (k === 'bump') noise('bandpass', 220, 1.5, 0.001, 0.2 * v + 0.05, 0.25);
    else if (k === 'splash') { if (typeof sfxSplash === 'function') sfxSplash(0, 0.4 * v + 0.2); }
    else if (k === 'pad') { tone(660, 'sine', 0.005, 0.08 * v, 0.18, { to: 1320 }); noise('highpass', 3000, 1, 0.002, 0.04 * v, 0.2); }
    else if (k === 'goal') { if (typeof sfxBell === 'function') sfxBell(); if (typeof sfxHorn === 'function') sfxHorn(0, 0.8 * v); }
    else if (k === 'horn') { if (typeof sfxHorn === 'function') sfxHorn(0, 0.7); }
    else if (k === 'win') { if (typeof sfxChime === 'function') sfxChime(); if (typeof sfxBell === 'function') sfxBell(); }
  } catch (e) {}
}

// ---------- the card on the title screen ----------
function lgCardRender() {
  const el = $('lgRecord'); if (!el) return;
  const r = (lgStore.get().rec) || null;
  const o = (lgStore.get().onl) || null, line = (r, w) => `${w}: ${r.w} won, ${r.d} drawn, ${r.l} lost · ${r.g} goal${r.g === 1 ? '' : 's'} in ${r.m} match${r.m === 1 ? '' : 'es'}`;
  el.textContent = r && r.m ? line(r, 'Your record') : 'No matches played yet.';
  if (o && o.m) el.textContent += ' · ' + line(o, 'Online');
}
function lgPlayLocal() {
  if (typeof LGN !== 'undefined' && LGN.code && typeof lgnLeave === 'function') lgnLeave();
  lgStart({ size: +$('lgSize').value, mins: +$('lgMins').value, skill: $('lgSkill').value, boat: $('lgBoat').value, fleet: $('lgFleet').value });
}
function lgDebug(o) { lgStart(Object.assign({ size: 2, mins: 5, skill: 'fair' }, o || {})); }
function lgDebugGoal(team) { if (LG.ph !== 'play') { LG.ph = 'play'; } LG.ball.x = 0; LG.ball.y = (LGC.AY + LGC.R + 2) * (team === 0 ? 1 : -1); LG.ball.vx = 0; LG.ball.vy = 0; lgBall(0.001); }

(function lgInit() {
  if (!$('lgTitle')) return;
  const st = lgStore.get(), set = st.set || {};
  const sel = $('lgBoat');
  if (sel && typeof BOATS !== 'undefined') { sel.innerHTML = BOATS.map(b => `<option value="${b.id}">${lgEsc(b.name)}</option>`).join(''); sel.value = set.boat || (typeof CRATES !== 'undefined' && CRATES.boat) || 'brig'; if (!sel.value) sel.value = 'brig'; }
  if (set.size) $('lgSize').value = String(set.size);
  if (set.mins) $('lgMins').value = String(set.mins);
  if (set.skill) $('lgSkill').value = set.skill;
  if (set.fleet) $('lgFleet').value = set.fleet;
  if (st.nick) $('lgNick').value = String(st.nick).slice(0, 16);
  $('lgNick').addEventListener('change', () => { const s = lgStore.get(); s.nick = $('lgNick').value.slice(0, 16); lgStore.set(s); });
  $('lgPlay').addEventListener('click', lgPlayLocal);
  $('lgSettings').addEventListener('click', () => $('titleSettings').click());
  if ($('lgBanner')) $('lgBanner').addEventListener('click', () => { $('lgTitle').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => $('lgPlay').focus({ preventScroll: true }), 400); });
  $('lgResume').addEventListener('click', () => lgPauseOpen(false));
  $('lgRestart').addEventListener('click', () => { $('lgPause').hidden = true; lgStart(LG.set); });
  $('lgLeave').addEventListener('click', lgQuit);
  $('lgMenuBtn').addEventListener('click', () => lgPauseOpen(true));
  $('lgCamBtn').addEventListener('click', lgCam);
  $('lgAgain').addEventListener('click', () => { $('lgEnd').hidden = true; if (LG.net) lgQuit(); else lgStart(LG.set); });
  $('lgEndMenu').addEventListener('click', lgQuit);
  // touch: hold the buttons
  for (const [id, key] of [['lgTL', 'l'], ['lgTR', 'r'], ['lgTU', 'u'], ['lgTD', 'd'], ['lgTG', 'g']]) {
    const b = $(id); if (!b) continue;
    const on = e => { e.preventDefault(); LG.touch[key] = true; b.classList.add('on'); }, off = () => { LG.touch[key] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, off);
  }
  addEventListener('resize', () => { if (LG.on && typeof lg3dResize === 'function') lg3dResize(); });
  lgCardRender();
})();
