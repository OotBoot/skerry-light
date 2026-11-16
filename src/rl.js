'use strict';
// Rival Lights: a duel of lights for two, in real time. Two keepers' rocks face each other across a tidal race; each
// keeps a Great Light (at the back, in the middle) and two Lamp Towers (one forward on each lane). Each player holds
// four cards from a deck of eight (src/rlcards.js) and spends lamp oil on them: crews, crabs, the drowned and the
// birds walk or fly over the two causeways at the towers across the water; spells fall anywhere; buildings stand
// where they're set down and wear away. A fallen Lamp Tower is a crown, the Great Light falling is all three and ends
// it. Three minutes; the last minute fills oil twice as fast; level at time is a minute of overtime, sudden death;
// still level, a draw. Against the bot (src/rlbot.js) or online (src/rlnet.js, the host runs the match).
//
// This file is the rules and the match: the state (RL, its shape agreed in design.md, read by the view src/rl3d.js,
// the HUD src/rlhud.js, the bot and the net code), the simulation, the snapshots that carry it to another screen, and
// the way in and out of the mode (state 'rival', drawn from src/main.js's frame loop through rlFrame).
//
// The simulation runs in fixed ticks of a twentieth of a second (rlTick), so that a match plays the same on every
// screen and at any frame rate; what's drawn between ticks is interpolated (rlAlpha: each unit keeps px, py, where it
// was at the last tick). Arena units are tiles: x 0 to 18 across, y 0 to 32 from side 0's back edge to side 1's; the
// race (water) is y 15 to 17, crossed by two causeways two tiles wide centred on x 3.5 and x 14.5.
// Ground troops walk to the near end of the better causeway, cross, and go for the nearest thing they may hit within
// sight (5.5 tiles), else the next enemy tower down their lane (the Lamp Tower, then the Great Light). Flyers go
// straight. Everyone keeps a little apart (circle separation; towers and buildings don't give way). A unit that has
// begun to strike keeps its target while it stays in reach. Towers shoot the nearest enemy in range; the Great Light
// sleeps until it's hit or one of its Lamp Towers falls.
// The abilities on the cards (see the top of src/rlcards.js) are all here: revive, bomb, cloak, charge, slowhit for
// troops; lob, stun, wave, haar and bolts for spells; lure and spawn for buildings.
//
// The state's arrays: T the six towers (fixed order: side 0's Great Light, left lamp, right lamp, then side 1's), U the
// units (troops and buildings), P the projectiles (each knows where it left from, sx sy, and where it's going, tx ty,
// homing on its target; its place is the straight line between, with an arc for the lobbed ones), Z the lasting
// spells (the haar's fog bank, the rogue wave rolling), and FX the events for the view and the sound (ids rise through
// the match; each consumer remembers the highest id it has handled; most are kept two seconds, hits a little less).
// The snapshot (rlSnap) is all of it in short arrays, numbers in tenths; rlApply puts it into the RL of another screen,
// the guest's, which doesn't step the simulation, only interpolates between snapshots and draws.
//
// Hooks into the other parts, all optional (typeof checks): rlDeckMine(), rlSkinMine() (the deck and the tower skin,
// src/rldeck.js, src/rlcrates.js), rlRecord(r) at the end (stats and crates), rlnRequest(play) for the guest's cards,
// rlnTick(dt) every frame online, rlnStop() on leaving an online match, rlnBackToLobby() back on the title card.
// Tests: rlDebugSpeed(x) runs the clock x times as fast; rlDebugBots(on) lets a second bot play side 0 as well.

const RLC = { DT: 0.05, W: 18, H: 32, R0: 15, R1: 17, LX: [3.5, 14.5], CW: 1, OIL0: 5, OILT: 2.8, MAXOIL: 10, LEN: 180, DBL: 60, OT: 60, SIGHT: 5.5, COUNT: 3, DEP: 0.8, POCKET: 4 };
const RL_TW = { lamp: { hp: 3050, dmg: 109, hit: 0.8, rng: 7.5, r: 1.2 }, great: { hp: 4800, dmg: 109, hit: 1.0, rng: 7, r: 1.6 } };
// what each shooter throws, and how fast it flies (tiles a second); the lobbed ones arc (src/rl3d.js draws the arc)
const RL_SHOT = { harpooner: 'harpoon', coastguard: 'shot', cormorant: 'stone', lamplighter: 'oil', mooncusser: 'lantern', lightkeeper: 'flare', battery: 'ball', swivel: 'shot' };
const RL_PSPD = { bolt: 15, harpoon: 11, shot: 20, stone: 10, oil: 7, lantern: 6.5, flare: 13, ball: 12 };
const RL_PK = ['bolt', 'harpoon', 'shot', 'stone', 'oil', 'lantern', 'flare', 'ball', 'lob', 'keg'];
const RL_FK = ['deploy', 'spell', 'die', 'tower', 'hit', 'boom', 'revive', 'bolt', 'ring', 'flash', 'go', 'dbl', 'ot', 'spawn', 'end', 'crown', 'splash'];
const RL_ST = ['idle', 'walk', 'hit'];
const RL_BOTNM = { easy: 'Apprentice Pell', normal: 'Keeper Morrow', hard: 'Old Grisewood' };
var RL = { on: false, mode: 'bot', me: 0, ph: 'off', t: 0, left: RLC.LEN, ot: false, dbl: false, oil: [0, 0], hand: [[], []], next: ['', ''], queue: [[], []],
  names: ['', ''], skins: ['', ''], decks: [[], []], T: [], U: [], P: [], Z: [], FX: [], crowns: [0, 0], win: -1, bot: { lvl: 'normal' }, nid: 1, clk: 0, cnt: 0, acc: 0, speed: 1, net: null };

// ---------- small things ----------
function rlRng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rlD = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rlR = e => e.r != null ? e.r : e.size;   // (a tower's radius, or a unit's body)
const rlIsGuest = () => RL.mode === 'net' && !!RL.net && !RL.net.host;
const rlLaneOf = x => x < RLC.W / 2 ? 0 : 1;
function rlFx(k, o) { const f = Object.assign({ id: RL.nid++, k, at: RL.clk }, o); RL.FX.push(f); return f; }
function rlMyName() { const v = (typeof NET !== 'undefined' && NET.nick) || ''; return String(v).replace(/[\u0000-\u001f<>&"]/g, '').trim().slice(0, 16) || 'You'; }
function rlDeckOk(d) { return Array.isArray(d) && d.length === 8 && d.every(c => RL_CARD[c]) && new Set(d).size === 8 ? d.slice() : RL_DEFAULT_DECK.slice(); }

// ---------- the match begins ----------
// o = { mode: 'bot' | 'net', me, names, decks: [[8], [8]], skins: [a, b], lvl, seed, net: { host } }
function rlStart(o) {
  o = o || {};
  const seed = (o.seed >>> 0) || ((Math.random() * 4294967295) >>> 0);
  Object.assign(RL, { on: true, mode: o.mode === 'net' ? 'net' : 'bot', me: o.me === 1 ? 1 : 0, net: o.net || null, ph: 'count', t: 0, left: RLC.LEN, ot: false, dbl: false,
    oil: [RLC.OIL0, RLC.OIL0], names: [0, 1].map(i => String((o.names && o.names[i]) || (i ? 'Rival' : 'You')).slice(0, 16)), skins: [0, 1].map(i => (o.skins && o.skins[i]) || ''),
    decks: [0, 1].map(i => rlDeckOk(o.decks && o.decks[i])), U: [], P: [], Z: [], FX: [], crowns: [0, 0], win: -1, bot: { lvl: o.lvl || 'normal' }, nid: 1, clk: 0, cnt: RLC.COUNT, acc: 0,
    seed, rng: rlRng(seed), pend: null, recorded: false, lastSnap: 0, snapDur: 90, both: RL.both || false });
  RL.hand = [[], []]; RL.next = ['', '']; RL.queue = [[], []];
  for (const s of [0, 1]) { const d = RL.decks[s].slice(); for (let i = d.length - 1; i > 0; i--) { const j = (RL.rng() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; } RL.hand[s] = d.slice(0, 4); RL.next[s] = d[4]; RL.queue[s] = d.slice(5); }
  RL.T = [];
  for (const s of [0, 1]) { const Y = y => s ? RLC.H - y : y; RL.T.push(rlTower(s, 'great', -1, 9, Y(3.5)), rlTower(s, 'lamp', 0, RLC.LX[0], Y(7)), rlTower(s, 'lamp', 1, RLC.LX[1], Y(7))); }
  if (typeof rlBotReset === 'function') rlBotReset();
  rlEnter();
  rlFx('go', { x: 9, y: 16, side: 0 });
}
function rlTower(side, k, lane, x, y) { const S = RL_TW[k]; return { id: RL.nid++, side, k, lane, x, y, r: S.r, hp: S.hp, max: S.hp, awake: k === 'lamp', cd: 0, tg: 0, down: 0 }; }
// against the bot: my deck and skin (Meta's), its deck, the level from the title card's select
function rlPlayBot(lvl) {
  lvl = lvl || ($('rlBotLvl') && $('rlBotLvl').value) || 'normal'; if (!RL_BOTNM[lvl]) lvl = 'normal';
  const mine = typeof rlDeckMine === 'function' ? rlDeckMine() : RL_DEFAULT_DECK, sk = typeof rlSkinMine === 'function' ? rlSkinMine() : '';
  rlStart({ mode: 'bot', me: 0, names: [rlMyName(), RL_BOTNM[lvl]], decks: [mine, typeof rlBotDeck === 'function' ? rlBotDeck(lvl) : RL_DEFAULT_DECK], skins: [sk || '', ''], lvl });
}

// ---------- playing a card ----------
// may this side set this card down here? (spells: anywhere on the arena; the rest on your own bank, or the pocket
// beyond the race opened when the enemy Lamp Tower of that lane falls; never on a standing tower)
function rlCanPlace(side, c, x, y) {
  const C = RL_CARD[c]; if (!C || !(x >= 0.4 && x <= RLC.W - 0.4 && y >= 0.4 && y <= RLC.H - 0.4)) return false;
  if (C.type === 'spell') return true;
  let ok = side === 0 ? y < RLC.R0 - 0.1 : y > RLC.R1 + 0.1;
  if (!ok) { const et = RL.T.find(t => t.side !== side && t.k === 'lamp' && t.lane === rlLaneOf(x)); if (et && et.hp <= 0) ok = side === 0 ? y > RLC.R1 + 0.1 && y < RLC.R1 + RLC.POCKET : y < RLC.R0 - 0.1 && y > RLC.R0 - RLC.POCKET; }
  if (!ok) return false;
  for (const t of RL.T) if (t.hp > 0 && Math.hypot(x - t.x, y - t.y) < t.r + 0.35) return false;
  return true;
}
// why not (for the HUD's word): '' when it can be played
function rlWhyNot(side, c, x, y) {
  const C = RL_CARD[c]; if (!C) return 'No card';
  if (RL.ph !== 'play') return RL.ph === 'count' ? 'Not yet' : 'Over';
  if (RL.oil[side] < C.cost - 1e-6) return 'Not enough oil';
  if (x != null && !rlCanPlace(side, c, x, y)) return C.type === 'spell' ? 'Off the arena' : 'Only on your own rock';
  return '';
}
// a card played (by this screen's player, the bot, or the guest through the host): checked, then done
function rlPlay(side, c, x, y) {
  if (!RL.on || RL.ph !== 'play' || (side !== 0 && side !== 1)) return false;
  const i = RL.hand[side].indexOf(c), C = RL_CARD[c]; if (i < 0 || !C) return false;
  x = +x; y = +y; if (!isFinite(x) || !isFinite(y) || RL.oil[side] < C.cost - 1e-6 || !rlCanPlace(side, c, x, y)) return false;
  RL.oil[side] -= C.cost;
  RL.hand[side][i] = RL.next[side]; RL.next[side] = RL.queue[side].shift(); RL.queue[side].push(c);
  if (C.type === 'spell') rlCast(side, C, x, y);
  else {
    const n = C.cnt || 1;
    for (let k = 0; k < n; k++) {
      const r = n > 1 ? 0.5 * Math.sqrt(k + 0.5) : 0, a = k * 2.4 + (side ? Math.PI : 0);
      let px = x + Math.sin(a) * r, py = y + Math.cos(a) * r * 0.8;
      px = Math.max(0.4, Math.min(RLC.W - 0.4, px)); py = Math.max(0.4, Math.min(RLC.H - 0.4, py));
      if (!C.air && py > RLC.R0 && py < RLC.R1) py = side ? RLC.R1 + 0.2 : RLC.R0 - 0.2;
      rlSpawn(side, c, px, py, k * 0.05);
    }
    rlFx('deploy', { c, x, y, side, r: n > 1 ? 1.2 : (C.size || 0.5) + 0.3 });
  }
  return true;
}
// the local player's tap or drop (the guest asks the host instead, and shows a ghost until the snapshot has it)
function rlTry(c, x, y) {
  const why = rlWhyNot(RL.me, c, x, y);
  if (why) { if (typeof rlHudSay === 'function') rlHudSay(why, 1.2, true); return false; }
  if (rlIsGuest()) { if (typeof rlnRequest === 'function') rlnRequest({ c, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }); RL.pend = { c, x, y, at: performance.now(), oil: RL.oil[RL.me] }; return true; }
  return rlPlay(RL.me, c, x, y);
}
function rlSpawn(side, c, x, y, late) {
  const C = RL_CARD[c];
  const u = { id: RL.nid++, c, side, x, y, px: x, py: y, hp: C.hp, max: C.hp, air: !!C.air, size: C.size || 0.4, tg: 0, cd: 0, st: 'idle', face: side ? Math.PI : 0,
    cloak: C.ab === 'cloak' ? C.cl || 3 : 0, slow: 0, stun: 0, bld: C.type === 'building', life: C.life || 0, dep: RLC.DEP + (late || 0), run: 0, chg: 0, rv: 0, fog: 0, ev: C.ev || 0, ring: C.hit || 4, rt: 0, lock: 0 };
  RL.U.push(u); return u;
}

// ---------- spells ----------
function rlCast(side, C, x, y) {
  const dir = side ? -1 : 1;
  rlFx('spell', { c: C.id, x, y, side, r: C.r });
  if (C.ab === 'lob') {
    const g = RL.T.find(t => t.side === side && t.k === 'great'), sx = g ? g.x : 9, sy = g ? g.y : (side ? RLC.H - 3 : 3);
    RL.P.push({ id: RL.nid++, k: C.id === 'powderkeg' ? 'keg' : 'lob', side, sx, sy, x: sx, y: sy, tx: x, ty: y, t: 0, dur: C.fl || 1, tg: 0, dmg: C.dmg, sp: C.r, tw: C.tw, c: C.id, air: 1 });
  } else if (C.ab === 'wave') {
    RL.Z.push({ id: RL.nid++, k: 'wave', side, x, y, y0: y, t: 0, dur: (C.len || 9) / 6, r: C.r, w: C.w || 3, dir, dmg: C.dmg, tw: C.tw, kb: C.kb || 1.5, hit: [] });
  } else if (C.ab === 'haar') {
    RL.Z.push({ id: RL.nid++, k: 'haar', side, x, y, t: 0, dur: C.dur || 5, r: C.r });
  } else if (C.ab === 'bolts') {
    const cand = rlEnemiesIn(side, x, y, C.r, true).sort((a, b) => b.hp - a.hp).slice(0, C.k || 3);
    cand.forEach((e, i) => { rlHurt(e, e.k ? C.dmg * C.tw : C.dmg, side); rlFx('bolt', { c: C.id, x: e.x, y: e.y, side, r: i }); });
    if (!cand.length) rlFx('bolt', { c: C.id, x, y, side, r: 0 });
  } else {
    rlBlast(side, x, y, C.r, C.dmg, C.tw, true);
    if (C.ab === 'stun') for (const e of rlEnemiesIn(side, x, y, C.r, true)) if (!e.k && !e.bld) e.stun = Math.max(e.stun, C.st || 0.5);
    rlFx('flash', { c: C.id, x, y, side, r: C.r });
  }
}
// the enemies of a side within r of a point (their bodies counted): units that may be struck, and towers if asked
function rlEnemiesIn(side, x, y, r, towers, air) {
  const out = [];
  for (const u of RL.U) if (u.side !== side && u.hp > 0 && !(u.cloak > 0) && (air !== false || !u.air) && Math.hypot(u.x - x, u.y - y) <= r + u.size * 0.5) out.push(u);
  if (towers) for (const t of RL.T) if (t.side !== side && t.hp > 0 && Math.hypot(t.x - x, t.y - y) <= r + t.r * 0.6) out.push(t);
  return out;
}
// damage over an area: units in full, towers by tw of it (air too unless air === false)
function rlBlast(side, x, y, r, dmg, tw, air) { for (const e of rlEnemiesIn(side, x, y, r, true, air)) rlHurt(e, e.k ? dmg * (tw == null ? 1 : tw) : dmg, side); }
function rlHurt(e, dmg, by) {
  if (!(dmg > 0) || e.hp <= 0) return;
  e.hp -= dmg;
  if (e.k) { if (e.k === 'great') e.awake = true; e.hitAt = RL.clk; }
}

// ---------- the clock ----------
function rlTick() {
  const dt = RLC.DT; RL.clk += dt;
  if (RL.ph === 'count') { RL.cnt -= dt; if (RL.cnt <= 0) { RL.ph = 'play'; RL.cnt = 0; } rlFxTrim(); return; }
  if (RL.ph !== 'play') { rlFxTrim(); return; }
  RL.t += dt; RL.left -= dt;
  if (!RL.dbl && (RL.ot || RL.left <= RLC.DBL)) { RL.dbl = true; rlFx('dbl', { x: 9, y: 16, side: 0 }); }
  for (const s of [0, 1]) RL.oil[s] = Math.min(RLC.MAXOIL, RL.oil[s] + dt / RLC.OILT * (RL.dbl ? 2 : 1));
  if (typeof rlBotTick === 'function') { if (RL.mode === 'bot') rlBotTick(dt, 1); if (RL.both) rlBotTick(dt, 0); }
  for (const u of RL.U) { u.px = u.x; u.py = u.y; }
  RL.by = new Map(); for (const e of RL.T) RL.by.set(e.id, e); for (const u of RL.U) RL.by.set(u.id, u);
  rlZones(dt);
  for (const u of RL.U.slice()) rlUnit(u, dt);
  rlSeparate();
  rlTowersTick(dt);
  rlShots(dt);
  rlDeaths();
  if (RL.ph === 'play' && RL.left <= 0) {
    if (!RL.ot) { if (RL.crowns[0] !== RL.crowns[1]) rlEnd(RL.crowns[0] > RL.crowns[1] ? 0 : 1); else { RL.ot = true; RL.left = RLC.OT; rlFx('ot', { x: 9, y: 16, side: 0 }); } }
    else rlEnd(RL.crowns[0] === RL.crowns[1] ? 2 : RL.crowns[0] > RL.crowns[1] ? 0 : 1);
  }
  rlFxTrim();
}
function rlFxTrim() { const c = RL.clk; RL.FX = RL.FX.filter(f => c - f.at < (f.k === 'hit' ? 0.7 : 2)); }

// the lasting spells: the haar slows the enemies inside it; the wave rolls on, striking and knocking back each once
function rlZones(dt) {
  for (const u of RL.U) u.fog = 0;
  for (const z of RL.Z) {
    z.t += dt;
    if (z.k === 'haar') { for (const u of RL.U) if (u.side !== z.side && Math.hypot(u.x - z.x, u.y - z.y) <= z.r + u.size * 0.5) u.fog = 1; }
    else if (z.k === 'wave') {
      z.y = z.y0 + z.dir * 6 * Math.min(z.t, z.dur);
      for (const u of RL.U) {
        if (u.side === z.side || u.air || u.hp <= 0 || z.hit.includes(u.id) || Math.abs(u.x - z.x) > z.w / 2 + u.size * 0.5 || Math.abs(u.y - z.y) > z.r + u.size * 0.5) continue;
        z.hit.push(u.id); rlHurt(u, z.dmg, z.side);
        if (!u.bld) { u.y += z.dir * z.kb; u.py = u.y; rlWater(u); u.stun = Math.max(u.stun, 0.3); u.lock = 0; }
        rlFx('splash', { x: u.x, y: u.y, side: z.side });
      }
      for (const t of RL.T) if (t.side !== z.side && t.hp > 0 && !z.hit.includes(t.id) && Math.abs(t.x - z.x) < z.w / 2 + t.r && Math.abs(t.y - z.y) < z.r + t.r * 0.5) { z.hit.push(t.id); rlHurt(t, z.dmg * z.tw, z.side); rlFx('splash', { x: t.x, y: t.y, side: z.side }); }
    }
  }
  RL.Z = RL.Z.filter(z => z.t < z.dur + (z.k === 'wave' ? 0.4 : 0));
}

// ---------- the units ----------
function rlCanHit(tg, side, e) {
  if (!e || e.side === side || e.hp <= 0) return false;
  if (e.k) return true;
  if (e.cloak > 0) return false;
  if (tg === 'ground' && e.air) return false;
  if (tg === 'build' && !e.bld) return false;
  return true;
}
// the next enemy tower down this unit's lane: its Lamp Tower, or the Great Light once that's down
function rlLaneTower(u) {
  const lane = rlLaneOf(u.x), L = RL.T.find(t => t.side !== u.side && t.k === 'lamp' && t.lane === lane && t.hp > 0);
  return L || RL.T.find(t => t.side !== u.side && t.k === 'great' && t.hp > 0) || RL.T.find(t => t.side !== u.side && t.hp > 0);
}
function rlPick(u, C) {
  const sight = u.bld ? C.rng + 0.3 : Math.max(RLC.SIGHT, C.rng + 1);
  // a Bell Buoy draws every walker within its reach
  if (!u.air && !u.bld && C.tg !== 'build') { let bb = null, bd = 1e9; for (const b of RL.U) if (b.side !== u.side && b.hp > 0 && b.c === 'bellbuoy') { const d = rlD(u, b); if (d <= RL_CARD.bellbuoy.rng && d < bd) { bd = d; bb = b; } } if (bb) return bb; }
  let best = null, bd = 1e9;
  for (const e of RL.U) { if (!rlCanHit(C.tg, u.side, e)) continue; const d = rlD(u, e) - e.size; if (d <= sight && d < bd) { bd = d; best = e; } }
  for (const t of RL.T) { if (!rlCanHit(C.tg, u.side, t)) continue; const d = rlD(u, t) - t.r; if (d <= sight && d < bd) { bd = d; best = t; } }
  if (best || u.bld) return best;
  return rlLaneTower(u);
}
// where a walker heads for, to reach (tx, ty): over a causeway if the race lies between
function rlWay(u, tx, ty) {
  if (u.air) return [tx, ty];
  const R0 = RLC.R0, R1 = RLC.R1, side0 = u.y <= R0 ? -1 : u.y >= R1 ? 1 : 0, side1 = ty <= (R0 + R1) / 2 ? -1 : 1;
  if (side0 === 0) { const cx = Math.abs(u.x - RLC.LX[0]) < Math.abs(u.x - RLC.LX[1]) ? RLC.LX[0] : RLC.LX[1]; return [cx + Math.max(-0.5, Math.min(0.5, tx - cx)) * 0.4, side1 < 0 ? R0 - 0.5 : R1 + 0.5]; }
  if (side0 === side1) return [tx, ty];
  const cx = RLC.LX.reduce((b, c) => Math.abs(u.x - c) + Math.abs(tx - c) < Math.abs(u.x - b) + Math.abs(tx - b) ? c : b, RLC.LX[0]);
  const ey = side0 < 0 ? R0 - 0.35 : R1 + 0.35;
  if (Math.abs(u.x - cx) < 0.65 && Math.abs(u.y - ey) < 0.9) return [cx, side0 < 0 ? R1 + 0.5 : R0 - 0.5];
  return [cx, ey];
}
// keep a walker out of the race: on a causeway, or back on the bank it came from
function rlWater(u) {
  if (u.air || !(u.y > RLC.R0 && u.y < RLC.R1)) return;
  const cx = Math.abs(u.x - RLC.LX[0]) < Math.abs(u.x - RLC.LX[1]) ? RLC.LX[0] : RLC.LX[1], hw = RLC.CW - Math.min(0.45, u.size * 0.6);
  if (Math.abs(u.x - cx) <= hw) return;
  if (Math.abs(u.px - cx) <= hw + 0.05 && u.py > RLC.R0 - 0.05 && u.py < RLC.R1 + 0.05) { u.x = cx + Math.sign(u.x - cx) * hw; return; }
  const dx = Math.abs(u.x - cx) - hw, dy = Math.min(u.y - RLC.R0, RLC.R1 - u.y);
  if (dx < dy && dx < 0.6) u.x = cx + Math.sign(u.x - cx) * hw; else u.y = u.py <= (RLC.R0 + RLC.R1) / 2 ? RLC.R0 : RLC.R1;
}
function rlUnit(u, dt) {
  if (u.hp <= 0) return;
  const C = RL_CARD[u.c];
  if (u.dep > 0) { u.dep -= dt; u.st = 'idle'; return; }
  if (u.cloak > 0) u.cloak -= dt;
  if (u.slow > 0) u.slow -= dt;
  if (u.bld) {
    u.hp -= u.max / (u.life || 30) * dt;
    if (C.ab === 'spawn') { u.ev -= dt; if (u.ev <= 0) { u.ev = C.ev || 5; const s = RL_CARD[C.sp] ? C.sp : 'wreckers', dir = u.side ? -1 : 1, w = rlSpawn(u.side, s, u.x + (RL.rng() - 0.5) * 0.8, u.y + dir * (u.size + 0.4), 0); w.dep = 0.4; rlFx('spawn', { c: s, x: w.x, y: w.y, side: u.side }); } }
    if (C.ab === 'lure') { u.ring -= dt; if (u.ring <= 0) { u.ring = C.hit || 4; for (const e of RL.U) if (e.side !== u.side && !e.air && !e.bld && e.hp > 0 && rlD(u, e) <= C.rng) e.slow = Math.max(e.slow, 1); rlFx('ring', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.rng }); } }
    if (!C.dmg) { u.st = 'idle'; return; }
  }
  if (u.stun > 0) { u.stun -= dt; u.st = 'idle'; return; }
  const k = (u.slow > 0 ? 0.65 : 1) * (u.fog ? 0.55 : 1);
  if (u.cd > 0) u.cd -= dt * k;
  // the target: kept while it's being struck and still in reach; else looked for again now and then
  let T = u.tg ? RL.by.get(u.tg) : null;
  const inReach = e => e && rlD(u, e) - rlR(e) - u.size * 0.6 <= C.rng;
  if (T && !(T.k ? T.hp > 0 && T.side !== u.side : rlCanHit(C.tg, u.side, T))) T = null;
  u.rt -= dt;
  if (!T || (u.rt <= 0 && !(u.st === 'hit' && inReach(T)))) { const was = T; T = rlPick(u, C); u.rt = 0.35 + RL.rng() * 0.15; if (T !== was) u.lock = 0; }
  u.tg = T ? T.id : 0;
  if (!T) { u.st = 'idle'; return; }
  if (inReach(T)) {
    if (u.st !== 'hit') { u.cd = Math.max(u.cd, C.hit * 0.35); u.run = 0; }
    u.st = 'hit'; u.face = Math.atan2(T.x - u.x, T.y - u.y);
    if (u.cd <= 0) { rlStrike(u, T, C); u.cd = C.hit; }
    return;
  }
  if (u.bld) { u.st = 'idle'; return; }
  // walking (or flying) on
  const [wx, wy] = rlWay(u, T.x, T.y), dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy) || 1e-6;
  if (C.ab === 'charge' && !u.chg && u.run >= 2) { u.chg = 1; rlFx('flash', { c: u.c, x: u.x, y: u.y, side: u.side, r: 0 }); }
  const sp = C.spd * k * (u.chg ? 2 : 1), step = Math.min(d, sp * dt);
  u.x += dx / d * step; u.y += dy / d * step; u.run += step; u.st = 'walk';
  const fa = Math.atan2(dx, dy); let da = fa - u.face; da = Math.atan2(Math.sin(da), Math.cos(da)); u.face += da * Math.min(1, dt * 10);
}
function rlStrike(u, T, C) {
  const dmg = C.dmg * (u.chg ? 2 : 1); u.chg = 0; u.run = 0;
  if (C.ab === 'bomb') { rlBlast(u.side, u.x, u.y, C.sp || 1.2, C.dmg, 1, false); u.hp = 0; u.boom = 1; rlFx('boom', { c: u.c, x: u.x, y: u.y, side: u.side, r: C.sp || 1.2 }); return; }
  if (C.rng >= 1.2) {
    const k = RL_SHOT[u.c] || 'shot', h = u.air ? 2.2 : 0, d = rlD(u, T);
    RL.P.push({ id: RL.nid++, k, side: u.side, sx: u.x + Math.sin(u.face) * u.size * 0.6, sy: u.y + Math.cos(u.face) * u.size * 0.6, x: u.x, y: u.y, tx: T.x, ty: T.y, t: 0, dur: Math.max(0.12, d / (RL_PSPD[k] || 12)), tg: T.id, dmg, sp: C.sp || 0, c: u.c, tw: 1, air: C.tg === 'any' ? 1 : 0, h, slow: C.ab === 'slowhit' });
    return;
  }
  rlHurt(T, dmg, u.side);
  if (C.sp) rlBlast(u.side, T.x, T.y, C.sp, dmg * 0.6, 1, C.tg === 'any');
  if (C.ab === 'slowhit' && !T.k) T.slow = Math.max(T.slow, 2);
  rlFx('hit', { c: u.c, x: T.x, y: T.y, side: u.side, r: dmg >= 200 ? 2 : dmg >= 110 ? 1 : 0 });
}
// everyone keeps a little apart: walkers push each other (the heavier give less), towers and buildings stand firm
function rlSeparate() {
  const U = RL.U, n = U.length;
  for (let i = 0; i < n; i++) {
    const a = U[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = U[j]; if (b.hp <= 0 || a.air !== b.air) continue;
      const dx = b.x - a.x, dy = b.y - a.y, m = (a.size + b.size) * 0.82; if (Math.abs(dx) > m || Math.abs(dy) > m) continue;
      const d = Math.hypot(dx, dy); if (d >= m) continue;
      const ux = d > 1e-4 ? dx / d : Math.cos(i * 7.1 + j), uy = d > 1e-4 ? dy / d : Math.sin(i * 7.1 + j), o = (m - d) * 0.5;
      const wa = a.bld ? 0 : b.bld ? 1 : (b.size * b.size) / (a.size * a.size + b.size * b.size), wb = b.bld ? 0 : a.bld ? 1 : 1 - wa;
      if (a.bld && b.bld) continue;
      a.x -= ux * o * 2 * wa; a.y -= uy * o * 2 * wa; b.x += ux * o * 2 * wb; b.y += uy * o * 2 * wb;
    }
  }
  for (const u of U) {
    if (u.hp <= 0 || u.bld) continue;
    if (!u.air) for (const t of RL.T) { if (t.hp <= 0) continue; const dx = u.x - t.x, dy = u.y - t.y, m = t.r + u.size * 0.5, d = Math.hypot(dx, dy); if (d < m && d > 1e-4) { u.x = t.x + dx / d * m; u.y = t.y + dy / d * m; } }
    u.x = Math.max(0.3, Math.min(RLC.W - 0.3, u.x)); u.y = Math.max(0.3, Math.min(RLC.H - 0.3, u.y));
    rlWater(u);
  }
}

// ---------- the towers ----------
function rlTowersTick(dt) {
  for (const t of RL.T) {
    if (t.hp <= 0) continue;
    if (t.k === 'great' && !t.awake) { if (t.hp < t.max || RL.T.some(o => o.side === t.side && o.k === 'lamp' && o.hp <= 0)) t.awake = true; else continue; }
    const S = RL_TW[t.k]; if (t.cd > 0) t.cd -= dt;
    let T = t.tg ? RL.by.get(t.tg) : null;
    const ok = e => e && !e.k && e.side !== t.side && e.hp > 0 && !(e.cloak > 0) && e.dep <= 0.3 && rlD(t, e) - e.size * 0.5 <= S.rng;
    if (!ok(T)) { T = null; let bd = 1e9; for (const u of RL.U) if (ok(u)) { const d = rlD(t, u); if (d < bd) { bd = d; T = u; } } }
    t.tg = T ? T.id : 0;
    if (T && t.cd <= 0) {
      t.cd = S.hit; t.shotAt = RL.clk;
      RL.P.push({ id: RL.nid++, k: 'bolt', side: t.side, sx: t.x, sy: t.y, x: t.x, y: t.y, tx: T.x, ty: T.y, t: 0, dur: Math.max(0.1, rlD(t, T) / RL_PSPD.bolt), tg: T.id, dmg: S.dmg, sp: 0, c: '', tw: 1, air: 1, h: t.k === 'great' ? 4.6 : 3.2 });
    }
  }
}
// the projectiles fly (homing on their target while it lives) and strike
function rlShots(dt) {
  const keep = [];
  for (const p of RL.P) {
    p.t += dt; const T = p.tg ? RL.by.get(p.tg) : null;
    if (T && T.hp > 0) { p.tx = T.x; p.ty = T.y; }
    const f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f;
    if (f < 1) { keep.push(p); continue; }
    if (p.k === 'lob' || p.k === 'keg') { rlBlast(p.side, p.tx, p.ty, p.sp, p.dmg, p.tw, true); rlFx('boom', { c: p.c, x: p.tx, y: p.ty, side: p.side, r: p.sp }); continue; }
    if (p.sp) { rlBlast(p.side, p.tx, p.ty, p.sp, p.dmg, 1, !!p.air); rlFx('boom', { c: p.c, x: p.tx, y: p.ty, side: p.side, r: p.sp * 0.6 }); continue; }
    if (T && T.hp > 0) { rlHurt(T, p.dmg, p.side); if (p.slow && !T.k) T.slow = Math.max(T.slow, 2); rlFx('hit', { c: p.c || p.k, x: p.tx, y: p.ty, side: p.side, r: p.dmg >= 200 ? 2 : p.dmg >= 110 ? 1 : 0 }); }
  }
  RL.P = keep;
}
// what has fallen: the drowned rise once more; a fallen tower is a crown (the Great Light all three, and the end)
function rlDeaths() {
  const keep = [];
  for (const u of RL.U) {
    if (u.hp > 0) { keep.push(u); continue; }
    const C = RL_CARD[u.c];
    if (C.ab === 'revive' && !u.rv && !u.boom) { u.rv = 1; u.hp = u.max * 0.5; u.stun = 1.2; u.tg = 0; u.st = 'idle'; rlFx('revive', { c: u.c, x: u.x, y: u.y, side: u.side }); keep.push(u); continue; }
    if (!u.boom) rlFx('die', { c: u.c, x: u.x, y: u.y, side: u.side, r: u.air ? 1 : 0 });
  }
  RL.U = keep;
  for (const t of RL.T) {
    if (t.hp > 0 || t.down) continue;
    t.down = 1; t.hp = 0; const o = 1 - t.side;
    rlFx('tower', { c: t.k, x: t.x, y: t.y, side: t.side, r: RL.T.indexOf(t) });
    if (t.k === 'great') RL.crowns[o] = 3; else { RL.crowns[o] = Math.min(3, RL.crowns[o] + 1); const g = RL.T.find(q => q.side === t.side && q.k === 'great'); if (g) g.awake = true; }
    rlFx('crown', { x: t.x, y: t.y, side: o, r: RL.crowns[o] });
  }
  if (RL.ph !== 'play') return;
  if (RL.crowns[0] >= 3 || RL.crowns[1] >= 3) rlEnd(RL.crowns[0] >= 3 && RL.crowns[1] >= 3 ? 2 : RL.crowns[0] >= 3 ? 0 : 1);
  else if (RL.ot && RL.crowns[0] !== RL.crowns[1]) rlEnd(RL.crowns[0] > RL.crowns[1] ? 0 : 1);
}

// ---------- the end ----------
// win: 0 or 1 (the side that won), 2 a draw. o.norec: shown but not recorded (an online match whose host went)
function rlEnd(win, o) {
  if (!RL.on || RL.ph === 'over') return;
  RL.ph = 'over'; RL.win = win; RL.endAt = RL.clk;
  if (!rlIsGuest()) rlFx('end', { x: 9, y: 16, side: win === 2 ? 0 : win, r: win });
  const me = RL.me, rec = { win: win === me, draw: win === 2, crowns: RL.crowns[me], lost: RL.crowns[1 - me], bot: RL.mode === 'bot', lvl: RL.bot.lvl };
  if (!RL.recorded && !(o && o.norec) && !(RL.net && RL.net.gone) && typeof rlRecord === 'function') { RL.recorded = true; try { rlRecord(rec); } catch (e) { console.error(e); } }
  rlSnd(win === 2 ? 'draw' : win === me ? 'win' : 'lose');
  if (typeof rlHudEnd === 'function') setTimeout(() => { if (RL.on && RL.ph === 'over') rlHudEnd(); }, 1600);
}
function rlQuit() {
  if (!RL.on) return;
  if (RL.mode === 'net' && typeof rlnStop === 'function') { try { rlnStop(); } catch (e) {} }
  RL.on = false; RL.ph = 'off';
  rlExit();
}

// ---------- the snapshot (host to guest) ----------
const rlQ = v => Math.round(v * 10);
const RL_CI = {}; RL_CARDS.forEach((c, i) => { RL_CI[c.id] = i; });
const rlCi = c => c in RL_CI ? RL_CI[c] : -1;
const rlCo = i => i >= 0 && RL_CARDS[i] ? RL_CARDS[i].id : '';
function rlSnap() {
  const fl = u => (u.air ? 1 : 0) | (u.bld ? 2 : 0) | (u.cloak > 0 ? 4 : 0) | (u.slow > 0 ? 8 : 0) | (u.stun > 0 ? 16 : 0) | (u.fog ? 32 : 0) | (u.chg ? 64 : 0) | (u.dep > 0 ? 128 : 0) | (u.rv ? 256 : 0);
  return {
    v: 1, ph: RL.ph, k: rlQ(RL.clk), t: rlQ(RL.t), l: rlQ(RL.left), f: (RL.ot ? 1 : 0) | (RL.dbl ? 2 : 0), cn: rlQ(RL.cnt), o: RL.oil.map(rlQ), h: RL.hand, n: RL.next,
    cr: RL.crowns, w: RL.win, nm: RL.names, sk: RL.skins, lv: RL.bot.lvl,
    T: RL.T.map(t => [Math.round(Math.max(0, t.hp)), (t.awake ? 1 : 0) | (t.down ? 2 : 0), t.tg | 0, t.shotAt != null ? rlQ(RL.clk - t.shotAt) : 99]),
    U: RL.U.map(u => [u.id, rlCi(u.c), u.side, rlQ(u.x), rlQ(u.y), Math.round(u.hp), fl(u), Math.round(u.face * 20), RL_ST.indexOf(u.st), u.tg | 0, Math.round(u.max)]),
    P: RL.P.map(p => [p.id, RL_PK.indexOf(p.k), p.side, rlQ(p.sx), rlQ(p.sy), rlQ(p.tx), rlQ(p.ty), Math.round(p.t * 100), Math.round(p.dur * 100), rlCi(p.c), rlQ(p.h || 0), p.tg | 0]),
    Z: RL.Z.map(z => [z.id, z.k === 'wave' ? 1 : 0, z.side, rlQ(z.x), rlQ(z.y), Math.round(z.t * 100), Math.round(z.dur * 100), rlQ(z.r), rlQ(z.w || 0), z.dir || 0]),
    FX: RL.FX.filter(f => f.k !== 'hit' || RL.clk - f.at < 0.4).slice(-28).map(f => [f.id, RL_FK.indexOf(f.k), f.c in RL_CI ? RL_CI[f.c] : (f.c ? String(f.c) : -1), rlQ(f.x || 0), rlQ(f.y || 0), f.side | 0, rlQ(f.at), f.r == null ? 0 : Math.round(f.r * 10)]),
  };
}
// on the guest: the snapshot becomes the state; every unit starts its glide from where it's drawn now
function rlApply(s) {
  if (!RL.on || !s || s.v !== 1) return;
  const now = performance.now(), a = rlAlpha();
  if (RL.lastSnap) RL.snapDur = Math.max(40, Math.min(300, RL.snapDur * 0.7 + (now - RL.lastSnap) * 0.3));
  RL.lastSnap = now;
  const wasPh = RL.ph, d = v => v / 10;
  RL.ph = s.ph; RL.clk = d(s.k); RL.t = d(s.t); RL.left = d(s.l); RL.ot = !!(s.f & 1); RL.dbl = !!(s.f & 2); RL.cnt = d(s.cn); RL.oil = s.o.map(d);
  RL.hand = s.h; RL.next = s.n; if (s.q) RL.queue = s.q; RL.crowns = s.cr; RL.names = s.nm || RL.names; RL.skins = s.sk || RL.skins; if (s.lv) RL.bot.lvl = s.lv;
  s.T.forEach((e, i) => { const t = RL.T[i]; if (!t) return; if (e[0] < t.hp) t.hitAt = RL.clk; t.hp = e[0]; t.awake = !!(e[1] & 1); t.down = e[1] & 2 ? 1 : 0; t.tg = e[2]; t.shotAt = e[3] < 99 ? RL.clk - d(e[3]) : null; });
  const old = new Map(RL.U.map(u => [u.id, u]));
  RL.U = s.U.map(e => {
    const o = old.get(e[0]), u = o || { id: e[0] }, x = d(e[3]), y = d(e[4]);
    u.px = o ? o.px + (o.x - o.px) * a : x; u.py = o ? o.py + (o.y - o.py) * a : y;
    u.c = rlCo(e[1]); u.side = e[2]; u.x = x; u.y = y; u.hp = e[5]; const f = e[6];
    u.air = !!(f & 1); u.bld = !!(f & 2); u.cloak = f & 4 ? 1 : 0; u.slow = f & 8 ? 1 : 0; u.stun = f & 16 ? 1 : 0; u.fog = f & 32 ? 1 : 0; u.chg = f & 64 ? 1 : 0; u.dep = f & 128 ? 1 : 0; u.rv = f & 256 ? 1 : 0;
    u.face = e[7] / 20; u.st = RL_ST[e[8]] || 'idle'; u.tg = e[9]; u.max = e[10]; u.size = (RL_CARD[u.c] || {}).size || 0.4;
    return u;
  });
  RL.P = s.P.map(e => ({ id: e[0], k: RL_PK[e[1]] || 'shot', side: e[2], sx: d(e[3]), sy: d(e[4]), tx: d(e[5]), ty: d(e[6]), t: e[7] / 100, dur: e[8] / 100, c: rlCo(e[9]), h: d(e[10]), tg: e[11] }));
  RL.P.forEach(p => { const f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; });
  RL.Z = s.Z.map(e => ({ id: e[0], k: e[1] ? 'wave' : 'haar', side: e[2], x: d(e[3]), y: d(e[4]), t: e[5] / 100, dur: e[6] / 100, r: d(e[7]), w: d(e[8]), dir: e[9] }));
  RL.FX = s.FX.map(e => ({ id: e[0], k: RL_FK[e[1]], c: typeof e[2] === 'string' ? e[2] : rlCo(e[2]), x: d(e[3]), y: d(e[4]), side: e[5], at: d(e[6]), r: e[7] / 10 }));
  if (RL.pend && (now - RL.pend.at > 1500 || RL.oil[RL.me] < RL.pend.oil - 0.5)) RL.pend = null;
  if (wasPh !== 'over' && s.ph === 'over') { RL.ph = wasPh; rlEnd(s.w); }
  RL.win = s.w;
}
// how far between the last state and this one to draw: the host by the tick, the guest by the snapshot's age
function rlAlpha() {
  if (rlIsGuest()) return RL.lastSnap ? Math.min(1, (performance.now() - RL.lastSnap) / RL.snapDur) : 1;
  return Math.min(1, RL.acc / RLC.DT);
}
// where to draw a unit just now
function rlPos(u) { const a = rlAlpha(), px = u.px == null ? u.x : u.px, py = u.py == null ? u.y : u.py; return [px + (u.x - px) * a, py + (u.y - py) * a]; }

// ---------- every frame ----------
function rlFrame(dt) {
  if (!RL.on) return;
  const paused = !$('rlPause').hidden && RL.mode === 'bot';
  if (RL.mode === 'net' && typeof rlnTick === 'function') { try { rlnTick(dt); } catch (e) { console.error(e); } }
  if (!paused) {
    if (!rlIsGuest()) { RL.acc += dt * (RL.speed || 1); let n = 0; while (RL.acc >= RLC.DT && n++ < 40) { RL.acc -= RLC.DT; rlTick(); } if (n >= 40) RL.acc = 0; }
    else {
      // the guest: what moves on its own between snapshots (the shots, the oil, the clock), so nothing stutters
      for (const p of RL.P) { p.t += dt; const f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; }
      for (const z of RL.Z) z.t += dt;
      if (RL.ph === 'play') { RL.left = Math.max(0, RL.left - dt); for (const s of [0, 1]) RL.oil[s] = Math.min(RLC.MAXOIL, RL.oil[s] + dt / RLC.OILT * (RL.dbl ? 2 : 1)); }
      RL.clk += dt;
    }
  }
  rlFxSound();
  if (typeof rl3dDraw === 'function') rl3dDraw(dt);
  if (typeof rlHud === 'function') rlHud(dt);
}

// ---------- the screen ----------
function rlEnter() {
  try { audioInit(); } catch (e) {}
  if (typeof rl3dInit === 'function' && !rl3dInit()) { if (typeof toast === 'function') toast('Rival Lights needs WebGL, which this browser has turned off.', 'No 3D'); }
  state = 'rival'; paused = false;
  for (const id of ['titleCard', 'hud', 'logbox', 'biomeBanner']) { const e = $(id); if (e) e.hidden = true; }
  $('rlUI').hidden = false; $('rlPause').hidden = true; $('rlEnd').hidden = true;
  document.body.classList.add('rlon');
  RL.sndSeen = RL.nid; RL.sndP = 0;
  if (typeof rl3dReset === 'function') rl3dReset();
  if (typeof rlHudReset === 'function') rlHudReset();
  rlSnd('start');
}
function rlExit() {
  RL.on = false; if (RL.ph !== 'off') RL.ph = 'off';
  $('rlUI').hidden = true; document.body.classList.remove('rlon');
  if (typeof rl3dReset === 'function') rl3dReset(true);
  state = 'title'; toTitle();
  if (typeof rlnBackToLobby === 'function') { try { rlnBackToLobby(); } catch (e) {} }
  setTimeout(() => { const c = $('rlTitle'); if (c) c.scrollIntoView({ block: 'start' }); if (typeof rlCardRender === 'function') rlCardRender(); }, 60);
}
function rlPauseOpen(on) {
  if (!RL.on) return;
  $('rlPause').hidden = !on;
  if (on) { const s = $('rlPauseSub'); if (s) s.textContent = RL.mode === 'bot' ? 'The match waits while this is open.' : 'Online, the match goes on while this is open.'; setTimeout(() => $('rlResume').focus({ preventScroll: true }), 30); }
}

// ---------- the sound (from what's in src/audio.js and the recordings in src/sfxbank.js) ----------
function rlSnd(k, o) {
  if (typeof AUD === 'undefined' || !AUD.ctx) return;
  o = o || {}; const v = o.vol == null ? 1 : o.vol, P = (n, opt) => typeof sfxPlay === 'function' && sfxPlay(n, opt);
  try {
    if (k === 'start') { if (!P('roundstart', { vol: 0.5 })) sfxChime(); }
    else if (k === 'go') { sfxBellFar(0, 0.7); }
    else if (k === 'tick') sfxTick();
    else if (k === 'deploy') { if (!P('swish', { vol: 0.35 * v, gap: 0.05 })) noise('bandpass', 900, 1, 0.01, 0.12 * v, 0.2); tone(340, 'triangle', 0.005, 0.06 * v, 0.12, { to: 520 }); }
    else if (k === 'build') { if (!P('slam', { vol: 0.4 * v })) noise('lowpass', 400, 1, 0.005, 0.25, 0.3); }
    else if (k === 'spell') { if (!P('swish', { vol: 0.5 })) sfxWhoosh(); }
    else if (k === 'flare') sfxFlare();
    else if (k === 'launch') { if (!P('cannon', { vol: 0.45 })) sfxCannon(); }
    else if (k === 'boom') { if (!P('explode', { vol: 0.55 * v, gap: 0.06 })) noise('lowpass', 500, 0.8, 0.005, 0.4 * v, 0.6); }
    else if (k === 'wave') { sfxSplash(0, 1); noise('lowpass', 700, 0.6, 0.3, 0.25, 1.4, { to: 200 }); }
    else if (k === 'haar') { sfxHorn(0, 0.6); }
    else if (k === 'bolt') { if (!P('stormbolt', { vol: 0.6, gap: 0.1 })) if (!P('thunder', { vol: 0.5 })) noise('highpass', 1800, 0.7, 0.002, 0.3, 0.4); }
    else if (k === 'hit') { if (!P('hit', { vol: 0.22 * v, gap: 0.07 })) noise('bandpass', 1600, 2, 0.001, 0.07 * v, 0.06); }
    else if (k === 'die') { if (!P('splat', { vol: 0.25, gap: 0.08 })) noise('lowpass', 900, 1, 0.003, 0.12, 0.15); }
    else if (k === 'splash') sfxSplash(0, 0.4 * v);
    else if (k === 'tower') { P('debris', { vol: 0.8 }) || noise('lowpass', 300, 0.7, 0.01, 0.5, 1.4); P('explode', { vol: 0.6, delay: 0.1 }); }
    else if (k === 'crown') { [0, 0.1, 0.2].forEach((d, i) => tone(660 + i * 220, 'triangle', 0.005, 0.12, 0.5, { delay: 0.4 + d })); }
    else if (k === 'crownlost') { [0, 0.14].forEach((d, i) => tone(330 - i * 80, 'triangle', 0.01, 0.12, 0.6, { delay: 0.4 + d })); }
    else if (k === 'dbl' || k === 'ot') { sfxHorn(0, 0.8); }
    else if (k === 'ring') sfxBellFar(0, 0.45 * v);
    else if (k === 'revive') { if (!P('moan', { vol: 0.35, gap: 0.4 })) tone(180, 'sawtooth', 0.1, 0.05, 0.6, { to: 120 }); }
    else if (k === 'win') { if (!P('raidwin', { vol: 0.6 })) { if (!P('frwin', { vol: 0.6 })) sfxReveal(3); } }
    else if (k === 'lose') { if (!P('gameover', { vol: 0.55 })) tone(220, 'sine', 0.02, 0.2, 1.4, { to: 110 }); }
    else if (k === 'draw') { sfxChime(); }
    else if (k === 'shot') {
      const c = o.c, pk = o.p;
      if (pk === 'bolt') { if (!P('beam', { vol: 0.12, gap: 0.12 })) tone(1200, 'sine', 0.002, 0.04, 0.12, { to: 2200 }); }
      else if (c === 'harpooner') P('harpoon', { vol: 0.3, gap: 0.15 }) || noise('bandpass', 1200, 2, 0.002, 0.08, 0.1);
      else if (c === 'coastguard') P('longarm', { vol: 0.25, gap: 0.12 }) || noise('highpass', 1500, 1, 0.001, 0.12, 0.08);
      else if (c === 'lightkeeper') P('flaregun', { vol: 0.3, gap: 0.2 }) || noise('bandpass', 900, 1, 0.002, 0.1, 0.2);
      else if (c === 'battery') P('cannon', { vol: 0.25, gap: 0.2 }) || sfxCannon();
      else if (c === 'swivel') P('pepperbox', { vol: 0.2, gap: 0.15 }) || noise('highpass', 1800, 1, 0.001, 0.1, 0.06);
      else P('swish', { vol: 0.18, gap: 0.12 });
    }
    else if (k === 'card') { const s = { gulls: 'gull', diver: 'diver', mooncusser: 'mooncusser', keelback: 'keelback', crabking: 'bosscrab', kelp: 'moan', fogwraith: 'moan' }[o.c]; if (s) P(s, { vol: s === 'bosscrab' ? 0.15 : 0.3, gap: 0.5 }); }
  } catch (e) {}
}
// the events that make a sound, new since last time (the same on the host and the guest)
function rlFxSound() {
  if (RL.sndSeen == null) RL.sndSeen = 0;
  let hi = RL.sndSeen;
  const mine = s => s === RL.me;
  for (const f of RL.FX) {
    if (f.id <= RL.sndSeen) continue; hi = Math.max(hi, f.id);
    const C = RL_CARD[f.c];
    if (f.k === 'deploy') { rlSnd(C && C.type === 'building' ? 'build' : 'deploy', { vol: mine(f.side) ? 1 : 0.6 }); rlSnd('card', { c: f.c }); }
    else if (f.k === 'spell') rlSnd(!C ? 'spell' : C.ab === 'lob' ? 'launch' : C.ab === 'wave' ? 'wave' : C.ab === 'haar' ? 'haar' : C.ab === 'bolts' ? 'spell' : 'flare');
    else if (f.k === 'boom') rlSnd('boom', { vol: f.r > 1.5 ? 1 : 0.6 });
    else if (f.k === 'bolt') rlSnd('bolt');
    else if (f.k === 'hit') rlSnd('hit', { vol: 0.6 + f.r * 0.25 });
    else if (f.k === 'die') rlSnd('die');
    else if (f.k === 'splash') rlSnd('splash', { vol: 0.5 });
    else if (f.k === 'tower') rlSnd('tower');
    else if (f.k === 'crown') rlSnd(f.side === RL.me ? 'crown' : 'crownlost');
    else if (f.k === 'dbl' || f.k === 'ot') rlSnd(f.k);
    else if (f.k === 'ring') rlSnd('ring', { vol: 0.6 });
    else if (f.k === 'revive') rlSnd('revive');
    else if (f.k === 'go') rlSnd('go');
  }
  RL.sndSeen = hi;
  // the shots, as each leaves
  let ph = RL.sndP || 0;
  for (const p of RL.P) if (p.id > (RL.sndP || 0)) { ph = Math.max(ph, p.id); if (p.k !== 'lob' && p.k !== 'keg') rlSnd('shot', { c: p.c, p: p.k }); }
  RL.sndP = ph;
}

// ---------- tests ----------
function rlDebugSpeed(x) { RL.speed = Math.max(0.1, Math.min(40, +x || 1)); return RL.speed; }
function rlDebugBots(on) { RL.both = !!on; return RL.both; }
